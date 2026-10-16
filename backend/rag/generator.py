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
import random
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
    options: List[str] = None  # MCQ options (A-D)
    correct_option: int = 0    # index of correct option
    explanation: str = ""      # why the correct answer is correct
    sub_type: str = "fundamentals"  # fundamentals | understanding (knowledge) | apply | analyse (skill)
    expected_time_seconds: int = 60  # estimated time for candidate


SYSTEM_PROMPT = (
    "You are AssessIQ, an expert technical interview kit generator. You create "
    "MCQ (Multiple Choice Question) interview questions with 4 options each.\n"
    "CRITICAL RULES:\n"
    "1. Every question MUST have exactly 4 options (A, B, C, D). Exactly ONE is correct.\n"
    "2. Do NOT reference document names, page numbers, or specific values from the context passages.\n"
    "3. Do NOT ask questions like 'According to the document, what is X?' or 'What value does the policy specify for Y?'.\n"
    "4. Instead, use the context passages to identify TOPIC AREAS and TECHNOLOGIES, then generate questions that test conceptual understanding, applied reasoning, and real-world engineering judgment.\n"
    "5. Frame questions around engineering concepts, architectural trade-offs, design patterns, troubleshooting reasoning, and scenario-based decision-making.\n"
    "6. Each question must include a clear explanation of why the correct answer is correct.\n"
    "7. Each question has a TYPE and a SUB-TYPE:\n"
    "   TYPE 'knowledge' tests conceptual understanding. Use one of:\n"
    "     - fundamentals: Core concept recall (e.g. 'What is the primary purpose of X?', 'Which pattern is best suited for Y?'). Expected time: 20-40 seconds.\n"
    "     - understanding: Deeper comprehension (e.g. 'Why does X use approach Y instead of Z?', 'What problem does X solve?'). Expected time: 45-75 seconds.\n"
    "   TYPE 'skill' tests applied ability. Use one of:\n"
    "     - apply: Practical scenario (e.g. 'Given a production outage caused by X, what is your first step?'). Expected time: 60-100 seconds.\n"
    "     - analyse: Reasoning and trade-offs (e.g. 'Compare approach A vs B for this scenario. What are the trade-offs?'). Expected time: 75-120 seconds.\n"
    "8. Distractors (wrong options) must be plausible but clearly incorrect to someone with domain knowledge.\n"
    "9. The correct answer explanation should be 2-3 sentences explaining the technical reasoning.\n"
    "10. NEVER generate a question ABOUT the source material itself — never quiz on how the book/document "
    "is written or presented (its prose, pseudocode style, structure, table of contents, chapter layout, "
    "publisher, author, edition, ISBN, or how it explains things). Ignore passages that describe the "
    "material's own presentation. Ask only about the SUBJECT MATTER being taught (concepts, technologies, "
    "skills, trade-offs, scenarios).\n"
)


_CATEGORY_INSTRUCTION = {
    "knowledge": (
        "Generate ONLY Knowledge-Based MCQ questions — testing conceptual understanding of the technologies, "
        "patterns, and architecture principles found in the source material. Do NOT ask about specific values, "
        "thresholds, or configuration numbers from the documents. Instead ask 'why' and 'how' questions. "
        "Mix 'fundamentals' (core concepts) and 'understanding' (deeper comprehension) sub-types evenly."
    ),
    "skill": (
        "Generate ONLY Skill-Based MCQ questions — testing applied engineering judgment, troubleshooting reasoning, "
        "and scenario-based decision-making. Use the source material as context for realistic scenarios, "
        "NOT as a source of specific values to quiz on. "
        "Mix 'apply' (hands-on application) and 'analyse' (reasoning/trade-offs) sub-types evenly."
    ),
}


