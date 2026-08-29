"""AssessIQ FastAPI application.

Exposes the six endpoints the React frontend expects. Run with:

    uvicorn backend.api.main:app --reload --port 8000

(from the project root, with the backend dependencies installed).
"""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from ..rag.config import settings
from ..rag.embeddings import get_embedder
from ..rag.vector_store import VectorStore
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
    AuthResponse,
    User,
    SystemParams,
)
from .store import get_store
from . import auth

app = FastAPI(title="AssessIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "embedder": get_embedder().backend,
        "vector_store": VectorStore.create(1).backend,
        "llm_provider": settings.resolved_provider(),
        "require_auth": settings.require_auth,
    }


# --- Auth ----------------------------------------------------------------
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    users = auth.get_users()
    user = users.create(req.username, req.password, role="recruiter")
    token = auth.issue_token(user["username"], user["role"])
    return AuthResponse(token=token, user=User(**users.public(user))).model_dump(by_alias=True)


@app.post("/api/auth/login")
def login(req: LoginRequest):
    users = auth.get_users()
    user = users.authenticate(req.username, req.password)
    token = auth.issue_token(user["username"], user["role"])
    return AuthResponse(token=token, user=User(**users.public(user))).model_dump(by_alias=True)


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
    if not get_store().delete_document(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return None


# --- Q&A sets ------------------------------------------------------------
@app.get("/api/qa-sets")
def list_qa_sets():
    return get_store().list_qa_sets()


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
    if not get_store().delete_qa_set(set_id):
        raise HTTPException(status_code=404, detail="Question set not found")
    return None


@app.patch("/api/qa-sets/{set_id}/questions/{question_id}/rating")
def rate_question(set_id: str, question_id: str, req: RatingRequest,
                  _: dict = Depends(auth.require_user)):
    if req.rating not in (1, -1, None):
        raise HTTPException(status_code=400, detail="rating must be 1, -1, or null")
    q = get_store().rate_question(set_id, question_id, req.rating)
    if q is None:
        raise HTTPException(status_code=404, detail="Question or set not found")
    return q


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
