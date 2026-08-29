"""Database configuration and models using SQLAlchemy.

Manages connection to PostgreSQL and defines all data models.
Migrations are handled by Alembic.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column, String, Integer, DateTime, Float, Boolean, JSON, Text,
    ForeignKey, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool

Base = declarative_base()


def get_db_url() -> str:
    """Build database URL from environment variables."""
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "assessiq")
    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASSWORD", "postgres")
    
    return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"


def init_db(db_url: Optional[str] = None) -> tuple[str, object]:
    """Initialize database engine and session factory."""
    url = db_url or get_db_url()
    engine = create_engine(url, poolclass=NullPool, echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    return url, SessionLocal


class Document(Base):
    """Uploaded documents and their metadata."""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100))
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    chunk_count = Column(Integer, default=0)
    metadata = Column(JSON, default={})

    def __repr__(self):
        return f"<Document {self.id}: {self.filename}>"


class Chunk(Base):
    """Text chunks from documents with vector references."""
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(Integer)  # Chunk number within the document
    text = Column(Text, nullable=False)
    vector_id = Column(String(255))  # Reference to vector in Chroma: "{doc_id}#{chunk_id}"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Chunk {self.id}: doc={self.doc_id}, chunk={self.chunk_id}>"


class QuestionSet(Base):
    """Generated Q&A sets."""
    __tablename__ = "question_sets"

    id = Column(String(36), primary_key=True)
    doc_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    job_role = Column(String(255), nullable=False)
    questions = Column(JSON)  # List of {id, text, answer, type (Knowledge/Skill), confidence, source_chunk_id}
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    metadata = Column(JSON, default={})

    def __repr__(self):
        return f"<QuestionSet {self.id}: {self.job_role}>"


class QuestionRating(Base):
    """User ratings for questions."""
    __tablename__ = "question_ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_set_id = Column(String(36), ForeignKey("question_sets.id", ondelete="CASCADE"))
    question_id = Column(String(36))
    rating = Column(Integer)  # 1-5 or similar
    comment = Column(Text)
    rated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<QuestionRating {self.id}: {self.rating}>"


class User(Base):
    """User accounts."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="recruiter")  # admin, recruiter
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<User {self.username}>"


class SystemParameter(Base):
    """Admin-tunable system parameters."""
    __tablename__ = "system_parameters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(255))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SystemParameter {self.key}={self.value}>"
