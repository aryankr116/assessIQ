"""Central configuration for the AssessIQ RAG backend.

All settings are environment-driven so the same code runs in mock-ish offline
mode (zero setup) or against real models / LLM APIs. Copy ``.env.example`` to
``.env`` and adjust as needed (loaded automatically if python-dotenv is present).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Load a .env file if python-dotenv is available (optional dependency).
try:  # pragma: no cover - convenience only
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    # --- Storage ---------------------------------------------------------
    data_dir: Path = field(
        default_factory=lambda: Path(
            os.getenv("ASSESSIQ_DATA_DIR", "backend/.assessiq_data")
        )
    )

    # --- Embeddings ------------------------------------------------------
    embedding_model: str = os.getenv(
        "ASSESSIQ_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    # Dimension used by the lightweight hashing fallback embedder.
    fallback_embedding_dim: int = int(os.getenv("ASSESSIQ_FALLBACK_DIM", "512"))

    # --- Chunking (used when (re)ingesting through the API) --------------
    chunk_size: int = int(os.getenv("ASSESSIQ_CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("ASSESSIQ_CHUNK_OVERLAP", "200"))

    # --- Vector Database -------------------------------------------------
    # one of: "chroma", "faiss"
    vector_db: str = os.getenv("ASSESSIQ_VECTOR_DB", "faiss").lower()
    # Chroma server URL (only used if vector_db == "chroma")
    chroma_url: str = os.getenv("CHROMA_URL", "http://localhost:8000")

    # --- SQL Database (PostgreSQL) ----------------------------------------
    # When set, all data (documents, QA sets, users) stored in PostgreSQL
    # Leave empty to use file-based storage (legacy)
    use_sql_db: bool = _bool("ASSESSIQ_USE_SQL_DB", True)
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: str = os.getenv("DB_PORT", "5432")
    db_name: str = os.getenv("DB_NAME", "assessiq")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "postgres")

    def db_url(self) -> str:
        """Build PostgreSQL connection URL."""
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    # --- Retrieval -------------------------------------------------------
    default_top_k: int = int(os.getenv("ASSESSIQ_TOP_K", "6"))
    # Min cosine similarity for a chunk to count as relevant. Below this the
    # prompt is treated as out-of-scope (answerability gate).
    answerability_threshold: float = float(
        os.getenv("ASSESSIQ_ANSWERABILITY_THRESHOLD", "0.18")
    )

    # --- Generation provider --------------------------------------------
    # one of: "openai", "ollama", "offline"
    llm_provider: str = os.getenv("ASSESSIQ_LLM_PROVIDER", "openai").lower()
    # How many Q&A pairs to aim for per generation request.
    questions_per_set: int = int(os.getenv("ASSESSIQ_QUESTIONS_PER_SET", "6"))

    # OpenAI / OpenAI-compatible
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")  # empty = default
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Ollama
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3")

    # --- API -------------------------------------------------------------
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv(
            "ASSESSIQ_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
    )

    # --- Auth / accounts -------------------------------------------------
    # When False (default) the core endpoints work without a token so the demo
    # stays frictionless; auth endpoints + admin routes still function. Set True
    # to require a valid bearer token on document/generation routes.
    require_auth: bool = _bool("ASSESSIQ_REQUIRE_AUTH", False)
    auth_secret: str = os.getenv("ASSESSIQ_SECRET", "dev-insecure-secret-change-me")
    token_ttl_hours: int = int(os.getenv("ASSESSIQ_TOKEN_TTL_HOURS", "168"))
    # Seed admin created on first run if no users exist.
    seed_admin_user: str = os.getenv("ASSESSIQ_ADMIN_USER", "admin")
    seed_admin_password: str = os.getenv("ASSESSIQ_ADMIN_PASSWORD", "admin123")

    def resolved_provider(self) -> str:
        """Fall back to the offline provider if the chosen one isn't usable,
        so the server always starts and demos cleanly."""
        if self.llm_provider == "openai" and not self.openai_api_key:
            return "offline"
        return self.llm_provider


settings = Settings()
