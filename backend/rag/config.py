"""Central configuration for the AssessIQ RAG backend.

All settings are environment-driven so the same code runs in mock-ish offline
mode (zero setup) or against real models / LLM APIs. Copy ``.env.example`` to
``.env`` and adjust as needed (loaded automatically if python-dotenv is present).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Resolve the project root (parent of this package) so relative paths and the
# same .env work no matter which directory the server is launched from.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Load a .env file if python-dotenv is available (optional dependency).
try:  # pragma: no cover - convenience only
    from dotenv import load_dotenv

    load_dotenv(_PROJECT_ROOT / ".env")
    load_dotenv(_PROJECT_ROOT / "backend" / ".env")
except Exception:
    pass


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


def _abs_data_dir(raw: str) -> Path:
    """Resolve the data dir, anchoring relative paths to the project root."""
    path = Path(raw)
    return path if path.is_absolute() else (_PROJECT_ROOT / path)


@dataclass
class Settings:
    # --- Storage ---------------------------------------------------------
    # Relative paths are anchored to the project root (not the current working
    # directory) so the store never silently splits across launch locations.
    data_dir: Path = field(
        default_factory=lambda: _abs_data_dir(
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

    # Minimum usable text (characters) a document must extract to be indexed.
    # Documents thinner than this are rejected so generation always has enough
    # material to ground a full question set in.
    min_document_chars: int = int(os.getenv("ASSESSIQ_MIN_DOCUMENT_CHARS", "15000"))

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
        os.getenv("ASSESSIQ_ANSWERABILITY_THRESHOLD", "0.05")
    )
    # Custom focus prompts need a stronger match so incidental word overlap
    # (for example, "arrays" in a recipe list) does not trigger generation.
    prompt_scope_threshold: float = float(
        os.getenv("ASSESSIQ_PROMPT_SCOPE_THRESHOLD", "0.32")
    )

    # --- Generation provider --------------------------------------------
    # one of: "openai", "gemini", "ollama", "offline"
    llm_provider: str = os.getenv("ASSESSIQ_LLM_PROVIDER", "openai").lower()
    # How many Q&A pairs to aim for per generation request.
    questions_per_set: int = int(os.getenv("ASSESSIQ_QUESTIONS_PER_SET", "6"))

    # OpenAI / OpenAI-compatible
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")  # empty = default
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    # For reasoning models (e.g. Groq's gpt-oss-*): "low"/"medium"/"high".
    # Empty = don't send the parameter (for models that don't support it).
    openai_reasoning_effort: str = os.getenv("OPENAI_REASONING_EFFORT", "")

    # Gemini (Google AI Studio) — used through its OpenAI-compatible endpoint.
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    # Tried automatically if the primary model is overloaded/quota-limited.
    gemini_fallback_model: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
    gemini_base_url: str = os.getenv(
        "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"
    )

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

    # SMTP settings for sending emails (e.g. password resets)
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_name: str = os.getenv("SMTP_FROM_NAME", "AssessIQ")

    def resolved_provider(self) -> str:
        """Fall back to the offline provider if the chosen one isn't usable,
        so the server always starts and demos cleanly."""
        if self.llm_provider == "openai" and not self.openai_api_key:
            return "offline"
        if self.llm_provider == "gemini" and not self.gemini_api_key:
            return "offline"
        return self.llm_provider


settings = Settings()
