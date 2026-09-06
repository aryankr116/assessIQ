"""AssessIQ FastAPI application.

Exposes the six endpoints the React frontend expects. Run with:

    uvicorn backend.api.main:app --reload --port 8000

(from the project root, with the backend dependencies installed).
"""

from __future__ import annotations

import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from ..rag.config import settings
from ..rag.embeddings import get_embedder
from ..rag.vector_store import VectorStore
from ..db_service import get_db_service
from .schemas import (
    Document,
    QASet,
    Question,
    Source,
    GenerateRequest,
    RatingRequest,
    Stats,
    LoginRequest,
    RegisterRequest,
    GoogleLoginRequest,
    AuthResponse,
    User,
    SystemParams,
    Candidate,
    CandidateCreateRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
)
from .store import get_store
from . import auth

app = FastAPI(title="AssessIQ API", version="1.0.0")

GOOGLE_CLIENT_ID = "438380772420-ogp6gn91h64ruvvlit0h8guo3vfve9ee.apps.googleusercontent.com"

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _attach_ratings(qa_set: dict) -> dict:
    """Load ratings from Postgres and attach them to each question in the set."""
    db = get_db_service()
    ratings_map = db.get_ratings_map(qa_set["id"])
    for q in qa_set.get("questions", []):
        if q["id"] in ratings_map:
            q["rating"] = ratings_map[q["id"]]
    return qa_set


# --- Health ---------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "embedder": get_embedder().backend,
        "vector_store": VectorStore.create(1).backend,
        "llm_provider": settings.resolved_provider(),
        "require_auth": settings.require_auth,
        "storage": "postgres",
    }


# --- Auth ----------------------------------------------------------------
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    users = auth.get_users()
    user = users.create(req.username, req.password, role="recruiter", email=req.email or "")
    token = auth.issue_token(user["username"], user["role"])
    return AuthResponse(token=token, user=User(**users.public(user))).model_dump(by_alias=True)


@app.post("/api/auth/login")
def login(req: LoginRequest):
    users = auth.get_users()
    user = users.authenticate(req.username, req.password)
    token = auth.issue_token(user["username"], user["role"])
    return AuthResponse(token=token, user=User(**users.public(user))).model_dump(by_alias=True)


