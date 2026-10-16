"""Lightweight JSON-backed application store.

Holds document metadata and generated Q&A sets, and owns the RagPipeline (which
owns the vector index). Everything persists under ``settings.data_dir`` so state
survives restarts. Fine for a single-process app / project demo; swap for a real
DB if you scale out.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Dict, List, Optional

from ..rag.config import settings
from ..rag.pipeline import RagPipeline
from ..rag.vector_store import VectorStore
from ..rag.embeddings import get_embedder_dim


class AppStore:
    def __init__(self):
        self.lock = threading.Lock()
        self.data_dir: Path = settings.data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._docs_path = self.data_dir / "documents.json"
        self._sets_path = self.data_dir / "qa_sets.json"
        self._profiles_path = self.data_dir / "job_profiles.json"

        dim = get_embedder_dim()
        store = VectorStore.load(self.data_dir, dim)
        self.pipeline = RagPipeline(store=store)

        self.documents: Dict[str, dict] = self._load(self._docs_path)
        self.qa_sets: Dict[str, dict] = self._load(self._sets_path)
        self.job_profiles: Dict[str, dict] = self._load(self._profiles_path)

        # Keep the vector index in sync with the document list: the persisted
        # FAISS index can drift (e.g. lost/replaced files, or docs uploaded
        # under a different data dir). Any indexed document without vectors is
        # re-ingested from its saved upload so retrieval never silently returns
        # "out of scope" for documents the UI still lists.
        self._reconcile_index()

        # Admin-tunable system parameters (persisted).
        self._params_path = self.data_dir / "params.json"
        self.params = self._load_params()

    def _reconcile_index(self):
        store = self.pipeline.store
        indexed = {
            d["id"]: d
            for d in self.documents.values()
            if d.get("status") == "indexed"
        }

        # Drop orphaned chunks whose document is no longer indexed/known.
        for doc_id in {r.doc_id for r in store.records}:
            if doc_id not in indexed:
                self.pipeline.remove_document(doc_id)

        # Re-ingest indexed documents that have no vectors in the store.
        uploads = self.data_dir / "uploads"
        for doc_id, doc in list(indexed.items()):
            if store.doc_chunk_count(doc_id) > 0:
                continue
            matches = list(uploads.glob(f"{doc_id}.*")) if uploads.exists() else []
            if not matches:
                continue
            try:
                result = self.pipeline.ingest_document(
                    str(matches[0]), doc_id, doc.get("name", "upload")
                )
            except Exception as exc:  # noqa: BLE001
                print(f"[store] re-index failed for {doc_id}: {exc}")
                continue
            doc.update(
                {
                    "chunks": result.chunk_count,
                    "chunksTotal": result.chunk_count,
                    "chunksDone": result.chunk_count,
                    "pages": max(1, result.chunk_count // 3) if result.chunk_count else 0,
                    "excerpt": result.excerpt or doc.get("excerpt", ""),
                }
            )
            self.documents[doc_id] = doc

        self.persist()

    def _load_params(self) -> dict:
        defaults = {
            "defaultTopK": settings.default_top_k,
            "questionsPerSet": settings.questions_per_set,
            "answerabilityThreshold": settings.answerability_threshold,
        }
        if self._params_path.exists():
            with open(self._params_path, "r", encoding="utf-8") as f:
                defaults.update(json.load(f))
        return defaults

    def update_params(self, patch: dict):
        for k in ("defaultTopK", "questionsPerSet", "answerabilityThreshold"):
            if k in patch and patch[k] is not None:
                self.params[k] = patch[k]
        with open(self._params_path, "w", encoding="utf-8") as f:
            json.dump(self.params, f, ensure_ascii=False, indent=2)
        # Apply live to the running config.
        settings.default_top_k = int(self.params["defaultTopK"])
        settings.questions_per_set = int(self.params["questionsPerSet"])
        settings.answerability_threshold = float(self.params["answerabilityThreshold"])
        return self.params

    # -- persistence ------------------------------------------------------
    @staticmethod
    def _load(path: Path) -> Dict[str, dict]:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return {item["id"]: item for item in json.load(f)}
        return {}

    def _save_docs(self):
        with open(self._docs_path, "w", encoding="utf-8") as f:
            json.dump(list(self.documents.values()), f, ensure_ascii=False, indent=2)

    def _save_sets(self):
        with open(self._sets_path, "w", encoding="utf-8") as f:
            json.dump(list(self.qa_sets.values()), f, ensure_ascii=False, indent=2)

    def _save_profiles(self):
        with open(self._profiles_path, "w", encoding="utf-8") as f:
            json.dump(list(self.job_profiles.values()), f, ensure_ascii=False, indent=2)

    def persist(self):
        self._save_docs()
        self._save_sets()
        self._save_profiles()
        self.pipeline.store.save(self.data_dir)

    # -- documents --------------------------------------------------------
    def list_documents(self, job_profile_id: Optional[str] = None) -> List[dict]:
        docs = self.documents.values()
        if job_profile_id is not None:
            docs = [d for d in docs if d.get("jobProfileId") == job_profile_id]
        return sorted(docs, key=lambda d: d["uploadedAt"], reverse=True)

    def upsert_document(self, doc: dict):
        self.documents[doc["id"]] = doc
        self._save_docs()

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self.documents:
            return False
        del self.documents[doc_id]
        self.pipeline.remove_document(doc_id)
        self.persist()
        return True

    # -- job profiles ------------------------------------------------------
    def list_job_profiles(self) -> List[dict]:
        return sorted(
            self.job_profiles.values(), key=lambda p: p["createdAt"], reverse=True
        )

    def upsert_job_profile(self, profile: dict):
        self.job_profiles[profile["id"]] = profile
        self._save_profiles()

    def delete_job_profile(self, profile_id: str) -> bool:
        if profile_id not in self.job_profiles:
            return False
        del self.job_profiles[profile_id]
        self._save_profiles()
        return True

    # -- qa sets ----------------------------------------------------------
    def list_qa_sets(self) -> List[dict]:
        # Ensure all QA sets have a questions array (for backward compatibility)
        return sorted(
            [
                {**s, "questions": s.get("questions", [])}
                for s in self.qa_sets.values()
            ],
            key=lambda s: s["createdAt"],
            reverse=True,
        )

    def add_qa_set(self, qa_set: dict):
        self.qa_sets[qa_set["id"]] = qa_set
        self._save_sets()

    def delete_qa_set(self, set_id: str) -> bool:
        if set_id not in self.qa_sets:
            return False
        del self.qa_sets[set_id]
        self._save_sets()
        return True

    def rate_question(self, set_id: str, question_id: str, rating):
        qa_set = self.qa_sets.get(set_id)
        if not qa_set:
            return None
        for q in qa_set["questions"]:
            if q["id"] == question_id:
                q["rating"] = rating
                self._save_sets()
                return q
        return None


_STORE: Optional[AppStore] = None


def get_store() -> AppStore:
    global _STORE
    if _STORE is None:
        _STORE = AppStore()
    return _STORE
