"""Embedding models.

Primary: Sentence-Transformers (dense semantic embeddings, as described in the
project report — DPR-style bi-encoder retrieval). If sentence-transformers /
torch are not installed, falls back to a deterministic hashing embedder so the
pipeline still runs (lower semantic quality, but no heavy downloads).

All embeddings are L2-normalised, so an inner product equals cosine similarity.
"""

from __future__ import annotations

import hashlib
import re
from typing import List

import numpy as np

from .config import settings

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _l2_normalize(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms


class HashingEmbedder:
    """Lightweight fallback: hashed bag-of-words with sub-linear TF weighting.

    Deterministic and dependency-free (numpy only). Captures lexical overlap,
    which is enough to keep retrieval and the demo working without ML models.
    """

    backend = "hashing"

    def __init__(self, dim: int | None = None):
        self.dim = dim or settings.fallback_embedding_dim

    def _embed_one(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dim, dtype=np.float32)
        tokens = _TOKEN_RE.findall((text or "").lower())
        if not tokens:
            return vec
        counts: dict[int, float] = {}
        for tok in tokens:
            h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            sign = 1.0 if (h >> 16) % 2 == 0 else -1.0
            counts[idx] = counts.get(idx, 0.0) + sign
        for idx, c in counts.items():
            if c == 0:  # opposing signs cancelled out
                continue
            # sub-linear scaling dampens very frequent tokens
            vec[idx] = np.sign(c) * (1.0 + np.log(abs(c)))
        return vec

    def encode(self, texts: List[str]) -> np.ndarray:
        mat = np.vstack([self._embed_one(t) for t in texts]).astype(np.float32)
        return _l2_normalize(mat)


class SentenceTransformerEmbedder:
    backend = "sentence-transformers"

    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer  # heavy import

        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def encode(self, texts: List[str]) -> np.ndarray:
        vecs = self.model.encode(
            list(texts),
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return vecs.astype(np.float32)


_EMBEDDER = None


def get_embedder():
    """Return a singleton embedder, preferring sentence-transformers."""
    global _EMBEDDER
    if _EMBEDDER is not None:
        return _EMBEDDER
    try:
        _EMBEDDER = SentenceTransformerEmbedder(settings.embedding_model)
    except Exception as exc:  # pragma: no cover - environment dependent
        print(
            f"[embeddings] sentence-transformers unavailable ({exc.__class__.__name__}); "
            "using hashing fallback embedder."
        )
        _EMBEDDER = HashingEmbedder()
    return _EMBEDDER


def embed_texts(texts: List[str]) -> np.ndarray:
    if not texts:
        return np.zeros((0, get_embedder_dim()), dtype=np.float32)
    return get_embedder().encode(texts)


def embed_text(text: str) -> np.ndarray:
    return embed_texts([text])[0]


def get_embedder_dim() -> int:
    emb = get_embedder()
    if isinstance(emb, HashingEmbedder):
        return emb.dim
    # Probe once for transformer dim.
    return int(emb.encode(["_"]).shape[1])