@app.post("/api/auth/google")
def google_login(req: GoogleLoginRequest):
    """Authenticate via Google OAuth ID token."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        google_user = id_token.verify_oauth2_token(
            req.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(401, "Invalid Google token")

    users = auth.get_users()
    user = users.google_authenticate(google_user)
    token = auth.issue_token(user["username"], user["role"])
    return AuthResponse(token=token, user=User(**users.public(user))).model_dump(by_alias=True)


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """Look up user by email, generate a new random password, and email it to them."""
    import secrets
    import string
    import smtplib
    from email.mime.text import MIMEText

    from ..rag.config import settings

    users = auth.get_users()
    db_user = users._db.get_user_by_email(req.email)
    if not db_user:
        # Don't reveal whether the email exists
        return {"message": "If the email is registered, a new password has been sent."}

    # Generate a random 12-char password
    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for _ in range(12))

    # Reset the password
    users.reset_password(db_user.username, new_password)

    # Send email
    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEText(
                f"Hi {db_user.username},\n\n"
                f"Your AssessIQ password has been reset.\n\n"
                f"New password: {new_password}\n\n"
                f"Please log in and change your password.\n\n"
                f"— AssessIQ Team",
                "plain",
            )
            msg["Subject"] = "AssessIQ — Password Reset"
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
            msg["To"] = req.email

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        except Exception as e:
            raise HTTPException(500, f"Failed to send email: {e}")

    return {"message": "If the email is registered, a new password has been sent."}


@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, user: dict = Depends(auth.require_user)):
    """Change the authenticated user's password."""
    users = auth.get_users()
    db_user = users._db.get_user_by_username(user["username"])
    if not db_user or not auth.verify_password(req.current_password, db_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    users.reset_password(user["username"], req.new_password)
    return {"message": "Password changed successfully."}


@app.post("/api/auth/update-profile")
def update_profile(req: UpdateProfileRequest, user: dict = Depends(auth.require_user)):
    """Update the authenticated user's username and/or email."""
    users = auth.get_users()
    try:
        updated = users._db.update_user_profile(
            user["username"],
            new_username=req.username if req.username else None,
            email=req.email,
        )
        if not updated:
            raise HTTPException(404, "User not found")
        # Issue a new token if username changed
        new_user = {"username": updated.username, "role": updated.role, "email": updated.email or ""}
        token = auth.issue_token(new_user["username"], new_user["role"])
        return {
            "message": "Profile updated.",
            "token": token,
            "user": users.public(new_user),
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/auth/me")
def me(user: dict = Depends(auth.require_user)):
    return User(username=user["username"], role=user["role"]).model_dump(by_alias=True)


# --- Admin ---------------------------------------------------------------
@app.get("/api/admin/users")
def admin_users(_: dict = Depends(auth.require_admin)):
    return auth.get_users().list_public()


@app.get("/api/admin/params")
def get_params(_: dict = Depends(auth.require_admin)):
    return get_store().params


@app.put("/api/admin/params")
def set_params(patch: dict, _: dict = Depends(auth.require_admin)):
    return get_store().update_params(patch)


# --- Candidates ----------------------------------------------------------
@app.get("/api/candidates")
def list_candidates():
    return get_store().list_candidates()


@app.post("/api/candidates")
def create_candidate(req: CandidateCreateRequest, _: dict = Depends(auth.require_user)):
    store = get_store()
    candidate_id = "cand_" + uuid.uuid4().hex[:10]
    candidate = Candidate(
        id=candidate_id,
        name=req.name,
        email=req.email or f"{req.name.lower().replace(' ', '.')}@example.com",
        target_role=req.target_role,
        resume_name=req.resume_name or f"{req.name.lower().replace(' ', '_')}_resume.pdf",
        resume_ext=req.resume_ext or ".pdf",
        resume_size_bytes=req.resume_size_bytes or 0,
        uploaded_at=_now_iso(),
        skills=req.skills or [],
        experience_years=req.experience_years or 0,
        summary=req.summary or "",
    ).model_dump(by_alias=True)
    store.upsert_candidate(candidate)
    return candidate


@app.put("/api/candidates/{candidate_id}")
def update_candidate(
    candidate_id: str,
    name: str = Form(None),
    targetRole: str = Form(None),
    email: str = Form(None),
    summary: str = Form(None),
    resume: UploadFile = File(None),
    _: dict = Depends(auth.require_user),
):
    store = get_store()
    candidates = store.list_candidates()
    existing = next((c for c in candidates if c["id"] == candidate_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if name is not None:
        existing["name"] = name
    if targetRole is not None:
        existing["targetRole"] = targetRole
    if email is not None:
        existing["email"] = email
    if summary is not None:
        existing["summary"] = summary

    if resume and resume.filename:
        uploads = settings.data_dir / "uploads"
        uploads.mkdir(parents=True, exist_ok=True)
        ext = "." + resume.filename.rsplit(".", 1)[-1].lower() if "." in resume.filename else ".pdf"
        dest = uploads / f"{candidate_id}{ext}"
        with open(dest, "wb") as f:
            shutil.copyfileobj(resume.file, f)
        existing["resumeName"] = resume.filename
        existing["resumeExt"] = ext
        existing["resumeSizeBytes"] = dest.stat().st_size

    existing["updatedAt"] = _now_iso()
    store.upsert_candidate(existing)
    return existing


@app.delete("/api/candidates/{candidate_id}", status_code=204)
def delete_candidate(candidate_id: str, _: dict = Depends(auth.require_user)):
    get_store().delete_candidate(candidate_id)
    return None


# --- Documents -----------------------------------------------------------
@app.get("/api/documents")
def list_documents():
    return get_store().list_documents()


def _ingest_in_background(doc_id: str, path: str, name: str):
    """Run extract -> clean -> chunk -> embed -> index off the request path so a
    large document does not block the upload response."""
    store = get_store()
    doc = store.documents.get(doc_id)
    if not doc:
        return

    def on_progress(done: int, total: int):
        doc["status"] = "chunking"
        doc["chunksTotal"] = total
        doc["chunksDone"] = done
        store.upsert_document(doc)

    try:
        doc["status"] = "chunking"
        store.upsert_document(doc)
        result = store.pipeline.ingest_document(
            path, doc_id, name, progress_cb=on_progress
        )
        doc.update(
            {
                "status": "indexed" if result.chunk_count else "failed",
                "chunks": result.chunk_count,
                "chunksDone": result.chunk_count,
                "chunksTotal": result.chunk_count,
                "pages": max(1, result.chunk_count // 3) if result.chunk_count else 0,
                "excerpt": result.excerpt or doc.get("excerpt", ""),
            }
        )
    except Exception as exc:  # noqa: BLE001
        doc.update({"status": "failed", "excerpt": f"Ingestion failed: {exc}"})
    store.upsert_document(doc)
    store.persist()


@app.post("/api/documents")
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    _: dict = Depends(auth.require_user),
):
    store = get_store()
    doc_id = "doc_" + uuid.uuid4().hex[:10]
    name = file.filename or "upload"
    ext = os.path.splitext(name)[1].lower()

    # Persist the upload to disk, then ingest in the background.
    uploads = settings.data_dir / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    dest = uploads / f"{doc_id}{ext}"
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)
    size = dest.stat().st_size

    doc = Document(
        id=doc_id,
        name=name,
        ext=ext,
        size_bytes=size,
        status="extracting",
        uploaded_at=_now_iso(),
    ).model_dump(by_alias=True)
    store.upsert_document(doc)

    # Respond immediately; the frontend polls until status becomes "indexed".
    background.add_task(_ingest_in_background, doc_id, str(dest), name)
    return doc


@app.delete("/api/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str, _: dict = Depends(auth.require_user)):
    get_store().delete_document(doc_id)
    return None


@app.get("/api/documents/{doc_id}/file")
def get_document_file(doc_id: str):
    """Serve the raw document file."""
    from fastapi.responses import FileResponse
    uploads = (settings.data_dir / "uploads").resolve()
    matches = list(uploads.glob(f"{doc_id}.*"))
    if not matches:
        raise HTTPException(404, "File not found")
    path = matches[0]
    import mimetypes
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return FileResponse(path, media_type=mime, content_disposition_type="inline")


@app.get("/api/documents/{doc_id}/chunks")
def get_document_chunks(doc_id: str):
    """Get text chunks for a document (from vector store)."""
    store = get_store()
    records = store.pipeline.store.records
    chunks = [
        {"chunk_id": r.chunk_id, "text": r.text}
        for r in records
        if r.doc_id == doc_id
    ]
    chunks.sort(key=lambda x: x["chunk_id"] or 0)
    return chunks


# --- Q&A sets ------------------------------------------------------------
@app.get("/api/qa-sets")
def list_qa_sets():
    sets = get_store().list_qa_sets()
    return [_attach_ratings(s) for s in sets]


@app.post("/api/generate")
def generate_qa(req: GenerateRequest, _: dict = Depends(auth.require_user)):
    store = get_store()
    prompt = req.prompt or f"Generate interview questions for a {req.job_role}."
    result = store.pipeline.generate_qa(
        job_role=req.job_role,
        prompt=prompt,
        top_k=req.top_k or settings.default_top_k,
        document_ids=req.document_ids or None,
        two_round=req.two_round,
    )

    qa_set = QASet(
        id="set_" + uuid.uuid4().hex[:10],
        job_role=result.job_role,
        candidate_id=req.candidate_id,
        candidate_name=req.candidate_name,
        candidate_role=req.candidate_role,
        prompt=result.prompt,
        top_k=result.top_k,
        created_at=_now_iso(),
        document_ids=result.document_ids,
        questions=[
            Question(
                id=q.id,
                question=q.question,
                answer=q.answer,
                type=q.type,
                confidence=q.confidence,
                answerable=q.answerable,
                sources=[
                    Source(
                        doc_id=s.doc_id,
                        doc_name=s.doc_name,
                        chunk_id=s.chunk_id,
                        snippet=s.snippet,
                    )
                    for s in q.sources
                ],
            )
            for q in result.questions
        ],
    ).model_dump(by_alias=True)

    store.add_qa_set(qa_set)
    return qa_set


@app.delete("/api/qa-sets/{set_id}", status_code=204)
def delete_qa_set(set_id: str, _: dict = Depends(auth.require_user)):
    get_store().delete_qa_set(set_id)
    return None


@app.patch("/api/qa-sets/{set_id}/questions/{question_id}/rating")
def rate_question(set_id: str, question_id: str, req: RatingRequest,
                  _: dict = Depends(auth.require_user)):
    if req.rating not in (1, -1, None):
        raise HTTPException(status_code=400, detail="rating must be 1, -1, or null")
    # Persist rating to Postgres (upsert per question_id, clear on None).
    db = get_db_service()
    db.rate_question(set_id, question_id, req.rating)
    # Return the question object from the JSON store (with the updated rating).
    qa_sets = get_store().list_qa_sets()
    for s in qa_sets:
        if s["id"] == set_id:
            for q in s["questions"]:
                if q["id"] == question_id:
                    q["rating"] = req.rating
                    return q
    raise HTTPException(status_code=404, detail="Question or set not found")


# --- Stats ---------------------------------------------------------------
@app.get("/api/stats")
def stats():
    store = get_store()
    docs = list(store.documents.values())
    sets = list(store.qa_sets.values())
    all_q = [q for s in sets for q in s["questions"]]
    return Stats(
        total_documents=len(docs),
        indexed_documents=sum(1 for d in docs if d["status"] == "indexed"),
        total_chunks=sum(d.get("chunks", 0) for d in docs),
        total_qa_sets=len(sets),
        total_questions=len(all_q),
        knowledge_count=sum(1 for q in all_q if q["type"] == "knowledge"),
        skill_count=sum(1 for q in all_q if q["type"] == "skill"),
        unanswerable_count=sum(1 for q in all_q if not q["answerable"]),
    ).model_dump(by_alias=True)
