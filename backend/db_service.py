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
        _, self.session_factory = init_db(settings.db_url())
        self._seed_admin_if_needed()

    def get_session(self) -> Session:
        """Get a new database session."""
        return self.session_factory()

    def _seed_admin_if_needed(self):
        """Create the seed admin user if the users table is empty."""
        from .api.auth import hash_password
        session = self.get_session()
        try:
            exists = session.query(User).first()
            if exists is None:
                admin = User(
                    id=str(uuid.uuid4()),
                    username=settings.seed_admin_user,
                    password_hash=hash_password(settings.seed_admin_password),
                    role="admin",
                )
                session.add(admin)
                session.commit()
        finally:
            session.close()

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
                meta=metadata or {}
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
                meta=metadata or {}
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
        rating,
        comment: str = ""
    ) -> Optional[int]:
        """Upsert a rating (1/-1/None) for a question within a QA set.

        Passing ``rating=None`` clears the rating (row deleted). Returns the
        resulting rating value, or None if it was cleared.
        """
        session = self.get_session()
        try:
            row = (
                session.query(QuestionRating)
                .filter(
                    QuestionRating.question_set_id == question_set_id,
                    QuestionRating.question_id == question_id,
                )
                .first()
            )
            if rating is None:
                if row:
                    session.delete(row)
                    session.commit()
                return None
            if row:
                row.rating = rating if rating in (-1, 1) else 0
                row.comment = comment
                row.rated_at = datetime.now(timezone.utc)
            else:
                row = QuestionRating(
                    question_set_id=question_set_id,
                    question_id=question_id,
                    rating=rating if rating in (-1, 1) else 0,
                    comment=comment,
                )
                session.add(row)
            session.commit()
            return row.rating
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

    def get_ratings_map(self, question_set_id: str) -> Dict[str, int]:
        """Return ratings for a set keyed by question_id (rating value)."""
        session = self.get_session()
        try:
            rows = session.query(QuestionRating).filter(
                QuestionRating.question_set_id == question_set_id
            ).all()
            return {r.question_id: r.rating for r in rows}
        finally:
            session.close()

    # --- Users -----------------------------------------------------------
    def create_user(
        self,
        username: str,
        password_hash: str,
        role: str = "recruiter",
        email: str = "",
    ) -> User:
        """Create a new user."""
        user_id = str(uuid.uuid4())
        session = self.get_session()
        try:
            user = User(
                id=user_id,
                username=username,
                email=email,
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

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email."""
        session = self.get_session()
        try:
            return session.query(User).filter(User.email == email).first()
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

    def update_user_profile(self, username: str, new_username: str = None, email: str = None):
        """Update a user's username and/or email."""
        session = self.get_session()
        try:
            user = session.query(User).filter(User.username == username).first()
            if user:
                if new_username is not None:
                    # Check if new username is already taken
                    existing = session.query(User).filter(User.username == new_username, User.id != user.id).first()
                    if existing:
                        raise ValueError("Username already taken")
                    user.username = new_username
                if email is not None:
                    user.email = email
                session.commit()
                return user
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