def _build_user_prompt(
    job_role: str,
    focus: str,
    contexts: List[RetrievedChunk],
    n: int,
    category: str | None = None,
) -> str:
    # Send the FULL text of every retrieved chunk so the model has maximal
    # grounding material. Token budget is not a constraint for this deployment,
    # and truncating/collapsing the context measurably degrades question quality.
    ctx_blocks = [
        f"[doc: {c.doc_name} | chunk: {c.chunk_id}]\n{c.text.strip()}"
        for c in contexts
    ]
    ctx = "\n\n---\n\n".join(ctx_blocks) if ctx_blocks else "(no context retrieved)"
    cat_line = _CATEGORY_INSTRUCTION.get(category or "", "")
    sub_type_hint = ""
    if category == "knowledge":
        sub_type_hint = (
            f"Mix the sub-types across the set:\n"
            f"- ~50% fundamentals (quick factual recall, 20-40s expected)\n"
            f"- ~50% understanding (deeper conceptual grasp, 45-75s expected)\n\n"
        )
    elif category == "skill":
        sub_type_hint = (
            f"Mix the sub-types across the set:\n"
            f"- ~50% apply (practical scenario, 60-100s expected)\n"
            f"- ~50% analyse (reasoning/trade-offs, 75-120s expected)\n\n"
        )
    else:
        sub_type_hint = (
            f"Mix the sub-types across the set:\n"
            f"- ~25% fundamentals (quick recall, 20-40s expected)\n"
            f"- ~25% understanding (deeper comprehension, 45-75s expected)\n"
            f"- ~25% apply (practical scenarios, 60-100s expected)\n"
            f"- ~25% analyse (reasoning/trade-offs, 75-120s expected)\n\n"
        )
    return (
        f"Job role: {job_role}\n"
        f"Focus: {focus or 'general competencies for this role'}\n\n"
        f"Context passages (use these to identify TECHNOLOGY TOPICS, NOT as a source of specific values):\n{ctx}\n\n"
        f"Generate {n} MCQ interview questions about the TECHNOLOGIES and CONCEPTS found above. {cat_line}\n\n"
        f"IMPORTANT RULES:\n"
        f"- Each question MUST be a multiple-choice question with exactly 4 options.\n"
        f"- Do NOT ask 'According to the document...' or 'What value/threshold/rate is specified...'.\n"
        f"- NEVER ask a question about the source material itself (the book/document: its writing or "
        f"pseudocode style, table of contents, structure, publisher, author, how it presents things). "
        f"Ignore such passages entirely.\n"
        f"- Do NOT quiz on specific numbers, percentages, or configuration values from the context.\n"
        f"- DO ask about concepts, patterns, trade-offs, scenarios, and engineering reasoning.\n"
        f"{sub_type_hint}"
        f"Respond with ONLY a JSON array, each item shaped as:\n"
        '{\n'
        '  "question": "Which of the following best describes...",\n'
        '  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],\n'
        '  "correct_option": 0,\n'
        '  "explanation": "Option A is correct because... (2-3 sentences)",\n'
        '  "sub_type": "fundamentals",\n'
        '  "expected_time_seconds": 30,\n'
        '  "answerable": true\n'
        '}\n\n'
        f"Rules:\n"
        f"- correct_option must be 0, 1, 2, or 3 (index of the correct option)\n"
        f"- sub_type for knowledge questions: fundamentals or understanding\n"
        f"- sub_type for skill questions: apply or analyse\n"
        f"- expected_time_seconds: fundamentals=20-40, understanding=45-75, apply=60-100, analyse=75-120\n"
        f"- Distractors must be plausible but clearly wrong to someone with domain expertise\n"
        f"- explanation must be 2-3 sentences explaining why the correct answer is right\n"
        f"- Set answerable to false (with empty options and explanation) if context is insufficient"
    )


def _salvage_objects(text: str) -> List[dict]:
    """Extract every complete top-level {...} object from possibly-truncated JSON."""
    objs: List[dict] = []
    depth = 0
    start = None
    in_str = False
    esc = False
    for i, ch in enumerate(text):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start is not None:
                    try:
                        objs.append(json.loads(text[start : i + 1]))
                    except Exception:
                        pass
                    start = None
    return objs


