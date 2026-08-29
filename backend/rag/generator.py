"""Pluggable answer/question generators.

All providers share one interface:

    generate(job_role, focus, contexts, n) -> List[GeneratedQA]

so the pipeline is provider-agnostic and you can swap LLMs without touching the
rest of the system (the modular design called for in the report).

Providers:
  - OpenAIProvider : OpenAI / OpenAI-compatible chat completions (default).
  - OllamaProvider : local open-source models via Ollama (privacy-preserving).
  - OfflineProvider: extractive/template generation, no LLM, always available.

Every provider is instructed (or constructed) to ground answers ONLY in the
supplied context and to flag out-of-scope items rather than inventing answers.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import List

from .config import settings
from .retriever import RetrievedChunk


@dataclass
class GeneratedQA:
    question: str
    answer: str
    answerable: bool = True


SYSTEM_PROMPT = (
    "You are AssessIQ, a closed-domain interview-question generator. You create "
    "job-specific interview questions and answers using ONLY the provided context "
    "passages extracted from a company's internal documents. Never use outside "
    "knowledge. If the context does not support an answer, mark it not answerable. "
    "Aim for a mix of Knowledge-Based questions (concepts, definitions) and "
    "Skill-Based questions (implementation, debugging, design)."
)


_CATEGORY_INSTRUCTION = {
    "knowledge": (
        "Generate ONLY Knowledge-Based questions — testing concepts, definitions, "
        "and theoretical understanding (e.g. 'what is', 'explain', 'describe')."
    ),
    "skill": (
        "Generate ONLY Skill-Based questions — testing applied problem-solving "
        "(e.g. 'implement', 'debug', 'design', 'how would you build')."
    ),
}


def _build_user_prompt(
    job_role: str,
    focus: str,
    contexts: List[RetrievedChunk],
    n: int,
    category: str | None = None,
) -> str:
    ctx_blocks = []
    for c in contexts:
        ctx_blocks.append(f"[doc: {c.doc_name} | chunk: {c.chunk_id}]\n{c.text}")
    ctx = "\n\n---\n\n".join(ctx_blocks) if ctx_blocks else "(no context retrieved)"
    cat_line = _CATEGORY_INSTRUCTION.get(category or "", "")
    return (
        f"Job role: {job_role}\n"
        f"Focus: {focus or 'general competencies for this role'}\n\n"
        f"Context passages:\n{ctx}\n\n"
        f"Generate {n} interview question-answer pairs grounded strictly in the "
        f"context above. {cat_line}\n"
        f"Respond with ONLY a JSON array, each item shaped as:\n"
        '{"question": "...", "answer": "...", "answerable": true}\n'
        "Set answerable to false (and explain briefly in answer) if the context "
        "is insufficient for that question."
    )


def _parse_json_array(text: str, n: int) -> List[GeneratedQA]:
    """Best-effort extraction of a JSON array from an LLM response."""
    text = text.strip()
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        data = json.loads(text)
    except Exception:
        return []
    out: List[GeneratedQA] = []
    for item in data[:n]:
        if not isinstance(item, dict):
            continue
        q = str(item.get("question", "")).strip()
        a = str(item.get("answer", "")).strip()
        if not q:
            continue
        out.append(GeneratedQA(question=q, answer=a, answerable=bool(item.get("answerable", True))))
    return out


# ---------------------------------------------------------------------------
class OpenAIProvider:
    name = "openai"

    def __init__(self):
        from openai import OpenAI  # imported lazily

        kwargs = {"api_key": settings.openai_api_key}
        if settings.openai_base_url:
            kwargs["base_url"] = settings.openai_base_url
        self.client = OpenAI(**kwargs)
        self.model = settings.openai_model

    def generate(self, job_role, focus, contexts, n, category=None) -> List[GeneratedQA]:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(job_role, focus, contexts, n, category)},
            ],
            temperature=0.3,
        )
        content = resp.choices[0].message.content or ""
        parsed = _parse_json_array(content, n)
        return parsed or OfflineProvider().generate(job_role, focus, contexts, n, category)


# ---------------------------------------------------------------------------
class OllamaProvider:
    name = "ollama"

    def generate(self, job_role, focus, contexts, n, category=None) -> List[GeneratedQA]:
        import requests

        payload = {
            "model": settings.ollama_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(job_role, focus, contexts, n, category)},
            ],
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.3},
        }
        r = requests.post(f"{settings.ollama_host}/api/chat", json=payload, timeout=120)
        r.raise_for_status()
        content = r.json().get("message", {}).get("content", "")
        parsed = _parse_json_array(content, n)
        return parsed or OfflineProvider().generate(job_role, focus, contexts, n, category)


# ---------------------------------------------------------------------------
class OfflineProvider:
    """No-LLM extractive generator. Forms questions/answers directly from the
    retrieved passages so the system runs fully offline and always returns
    grounded output. Simpler phrasing than an LLM, but verifiably from-source."""

    name = "offline"

    _KNOWLEDGE_TEMPLATES = [
        "Based on {doc}, what does the documentation say about \"{topic}\"?",
        "According to {doc}, explain the concept of \"{topic}\".",
        "What is described in {doc} regarding \"{topic}\"?",
    ]
    _SKILL_TEMPLATES = [
        "Using the guidance in {doc}, how would you apply \"{topic}\" in practice?",
        "Based on {doc}, implement or outline the procedure for \"{topic}\".",
        "Given the standards in {doc}, how would you handle \"{topic}\" on the job?",
    ]

    @staticmethod
    def _topic(text: str) -> str:
        # Take a short, meaningful phrase from the start of the chunk.
        snippet = re.sub(r"\s+", " ", text).strip()
        words = snippet.split(" ")
        return " ".join(words[:8]).rstrip(".,:;") or "this topic"

    @staticmethod
    def _first_sentences(text: str, max_chars: int = 360) -> str:
        snippet = re.sub(r"\s+", " ", text).strip()
        if len(snippet) <= max_chars:
            return snippet
        cut = snippet[:max_chars]
        last = cut.rfind(". ")
        return (cut[: last + 1] if last > 80 else cut).strip() + " …"

    def generate(self, job_role, focus, contexts, n, category=None) -> List[GeneratedQA]:
        if not contexts:
            return [
                GeneratedQA(
                    question=f"No source material was retrieved for a {job_role}.",
                    answer="This cannot be answered: no relevant context was found "
                    "in the selected documents.",
                    answerable=False,
                )
            ]
        out: List[GeneratedQA] = []
        for i, c in enumerate(contexts):
            topic = self._topic(c.text)
            answer = self._first_sentences(c.text)
            # Honour a requested category (two-round mode); else alternate.
            if category == "knowledge":
                tmpl = self._KNOWLEDGE_TEMPLATES[i % len(self._KNOWLEDGE_TEMPLATES)]
            elif category == "skill":
                tmpl = self._SKILL_TEMPLATES[i % len(self._SKILL_TEMPLATES)]
            elif i % 2 == 0:
                tmpl = self._KNOWLEDGE_TEMPLATES[i % len(self._KNOWLEDGE_TEMPLATES)]
            else:
                tmpl = self._SKILL_TEMPLATES[i % len(self._SKILL_TEMPLATES)]
            out.append(
                GeneratedQA(
                    question=tmpl.format(doc=c.doc_name, topic=topic),
                    answer=answer,
                    answerable=True,
                )
            )
            if len(out) >= n:
                break
        return out


_PROVIDERS = {
    "openai": OpenAIProvider,
    "ollama": OllamaProvider,
    "offline": OfflineProvider,
}


def get_generator():
    """Instantiate the configured provider, degrading to offline on any error."""
    provider = settings.resolved_provider()
    cls = _PROVIDERS.get(provider, OfflineProvider)
    try:
        return cls()
    except Exception as exc:  # pragma: no cover - env dependent
        print(
            f"[generator] provider '{provider}' unavailable ({exc.__class__.__name__}: {exc}); "
            "falling back to offline generator."
        )
        return OfflineProvider()
