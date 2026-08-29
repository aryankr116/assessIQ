"""Vector store for chunk embeddings.

Supports:
1. Chroma — cloud-native, distributed vector database (production)
2. FAISS — fast local search (fallback/development)
3. NumPy — pure Python fallback

Persists to local disk for FAISS; Chroma persists via its own mechanism.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional

import numpy as np

from .config import settings

try:
    import chromadb
    _HAS_CHROMA = True
except Exception:
    _HAS_CHROMA = False

try:
    import faiss
    _HAS_FAISS = True
except Exception:
    _HAS_FAISS = False


@dataclass
class ChunkRecord:
    doc_id: str
    doc_name: str
    chunk_id: int
    text: str


class ChromaVectorStore:
    """Chroma-backed vector store."""

    def __init__(self, chroma_url: str = "http://localhost:8000"):
        self.chroma_url = chroma_url
        try:
            self.client = chromadb.HttpClient(host=chroma_url.split("://")[1].split(":")[0], 
                                              port=int(chroma_url.split(":")[-1]))
        except Exception:
            # Fallback: try to parse as full URL
            self.client = chromadb.HttpClient(host=chroma_url)
        
        self.collection = self.client.get_or_create_collection(
            name="assessiq_chunks",
            metadata={"hnsw:space": "cosine"}
        )
        self.dim = 384  # all-MiniLM-L6-v2 dimension

    @property
    def backend(self) -> str:
        return "chroma"

    def add(self, vectors: np.ndarray, records: List[ChunkRecord]):
        """Add vectors and records to Chroma."""
        if len(vectors) == 0:
            return
        
        vectors = np.asarray(vectors, dtype=np.float32)
        ids = []
        embeddings = []
        documents = []
        metadatas = []
        
        for i, (vec, rec) in enumerate(zip(vectors, records)):
            chunk_uid = f"{rec.doc_id}#{rec.chunk_id}"
            ids.append(chunk_uid)
            embeddings.append(vec.tolist())
            documents.append(rec.text)
            metadatas.append({
                "doc_id": rec.doc_id,
                "doc_name": rec.doc_name,
                "chunk_id": str(rec.chunk_id)
            })
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def remove_doc(self, doc_id: str):
        """Remove all chunks for a document."""
        # Query for all chunks with this doc_id
        results = self.collection.get(
            where={"doc_id": doc_id}
        )
        if results["ids"]:
            self.collection.delete(ids=results["ids"])

    def doc_chunk_count(self, doc_id: str) -> int:
        """Count chunks for a document."""
        results = self.collection.get(
            where={"doc_id": doc_id}
        )
        return len(results["ids"])

    def search(
        self,
        query_vec: np.ndarray,
        k: int,
        doc_ids: Optional[List[str]] = None,
    ) -> List[tuple[ChunkRecord, float]]:
        """Search for similar chunks."""
        q = np.asarray(query_vec, dtype=np.float32).reshape(1, -1)
        
        where_filter = None
        if doc_ids is not None:
            where_filter = {"doc_id": {"$in": doc_ids}}
        
        results = self.collection.query(
            query_embeddings=q.tolist(),
            n_results=k,
            where=where_filter
        )
        
        output = []
        if results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                doc_id_val = results["metadatas"][0][i]["doc_id"]
                doc_name_val = results["metadatas"][0][i]["doc_name"]
                chunk_id_val = int(results["metadatas"][0][i]["chunk_id"])
                text_val = results["documents"][0][i]
                distance = results["distances"][0][i]
                
                # Chroma returns distance; convert to similarity
                # For cosine: similarity = 1 - distance
                similarity = 1.0 - distance
                
                rec = ChunkRecord(
                    doc_id=doc_id_val,
                    doc_name=doc_name_val,
                    chunk_id=chunk_id_val,
                    text=text_val
                )
                output.append((rec, float(similarity)))
        
        return output

    def vector_for(self, doc_id: str, chunk_id: int) -> Optional[np.ndarray]:
        """Get embedding for a specific chunk."""
        chunk_uid = f"{doc_id}#{chunk_id}"
        try:
            result = self.collection.get(ids=[chunk_uid])
            if result["embeddings"] and result["embeddings"][0]:
                return np.array(result["embeddings"][0], dtype=np.float32)
        except Exception:
            pass
        return None

    def save(self, data_dir: Path):
        """Chroma persists automatically; this is a no-op."""
        pass

    @classmethod
    def load(cls, data_dir: Path, dim: int) -> "ChromaVectorStore":
        """Load from Chroma (data persists on server)."""
        return cls(chroma_url=settings.chroma_url)


class FAISSVectorStore:
    """FAISS-backed vector store (local)."""

    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = np.zeros((0, dim), dtype=np.float32)
        self.records: List[ChunkRecord] = []
        self._faiss_index = None
        self._rebuild_faiss()

    @property
    def backend(self) -> str:
        return "faiss" if _HAS_FAISS else "numpy"

    def _rebuild_faiss(self):
        if not _HAS_FAISS:
            self._faiss_index = None
            return
        index = faiss.IndexFlatIP(self.dim)
        if len(self.vectors):
            index.add(self.vectors)
        self._faiss_index = index

    def add(self, vectors: np.ndarray, records: List[ChunkRecord]):
        if len(vectors) == 0:
            return
        vectors = np.asarray(vectors, dtype=np.float32)
        self.vectors = (
            vectors if len(self.vectors) == 0 else np.vstack([self.vectors, vectors])
        )
        self.records.extend(records)
        self._rebuild_faiss()

    def remove_doc(self, doc_id: str):
        keep = [i for i, r in enumerate(self.records) if r.doc_id != doc_id]
        if len(keep) == len(self.records):
            return
        self.vectors = (
            self.vectors[keep] if keep else np.zeros((0, self.dim), dtype=np.float32)
        )
        self.records = [self.records[i] for i in keep]
        self._rebuild_faiss()

    def doc_chunk_count(self, doc_id: str) -> int:
        return sum(1 for r in self.records if r.doc_id == doc_id)

    def search(
        self,
        query_vec: np.ndarray,
        k: int,
        doc_ids: Optional[List[str]] = None,
    ) -> List[tuple[ChunkRecord, float]]:
        if len(self.records) == 0:
            return []
        q = np.asarray(query_vec, dtype=np.float32).reshape(1, -1)

        allowed = None
        if doc_ids is not None:
            allowed = set(doc_ids)

        if allowed is not None or not _HAS_FAISS or self._faiss_index is None:
            sims = (self.vectors @ q.T).ravel()
            order = np.argsort(-sims)
            results: List[tuple[ChunkRecord, float]] = []
            for idx in order:
                rec = self.records[idx]
                if allowed is not None and rec.doc_id not in allowed:
                    continue
                results.append((rec, float(sims[idx])))
                if len(results) >= k:
                    break
            return results

        scores, idxs = self._faiss_index.search(q, min(k, len(self.records)))
        out = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx < 0:
                continue
            out.append((self.records[idx], float(score)))
        return out

    def vector_for(self, doc_id: str, chunk_id: int) -> Optional[np.ndarray]:
        for i, r in enumerate(self.records):
            if r.doc_id == doc_id and r.chunk_id == chunk_id:
                return self.vectors[i]
        return None

    def save(self, data_dir: Path):
        data_dir.mkdir(parents=True, exist_ok=True)
        np.save(data_dir / "vectors.npy", self.vectors)
        with open(data_dir / "chunks.json", "w", encoding="utf-8") as f:
            json.dump([asdict(r) for r in self.records], f, ensure_ascii=False)

    @classmethod
    def load(cls, data_dir: Path, dim: int) -> "FAISSVectorStore":
        store = cls(dim)
        vpath = data_dir / "vectors.npy"
        cpath = data_dir / "chunks.json"
        if vpath.exists() and cpath.exists():
            vectors = np.load(vpath).astype(np.float32)
            with open(cpath, "r", encoding="utf-8") as f:
                recs = [ChunkRecord(**r) for r in json.load(f)]
            if vectors.shape[1] == dim and len(vectors) == len(recs):
                store.vectors = vectors
                store.records = recs
                store._rebuild_faiss()
        return store


class VectorStore:
    """Factory for creating the appropriate vector store backend."""

    @staticmethod
    def create(dim: int = 384) -> "FAISSVectorStore | ChromaVectorStore":
        """Create a vector store based on config."""
        if settings.vector_db == "chroma" and _HAS_CHROMA:
            try:
                return ChromaVectorStore(chroma_url=settings.chroma_url)
            except Exception as e:
                print(f"Failed to connect to Chroma: {e}. Falling back to FAISS.")
                return FAISSVectorStore(dim)
        return FAISSVectorStore(dim)

    @staticmethod
    def load(data_dir: Path, dim: int = 384) -> "FAISSVectorStore | ChromaVectorStore":
        """Load a vector store from disk or remote."""
        if settings.vector_db == "chroma" and _HAS_CHROMA:
            try:
                return ChromaVectorStore.load(data_dir, dim)
            except Exception as e:
                print(f"Failed to load from Chroma: {e}. Falling back to FAISS.")
                return FAISSVectorStore.load(data_dir, dim)
        return FAISSVectorStore.load(data_dir, dim)