def _parse_json_array(text: str, n: int) -> List[GeneratedQA]:
    """Best-effort extraction of a JSON array from an LLM response.

    Tolerates markdown fences and truncated output (e.g. when the model hits the
    token limit mid-array): complete objects are salvaged instead of discarding
    the whole response.
    """
    text = text.strip()
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        text = match.group(0)
    data = None
    try:
        data = json.loads(text)
    except Exception:
        data = None
    if not isinstance(data, list):
        data = _salvage_objects(text)
    out: List[GeneratedQA] = []
    for item in data[:n]:
        if not isinstance(item, dict):
            continue
        q = str(item.get("question", "")).strip()
        if not q:
            continue
        options = item.get("options", [])
        if isinstance(options, list) and len(options) == 4:
            options = [str(o).strip() for o in options]
        else:
            options = ["Option A", "Option B", "Option C", "Option D"]
        correct = int(item.get("correct_option", 0))
        if correct not in (0, 1, 2, 3):
            correct = 0
        sub_type = str(item.get("sub_type", "fundamentals")).strip()
        if sub_type not in ("fundamentals", "understanding", "apply", "analyse"):
            sub_type = "fundamentals"
        exp_time = int(item.get("expected_time_seconds", 60))
        explanation = str(item.get("explanation", "")).strip()
        answer = str(item.get("answer", "")).strip() or explanation
        out.append(GeneratedQA(
            question=q,
            answer=answer,
            answerable=bool(item.get("answerable", True)),
            options=options,
            correct_option=correct,
            explanation=explanation,
            sub_type=sub_type,
            expected_time_seconds=exp_time,
        ))
    return out


# ---------------------------------------------------------------------------
class OpenAIProvider:
    name = "openai"

    # Generate the whole set in a single call for coherence (the model sees the
    # full context once and keeps the set internally consistent).
    _BATCH_SIZE = 50

    def __init__(self):
        from openai import OpenAI  # imported lazily

        kwargs = {"api_key": settings.openai_api_key}
        if settings.openai_base_url:
            kwargs["base_url"] = settings.openai_base_url
        # Fail fast on a stalled call (we handle retries/backoff ourselves).
        self.client = OpenAI(timeout=60.0, max_retries=0, **kwargs)
        self.model = settings.openai_model
        self.models = [self.model]

    def _generate_batch(self, job_role, focus, contexts, n, category, model=None) -> List[GeneratedQA]:
        import time
        import logging

        logger = logging.getLogger("rag.generator")
        model = model or self.model
        max_retries = 4
        backoff = 3.0
        # Enough headroom that a full set is never truncated, but bounded so a
        # single request doesn't blow past the provider's tokens-per-minute
        # limit (Groq free tier: 8000 TPM).
        max_tokens = min(6000, max(3000, 450 * n))

        for attempt in range(max_retries):
            try:
                req = dict(
                    model=model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": _build_user_prompt(job_role, focus, contexts, n, category)},
                    ],
                    temperature=0.3,
                    max_tokens=max_tokens,
                )
                if settings.openai_reasoning_effort:
                    # Reasoning models spend output tokens "thinking"; a low
                    # effort frees the budget for the JSON (and saves quota).
                    req["extra_body"] = {"reasoning_effort": settings.openai_reasoning_effort}
                resp = self.client.chat.completions.create(**req)
                content = resp.choices[0].message.content or ""
                parsed = _parse_json_array(content, n)
                if parsed:
                    return parsed
                finish = getattr(resp.choices[0], "finish_reason", "?")
                logger.warning(
                    f"Generator returned no parseable questions (finish_reason={finish})."
                )
                # A truncated/empty response is often transient (verbose thinking
                # or a glitch) — retry rather than give up on the whole batch.
                if attempt < max_retries - 1:
                    time.sleep(backoff)
                    backoff *= 2.0
                    continue
                break
            except Exception as e:
                err_msg = str(e).lower()
                # 429 = quota/rate limit; 503 = model temporarily overloaded.
                # Both are transient and worth retrying with backoff.
                retryable = (
                    "429" in err_msg
                    or "rate_limit" in err_msg
                    or "too large" in err_msg
                    or "503" in err_msg
                    or "unavailable" in err_msg
                    or "overloaded" in err_msg
                    or "high demand" in err_msg
                )
                if retryable and attempt < max_retries - 1:
                    # Honor the provider's own "try again in Xs" when present.
                    m = re.search(r"try again in ([\d.]+)\s*s", err_msg)
                    wait = float(m.group(1)) + 1.0 if m else backoff
                    wait = min(wait, 30.0)
                    logger.warning(
                        f"Transient error on model {model} (attempt {attempt + 1}/{max_retries}). "
                        f"Backing off for {wait:.1f}s..."
                    )
                    time.sleep(wait)
                    backoff *= 2.0
                    continue
                logger.error(f"OpenAI generation failed: {type(e).__name__}: {e}.")
                break

        return []

    def _generate_with_model(self, model, job_role, focus, contexts, n, category) -> List[GeneratedQA]:
        results: List[GeneratedQA] = []
        remaining = n
        while remaining > 0:
            batch_n = min(self._BATCH_SIZE, remaining)
            batch = self._generate_batch(job_role, focus, contexts, batch_n, category, model)
            if not batch:
                break
            results.extend(batch)
            if len(batch) < batch_n:
                break
            remaining -= len(batch)
        return results

    def generate(self, job_role, focus, contexts, n, category=None) -> List[GeneratedQA]:
        import logging

        logger = logging.getLogger("rag.generator")
        best: List[GeneratedQA] = []
        # Try each configured model (primary first, then fallbacks). Accept the
        # primary as soon as it delivers the full set; otherwise keep the best
        # partial result and try the next model.
        for model in self.models:
            results = self._generate_with_model(model, job_role, focus, contexts, n, category)
            if len(results) >= n:
                return results[:n]
            if len(results) > len(best):
                best = results
            if results:
                logger.warning(
                    f"Model {model} produced only {len(results)}/{n} questions; trying next."
                )

        if best:
            return best[:n]

        # Don't silently substitute low-quality template questions — surface
        # the failure so the caller can report it (e.g. retry later).
        logger.error("All generation attempts failed via '%s'; no questions produced.", self.name)
        raise RuntimeError(
            "Question generation failed: the language model was unavailable or "
            "rate-limited. Please try again in a moment."
        )


