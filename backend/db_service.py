"""Database service layer for all CRUD operations.

Provides a single interface for database access, abstracting away SQLAlchemy details.
Replaces the file-based storage in store.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from .database import (
    Document, Chunk, QuestionSet, QuestionRating, User, SystemParameter,
    init_db, get_db_url
)
from .rag.config import settings


class DatabaseService:
    """High-level database operations."""

    def __init__(self):
        """Initialize database connection."""
        if not settings.use_sql_db:
            self.session_factory = None
            return
        
        _, self.session_factory = init_db(settings.db_url())

    def get_session(self) -> Session:
        """Get a new database session."""
        if self.session_factory is None:
            raise RuntimeError("SQL database not configured")
        return self.session_factory()

    # --- Documents -------------------------------------------------------
    def create_document(
        self,
        filename: str,
        mime_type: str = "",
        file_size: int = 0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Document:
        """Create a new document record."""
        doc_id = str(uuid.uuid4())
        session = self.get_session()
        try:
            doc = Document(
                id=doc_id,
                filename=filename,
                mime_type=mime_type,
                file_size=file_size,
                metadata=metadata or {}
            )
            session.add(doc)
            session.commit()
            return doc
        finally:
            session.close()

    def get_document(self, doc_id: str) -> Optional[Document]:
        """Get a document by ID."""
        session = self.get_session()
        try:
            return session.query(Document).filter(Document.id == doc_id).first()
        finally:
            session.close()

    def list_documents(self) -> List[Document]:
        """Get all documents."""
        session = self.get_session()
        try:
            return session.query(Document).all()
        finally:
            session.close()

    def delete_document(self, doc_id: str):
        """Delete a document and all related chunks/QA sets."""
        session = self.get_session()
        try:
            doc = session.query(Document).filter(Document.id == doc_id).first()
            if doc:
                session.delete(doc)
                session.commit()
        finally:
            session.close()

    def update_document_chunk_count(self, doc_id: str, count: int):
        """Update the chunk count for a document."""
        session = self.get_session()
        try:
            doc = session.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.chunk_count = count
                session.commit()
        finally:
            session.close()

    # --- Chunks ----------------------------------------------------------
    def create_chunk(
        self,
        doc_id: str,
        chunk_id: int,
        text: str,
        vector_id: Optional[str] = None
    ) -> Chunk:
        """Create a new chunk."""
        session = self.get_session()
        try:
            chunk = Chunk(
                doc_id=doc_id,
                chunk_id=chunk_id,
                text=text,
                vector_id=vector_id or f"{doc_id}#{chunk_id}"
            )
            session.add(chunk)
            session.commit()
            return chunk
        finally:
            session.close()

    def get_chunks_for_doc(self, doc_id: str) -> List[Chunk]:
        """Get all chunks for a document."""
        session = self.get_session()
        try:
            return session.query(Chunk).filter(Chunk.doc_id == doc_id).all()
        finally:
            session.close()

    def delete_chunks_for_doc(self, doc_id: str):
        """Delete all chunks for a document."""
        session = self.get_session()
        try:
            session.query(Chunk).filter(Chunk.doc_id == doc_id).delete()
            session.commit()
        finally:
            session.close()

    # --- Question Sets ---------------------------------------------------
    def create_question_set(
        self,
        doc_id: str,
        job_role: str,
        questions: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> QuestionSet:
        """Create a new question set."""
        qa_set_id = str(uuid.uuid4())
        session = self.get_session()
        try:
            qa_set = QuestionSet(
                id=qa_set_id,
                doc_id=doc_id,
                job_role=job_role,
                questions=questions,
                metadata=metadata or {}
            )
            session.add(qa_set)
            session.commit()
            return qa_set
        finally:
            session.close()

    def get_question_set(self, qa_set_id: str) -> Optional[QuestionSet]:
        """Get a question set by ID."""
        session = self.get_session()
        try:
            return session.query(QuestionSet).filter(QuestionSet.id == qa_set_id).first()
        finally:
            session.close()

    def list_question_sets(self, doc_id: Optional[str] = None) -> List[QuestionSet]:
        """Get all question sets, optionally filtered by document."""
        session = self.get_session()
        try:
            query = session.query(QuestionSet)
            if doc_id:
                query = query.filter(QuestionSet.doc_id == doc_id)
            return query.all()
        finally:
            session.close()

    def delete_question_set(self, qa_set_id: str):
        """Delete a question set."""
        session = self.get_session()
        try:
            qa_set = session.query(QuestionSet).filter(QuestionSet.id == qa_set_id).first()
            if qa_set:
                session.delete(qa_set)
                session.commit()
        finally:
            session.close()

    # --- Question Ratings ------------------------------------------------
    def rate_question(
        self,
        question_set_id: str,
        question_id: str,
        rating: int,
        comment: str = ""
    ) -> QuestionRating:
        """Add a rating for a question."""
        session = self.get_session()
        try:
            q_rating = QuestionRating(
                question_set_id=question_set_id,
                question_id=question_id,
                rating=rating,
                comment=comment
            )
            session.add(q_rating)
            session.commit()
            return q_rating
        finally:
            session.close()

    def get_ratings_for_set(self, question_set_id: str) -> List[QuestionRating]:
        """Get all ratings for a question set."""
        session = self.get_session()
        try:
            return session.query(QuestionRating).filter(
                QuestionRating.question_set_id == question_set_id
            ).all()
        finally:
            session.close()

    # --- Users -----------------------------------------------------------
    def create_user(
        self,
        username: str,
        password_hash: str,
        role: str = "recruiter"
    ) -> User:
        """Create a new user."""
        user_id = str(uuid.uuid4())
        session = self.get_session()
        try:
            user = User(
                id=user_id,
                username=username,
                password_hash=password_hash,
                role=role
            )
            session.add(user)
            session.commit()
            return user
        finally:
            session.close()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get a user by username."""
        session = self.get_session()
        try:
            return session.query(User).filter(User.username == username).first()
        finally:
            session.close()

    def list_users(self) -> List[User]:
        """Get all users."""
        session = self.get_session()
        try:
            return session.query(User).all()
        finally:
            session.close()

    def delete_user(self, user_id: str):
        """Delete a user."""
        session = self.get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if user:
                session.delete(user)
                session.commit()
        finally:
            session.close()

    # --- System Parameters -----------------------------------------------
    def set_parameter(self, key: str, value: str):
        """Set or update a system parameter."""
        session = self.get_session()
        try:
            param = session.query(SystemParameter).filter(SystemParameter.key == key).first()
            if param:
                param.value = value
                param.updated_at = datetime.now(timezone.utc)
            else:
                param = SystemParameter(key=key, value=value)
                session.add(param)
            session.commit()
        finally:
            session.close()

    def get_parameter(self, key: str, default: str = "") -> str:
        """Get a system parameter."""
        session = self.get_session()
        try:
            param = session.query(SystemParameter).filter(SystemParameter.key == key).first()
            return param.value if param else default
        finally:
            session.close()

    def get_all_parameters(self) -> Dict[str, str]:
        """Get all system parameters."""
        session = self.get_session()
        try:
            params = session.query(SystemParameter).all()
            return {p.key: p.value for p in params}
        finally:
            session.close()


# Global database service instance
_db_service: Optional[DatabaseService] = None


def get_db_service() -> DatabaseService:
    """Get or create the global database service."""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service
