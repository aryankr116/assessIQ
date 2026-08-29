"""Cognitive classifier: Knowledge-Based vs Skill-Based.

Implements the report's idea of using semantic similarity (plus lexical cues) to
tag each generated question. A question is embedded and compared against two sets
of prototype phrases; lexical signals (imperative verbs like "implement",
interrogatives like "what is") nudge the score. Output includes a margin-based
confidence so the UI can explain *why* a label was chosen.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np

from .embeddings import embed_texts

KNOWLEDGE_PROTOTYPES = [
    "What is the definition of this concept?",
    "Explain the meaning and purpose of this topic.",
    "Describe how this process works in theory.",
    "List the main components or steps involved.",
    "What is the difference between these concepts?",
    "When and why is this approach used?",
]

SKILL_PROTOTYPES = [
    "Implement a function that solves this problem.",
    "Write code to perform this task.",
    "Debug and fix the issue in this scenario.",
    "Design a system to handle this requirement.",
    "How would you build and optimise this component?",
    "Apply this technique to the following practical case.",
]

_SKILL_CUES = re.compile(
    r"\b(implement|write|code|build|design|debug|fix|optimi[sz]e|refactor|"
    r"configure|deploy|create a|develop|construct|apply|handle|troubleshoot)\b",
    re.IGNORECASE,
)
_KNOWLEDGE_CUES = re.compile(
    r"\b(what is|what are|define|definition|explain|describe|list|when|why|"
    r"which|difference between|concept|meaning|purpose)\b",
    re.IGNORECASE,
)

_PROTO_EMB = None


def _proto_embeddings():
    global _PROTO_EMB
    if _PROTO_EMB is None:
        k = embed_texts(KNOWLEDGE_PROTOTYPES)
        s = embed_texts(SKILL_PROTOTYPES)
        _PROTO_EMB = (k, s)
    return _PROTO_EMB


@dataclass
class Classification:
    type: str  # "knowledge" | "skill"
    confidence: float  # 0..1 margin-based confidence in the label


def classify_question(question: str) -> Classification:
    k_emb, s_emb = _proto_embeddings()
    q = embed_texts([question])[0]

    # Mean cosine similarity to each prototype set (vectors are normalised).
    k_sim = float(np.mean(k_emb @ q))
    s_sim = float(np.mean(s_emb @ q))

    # Lexical nudges. Weighted strongly so the classifier still works when the
    # semantic signal is weak (e.g. the hashing fallback embedder); with real
    # sentence-transformer embeddings the k_sim/s_sim terms carry most of it.
    k_cues = len(_KNOWLEDGE_CUES.findall(question))
    s_cues = len(_SKILL_CUES.findall(question))
    k_bonus = 0.13 * k_cues
    s_bonus = 0.13 * s_cues
    k_score = k_sim + k_bonus
    s_score = s_sim + s_bonus

    if s_score >= k_score:
        label = "skill"
        margin = s_score - k_score
    else:
        label = "knowledge"
        margin = k_score - s_score

    # Map the margin into a readable confidence (0.5 = coin-flip, ->1 = clear).
    confidence = float(min(0.99, 0.55 + margin * 2.2))
    return Classification(type=label, confidence=round(confidence, 2))