# ---------------------------------------------------------------------------
class GeminiProvider(OpenAIProvider):
    """Google Gemini, reached through its OpenAI-compatible endpoint.

    Reuses the OpenAI provider's batching, retry, JSON-salvage, and fallback
    behaviour; only the client (base URL + key) and model differ.
    """

    name = "gemini"

    def __init__(self):
        from openai import OpenAI  # imported lazily

        self.client = OpenAI(
            api_key=settings.gemini_api_key,
            base_url=settings.gemini_base_url,
            timeout=60.0,
            max_retries=0,
        )
        self.model = settings.gemini_model
        # Primary, then fallback (e.g. a lighter model) if it can't deliver.
        chain = [settings.gemini_model, settings.gemini_fallback_model]
        self.models = list(dict.fromkeys(m for m in chain if m))


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
    MCQ interview questions on the domain topics found in source passages,
    without referencing document names in the question text."""

    name = "offline"

    # Templates organized by sub_type for even distribution
    _TEMPLATES = {
        "fundamentals": [
            "Which architectural pattern is most appropriate for \"{topic}\" in a {role} system?",
            "What is the primary benefit of using \"{topic}\" in distributed systems?",
            "In the context of {role} engineering, which principle does \"{topic}\" primarily address?",
            "What trade-off does \"{topic}\" make compared to simpler alternatives?",
        ],
        "understanding": [
            "Why does \"{topic}\" favour eventual consistency over strong consistency in distributed systems?",
            "How does \"{topic}\" handle partial failures without disrupting the entire system?",
            "What would happen to a {role} system if \"{topic}\" were removed entirely?",
            "Why is \"{topic}\" considered essential for horizontal scalability?",
        ],
        "apply": [
            "A production {role} service using \"{topic}\" starts returning 503 errors. What is your first diagnostic step?",
            "How would you redesign a monolithic {role} service to leverage \"{topic}\" effectively?",
            "Your team needs to deploy \"{topic}\" with zero downtime. What strategy do you follow?",
            "Under high traffic, \"{topic}\" is causing cascading failures. How do you contain the blast radius?",
        ],
        "analyse": [
            "Compare the consistency guarantees of \"{topic}\" versus a traditional two-phase commit approach.",
            "What are the operational trade-offs of adopting \"{topic}\" for a {role} system at scale?",
            "Analyse the failure modes of \"{topic}\" — what breaks first and how do you mitigate it?",
            "How does \"{topic}\" impact overall system observability compared to a monolithic architecture?",
        ],
    }

    _SUB_TYPES_KNOWLEDGE = ["fundamentals", "understanding"]
    _SUB_TYPES_SKILL = ["apply", "analyse"]
    _TIME_RANGES = {
        "fundamentals": (20, 40),
        "understanding": (45, 75),
        "apply": (60, 100),
        "analyse": (75, 120),
    }

    # Pre-built MCQ option sets
    _OPTION_SETS = [
        (["Implement circuit breakers and retry logic", "Increase server memory allocation", "Disable all health checks", "Migrate to a single-node database"], 0),
        (["Configure horizontal auto-scaling with load balancers", "Upgrade to a larger single server", "Reduce the number of API endpoints", "Disable caching entirely"], 0),
        (["Use role-based access control with least-privilege principles", "Grant admin access to all users", "Store credentials in client-side code", "Disable all authentication for speed"], 0),
        (["Deploy with blue-green strategy and automated rollback", "Deploy directly to production without testing", "Use manual deployment scripts only", "Skip rollback procedures to save time"], 0),
        (["Implement distributed tracing across all services", "Remove all logging to improve performance", "Use print statements for debugging", "Skip error handling in production"], 0),
        (["Set up automated health checks with alerting", "Manually check servers once per week", "Ignore all warning signs", "Disable monitoring during peak hours"], 0),
    ]

    @staticmethod
    def _topic(text: str) -> str:
        snippet = re.sub(r"\s+", " ", text).strip()
        snippet = re.sub(r"^[#\*\-\d\.\s]+", "", snippet)
        # Chunks overlap, so text often begins mid-word/mid-sentence. Skip to the
        # next sentence boundary to avoid topic strings like "tation with ...".
        if snippet and snippet[0].islower():
            boundary = re.search(r"[.!?]\s+([A-Z])", snippet)
            if boundary:
                snippet = snippet[boundary.start(0) + 2 :]
        m = re.match(r"(.{10,90}?)[.,;:!?](?:\s|$)", snippet)
        phrase = m.group(1) if m else snippet[:90]
        words = [w.strip(".,;:!?()[]\"'") for w in phrase.split(" ")]
        clean_words = [w for w in words[:7] if w]
        return " ".join(clean_words) or "this architecture component"

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
            default_sub = "fundamentals" if category == "knowledge" else "apply"
            return [
                GeneratedQA(
                    question=f"No source material was retrieved for a {job_role}.",
                    answer="This cannot be answered: no relevant context was found.",
                    answerable=False,
                    options=["A", "B", "C", "D"],
                    correct_option=0,
                    explanation="No context available.",
                    sub_type=default_sub,
                    expected_time_seconds=30,
                )
            ]
        if category == "skill":
            sub_types = self._SUB_TYPES_SKILL
        elif category == "knowledge":
            sub_types = self._SUB_TYPES_KNOWLEDGE
        else:
            sub_types = self._SUB_TYPES_KNOWLEDGE + self._SUB_TYPES_SKILL

        out: List[GeneratedQA] = []
        for i, c in enumerate(contexts):
            topic = self._topic(c.text)
            core_summary = self._first_sentences(c.text, max_chars=320)

            # Cycle through sub_types evenly based on category
            sub_type = sub_types[i % len(sub_types)]
            templates = self._TEMPLATES[sub_type]
            tmpl = templates[(i // len(sub_types)) % len(templates)]
            lo, hi = self._TIME_RANGES[sub_type]
            exp_time = random.randint(lo, hi)

            # Pick options
            opts, correct = self._OPTION_SETS[i % len(self._OPTION_SETS)]

            explanation = (
                f"The correct answer is grounded in the enterprise documentation. "
                f"Context: {core_summary[:150]}..."
            )

            out.append(GeneratedQA(
                question=tmpl.format(role=job_role, topic=topic),
                answer=core_summary,
                answerable=True,
                options=opts,
                correct_option=correct,
                explanation=explanation,
                sub_type=sub_type,
                expected_time_seconds=exp_time,
            ))
            if len(out) >= n:
                break
        return out


_PROVIDERS = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
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
