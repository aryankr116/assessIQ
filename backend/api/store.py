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

        dim = get_embedder_dim()
        store = VectorStore.load(self.data_dir, dim)
        self.pipeline = RagPipeline(store=store)

        self.documents: Dict[str, dict] = self._load(self._docs_path)
        self.qa_sets: Dict[str, dict] = self._load(self._sets_path)

        # Admin-tunable system parameters (persisted).
        self._params_path = self.data_dir / "params.json"
        self.params = self._load_params()

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

    def persist(self):
        self._save_docs()
        self._save_sets()
        self.pipeline.store.save(self.data_dir)

    # -- documents --------------------------------------------------------
    def list_documents(self) -> List[dict]:
        return sorted(
            self.documents.values(), key=lambda d: d["uploadedAt"], reverse=True
        )

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

    # -- qa sets ----------------------------------------------------------
    def list_qa_sets(self) -> List[dict]:
        return sorted(
            self.qa_sets.values(), key=lambda s: s["createdAt"], reverse=True
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
