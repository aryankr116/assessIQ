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
    "You are AssessIQ, an expert technical interview kit generator. You create "
    "high-caliber, job-specific interview questions and structured model answers based on technical "
    "domain topics found in internal documentation.\n"
    "CRITICAL RULES FOR QUESTION FORMULATION:\n"
    "1. DO NOT formulate questions as document tests or reading checks (e.g. NEVER write 'According to document X...', 'What does section Y say...').\n"
    "2. Frame questions around real-world engineering concepts, system architecture, performance trade-offs, and applied scenarios on the TOPICS covered by the context.\n"
    "3. The question must sound like a real technical interviewer evaluating a candidate's domain mastery and problem-solving skills.\n"
    "4. Ensure answers are grounded in and verifiable by the provided context passages.\n"
    "5. Format each answer clearly with a 'Core Technical Solution' followed by 'Key Evaluation Criteria' bullet points for the interviewer."
)


_CATEGORY_INSTRUCTION = {
    "knowledge": (
        "Generate ONLY Knowledge-Based questions — testing fundamental concepts, system mechanics, "
        "and architectural trade-offs (e.g. 'explain the core principles of', 'what design trade-offs apply to'). "
        "Do NOT mention document names or page numbers in the question."
    ),
    "skill": (
        "Generate ONLY Skill-Based questions — testing applied engineering, real-world troubleshooting, "
        "and system design scenarios (e.g. 'how would you debug', 'design a zero-downtime strategy for', 'how would you handle failure in'). "
        "Do NOT mention document names or page numbers in the question."
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
        f"Generate {n} realistic candidate interview question-answer pairs derived from the "
        f"technical topics in the context above. {cat_line}\n"
        f"IMPORTANT: The questions must test candidate domain knowledge and practical problem-solving. "
        f"Do NOT phrase questions like 'According to document X' or 'What does the passage say'.\n"
        f"Respond with ONLY a JSON array, each item shaped as:\n"
        '{"question": "...", "answer": "Core Technical Solution:\\n...\\n\\nKey Evaluation Criteria:\\n• Point 1\\n• Point 2", "answerable": true}\n'
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
    """Topic-centric generator for offline / template mode. Forms practical
    interview questions on the domain topics found in source passages,
    without referencing document names in the question text."""

    name = "offline"

    _KNOWLEDGE_TEMPLATES = [
        "What are the core technical principles, architectural considerations, and design trade-offs associated with \"{topic}\"?",
        "When designing scalable enterprise systems for a {role}, how would you structure and manage \"{topic}\"?",
        "How does \"{topic}\" function under high throughput, and what key metrics or failure modes should be monitored?",
        "What security controls, authorization standards, and compliance policies should govern \"{topic}\"?",
    ]
    _SKILL_TEMPLATES = [
        "Suppose you encounter a severe latency spike or failure involving \"{topic}\" in production. What step-by-step diagnosis and remediation would you follow?",
        "How would you implement and configure \"{topic}\" to meet strict reliability and zero-downtime deployment requirements?",
        "When refactoring a system component that uses \"{topic}\", how do you handle data consistency, failover, and backward compatibility?",
        "Describe how you would design automated testing and monitoring pipelines for services relying on \"{topic}\".",
    ]

    @staticmethod
    def _topic(text: str) -> str:
        # Take a clean, meaningful topic phrase from the chunk text.
        snippet = re.sub(r"\s+", " ", text).strip()
        snippet = re.sub(r"^[#\*\-\d\.\s]+", "", snippet)
        words = snippet.split(" ")
        clean_words = [w.strip(".,:;()[]\"'") for w in words[:7] if w]
        topic_str = " ".join(clean_words)
        return topic_str or "this architecture component"

    @staticmethod
    def _first_sentences(text: str, max_chars: int = 320) -> str:
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
                    answer="This cannot be answered: no relevant context was found in the selected documents.",
                    answerable=False,
                )
            ]
        out: List[GeneratedQA] = []
        for i, c in enumerate(contexts):
            topic = self._topic(c.text)
            core_summary = self._first_sentences(c.text, max_chars=320)
            
            # Format high-quality structured answer with interviewer rubric
            answer = (
                f"Core Technical Solution:\n{core_summary}\n\n"
                f"Key Evaluation Criteria for Interviewer:\n"
                f"• Candidate must demonstrate mastery of '{topic}' within a {job_role} architecture.\n"
                f"• Candidate should specify operational boundaries, security controls, and SLA metrics.\n"
                f"• Candidate should articulate failure handling, fallback protocols, and concurrency trade-offs."
            )

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
                    question=tmpl.format(role=job_role, topic=topic),
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
