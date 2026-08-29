"""Retriever: top-k dense passage retrieval over the vector store."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .embeddings import embed_text
from .vector_store import VectorStore


@dataclass
class RetrievedChunk:
    doc_id: str
    doc_name: str
    chunk_id: int
    text: str
    score: float


class Retriever:
    def __init__(self, store: VectorStore):
        self.store = store

    def retrieve(
        self,
        query: str,
        k: int,
        doc_ids: Optional[List[str]] = None,
    ) -> List[RetrievedChunk]:
        q_vec = embed_text(query)
        hits = self.store.search(q_vec, k=k, doc_ids=doc_ids)
        return [
            RetrievedChunk(
                doc_id=rec.doc_id,
                doc_name=rec.doc_name,
                chunk_id=rec.chunk_id,
                text=rec.text,
                score=score,
            )
            for rec, score in hits
        ]
