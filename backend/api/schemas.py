"""Pydantic schemas for the AssessIQ API.

Field names are serialised in camelCase to match exactly what the React
frontend (src/api/mockData.js) expects, while staying snake_case in Python.
"""

from __future__ import annotations

import warnings
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

warnings.filterwarnings("ignore", message=".*alias.*attribute.*has no effect.*")


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Document(CamelModel):
    id: str
    name: str
    ext: str
    size_bytes: int
    status: str  # uploaded | extracting | chunking | indexed | failed
    pages: int = 0
    chunks: int = 0
    chunks_total: int = 0   # total chunks to embed (for progress)
    chunks_done: int = 0    # chunks embedded so far (for progress)
    uploaded_at: str
    excerpt: str = ""
    job_profile_id: Optional[str] = None


class Source(CamelModel):
    doc_id: str
    doc_name: str
    chunk_id: int
    snippet: str


class Question(CamelModel):
    id: str
    question: str
    answer: str
    type: str  # knowledge | skill
    sub_type: str = "fundamentals"  # fundamentals | understanding (knowledge) | apply | analyse (skill)
    confidence: float
    answerable: bool
    sources: List[Source] = []
    rating: Optional[int] = None  # 1 = up, -1 = down, None = unrated
    options: List[str] = []  # MCQ options (A-D)
    correct_option: int = 0  # index of correct option (0-3)
    explanation: str = ""  # why the correct answer is correct
    expected_time_seconds: int = 60  # estimated time for candidate


class QASet(CamelModel):
    id: str
    job_role: str
    prompt: str
    top_k: int
    created_at: str
    document_ids: List[str]
    questions: List[Question]


class GenerateRequest(CamelModel):
    job_role: str
    prompt: str = ""
    top_k: int = 6
    document_ids: List[str] = []
    two_round: bool = False  # generate Knowledge then Skill in separate rounds
    question_type: Optional[str] = None  # "both", "knowledge", "skill"


class RatingRequest(CamelModel):
    rating: Optional[int] = None  # 1 = up, -1 = down, None = clear


# --- auth / accounts -----------------------------------------------------
class LoginRequest(CamelModel):
    username: str
    password: str


class RegisterRequest(CamelModel):
    username: str
    password: str
    email: Optional[str] = None


class GoogleLoginRequest(CamelModel):
    credential: str


class ForgotPasswordRequest(CamelModel):
    email: str


class ResetPasswordRequest(CamelModel):
    token: str
    new_password: str


class ChangePasswordRequest(CamelModel):
    current_password: str
    new_password: str


class UpdateProfileRequest(CamelModel):
    username: Optional[str] = None
    email: Optional[str] = None


class User(CamelModel):
    username: str
    role: str
    email: Optional[str] = None


class JobProfile(CamelModel):
    id: str
    name: str
    created_at: str


class JobProfileCreateRequest(CamelModel):
    name: str


class AuthResponse(CamelModel):
    token: str
    user: User


class SystemParams(CamelModel):
    default_top_k: int
    questions_per_set: int
    answerability_threshold: float
    llm_provider: str


class Stats(CamelModel):
    total_documents: int
    indexed_documents: int
    total_chunks: int
    total_qa_sets: int
    total_questions: int
    knowledge_count: int
    skill_count: int
    unanswerable_count: int
