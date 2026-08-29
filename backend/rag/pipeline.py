"""RAG pipeline orchestration.

Two responsibilities:
  1. ingest_document : extract -> clean -> chunk -> embed -> index a file.
  2. generate_qa     : prompt -> retrieve top-k -> generate -> classify ->
                       answerability check -> attach sources.

Reuses the existing repo modules (text_extractor + ingest) for the parsing and
chunking stages, then layers embedding/retrieval/generation/classification on top.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np

# Existing repo modules (parsing + chunking) — unchanged.
from backend.text_extractor.extractors import extract_text_from_file
from backend.ingest import clean_text, chunk_text

from .config import settings
from .classifier import classify_question
from .embeddings import embed_texts, get_embedder_dim, get_embedder
from .generator import get_generator
from .retriever import Retriever, RetrievedChunk
from .vector_store import VectorStore, ChunkRecord


@dataclass
class IngestResult:
    chunk_count: int
    excerpt: str


@dataclass
class Source:
    doc_id: str
    doc_name: str
    chunk_id: int
    snippet: str


@dataclass
class Question:
    id: str
    question: str
    answer: str
    type: str
    confidence: float
    answerable: bool
    sources: List[Source] = field(default_factory=list)


@dataclass
class QAResult:
    job_role: str
    prompt: str
    top_k: int
    document_ids: List[str]
    questions: List[Question]


class RagPipeline:
    def __init__(self, store: Optional[VectorStore] = None):
        self.dim = get_embedder_dim()
        self.store = store or VectorStore.create(self.dim)
        self.retriever = Retriever(self.store)

    # -- ingestion --------------------------------------------------------
    def ingest_document(
        self,
        path: str,
        doc_id: str,
        doc_name: str,
        progress_cb=None,
        batch_size: int = 64,
    ) -> IngestResult:
        raw = extract_text_from_file(path)
        cleaned = clean_text(raw)
        chunks = chunk_text(
            cleaned,
            chunk_size=settings.chunk_size,
            overlap=settings.chunk_overlap,
        )
        chunks = [c for c in chunks if c.strip()]
        total = len(chunks)
        if not total:
            return IngestResult(chunk_count=0, excerpt="")

        # Embed in batches so progress can be reported as we go.
        if progress_cb:
            progress_cb(0, total)
        done = 0
        for start in range(0, total, batch_size):
            part = chunks[start : start + batch_size]
            vectors = embed_texts(part)
            records = [
                ChunkRecord(
                    doc_id=doc_id, doc_name=doc_name, chunk_id=start + j, text=part[j]
                )
                for j in range(len(part))
            ]
            self.store.add(vectors, records)
            done += len(part)
            if progress_cb:
                progress_cb(done, total)

        excerpt = cleaned[:280].strip()
        if len(cleaned) > 280:
            excerpt += " …"
        return IngestResult(chunk_count=total, excerpt=excerpt)

    def remove_document(self, doc_id: str):
        self.store.remove_doc(doc_id)

    def chunk_count(self, doc_id: str) -> int:
        return self.store.doc_chunk_count(doc_id)

    # -- generation -------------------------------------------------------
    # Hints appended to the retrieval query so each cognitive category pulls its
    # own context (matches the report's two-round sequence diagram, 4.5).
    _CATEGORY_QUERY_HINT = {
        "knowledge": "concepts, definitions, theory and explanations",
        "skill": "implementation, coding, debugging, design and practical tasks",
    }

    def _make_question(self, idx, qa, contexts, ctx_vecs, force_type=None) -> Question:
        cls = classify_question(qa.question)
        q_type = force_type or cls.type

        source = None
        grounding = 0.0
        if len(ctx_vecs):
            ans_vec = embed_texts([qa.answer or qa.question])[0]
            sims = ctx_vecs @ ans_vec
            best = int(np.argmax(sims))
            grounding = float(sims[best])
            c = contexts[best]
            snippet = c.text.strip().replace("\n", " ")
            if len(snippet) > 160:
                snippet = snippet[:160].rstrip() + " …"
            source = Source(
                doc_id=c.doc_id, doc_name=c.doc_name, chunk_id=c.chunk_id, snippet=snippet
            )

        answerable = bool(qa.answerable) and grounding >= settings.answerability_threshold
        confidence = round(float(max(0.0, min(0.99, grounding))), 2)
        return Question(
            id=f"q{idx}",
            question=qa.question,
            answer=qa.answer,
            type=q_type,
            confidence=confidence,
            answerable=answerable,
            sources=[source] if (source and answerable) else [],
        )

    def _generate_round(self, job_role, prompt, top_k, document_ids, n, category, start_idx):
        """One retrieval+generation round. Returns (questions, best_score)."""
        hint = self._CATEGORY_QUERY_HINT.get(category or "", "")
        query = f"{job_role}. {prompt}. {hint}".strip()
        contexts = self.retriever.retrieve(query, k=top_k, doc_ids=document_ids or None)
        best_score = max((c.score for c in contexts), default=0.0)
        if not contexts or best_score < settings.answerability_threshold:
            return [], best_score

        generator = get_generator()
        raw_qas = generator.generate(job_role, prompt, contexts, n, category)
        ctx_vecs = embed_texts([c.text for c in contexts])

        force = category if category in ("knowledge", "skill") else None
        questions = [
            self._make_question(start_idx + i, qa, contexts, ctx_vecs, force_type=force)
            for i, qa in enumerate(raw_qas)
        ]
        return questions, best_score

    def _out_of_scope(self, job_role, prompt, top_k, document_ids, best_score) -> QAResult:
        return QAResult(
            job_role=job_role,
            prompt=prompt,
            top_k=top_k,
            document_ids=document_ids or [],
            questions=[
                Question(
                    id="q1",
                    question=f"Generate interview questions for a {job_role}.",
                    answer=(
                        "This prompt appears to be out of scope: no sufficiently "
                        "relevant passages were found in the selected documents. "
                        "Upload or select documents related to this role."
                    ),
                    type="knowledge",
                    confidence=round(float(best_score), 2),
                    answerable=False,
                    sources=[],
                )
            ],
        )

    def generate_qa(
        self,
        job_role: str,
        prompt: str,
        top_k: int,
        document_ids: Optional[List[str]] = None,
        two_round: bool = False,
    ) -> QAResult:
        used_docs = document_ids or [r.doc_id for r in self.store.records]
        used_docs = list(dict.fromkeys(used_docs))

        if two_round:
            # Round 1: Knowledge. Round 2: Skill. Each with its own retrieval.
            total = settings.questions_per_set
            n_know = (total + 1) // 2
            n_skill = total - n_know
            k_qs, k_best = self._generate_round(
                job_role, prompt, top_k, document_ids, n_know, "knowledge", 1
            )
            s_qs, s_best = self._generate_round(
                job_role, prompt, top_k, document_ids, n_skill, "skill", len(k_qs) + 1
            )
            questions = k_qs + s_qs
            if not questions:
                return self._out_of_scope(
                    job_role, prompt, top_k, document_ids, max(k_best, s_best)
                )
            # Re-id sequentially after combining.
            for i, q in enumerate(questions, start=1):
                q.id = f"q{i}"
            return QAResult(job_role, prompt, top_k, used_docs, questions)

        # Single mixed round.
        questions, best = self._generate_round(
            job_role, prompt, top_k, document_ids, settings.questions_per_set, None, 1
        )
        if not questions:
            return self._out_of_scope(job_role, prompt, top_k, document_ids, best)
        return QAResult(job_role, prompt, top_k, used_docs, questions)


def new_question_id() -> str:
    return "q_" + uuid.uuid4().hex[:8]
