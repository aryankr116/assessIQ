# AssessIQ — Architecture & Setup

*Intelligent System for Job-Specific QA Generation.* This document describes the implemented system: its architecture, modules, data flow, API, and setup procedure. It is a standalone technical reference and is independent of the project report.

---

## 1. Overview

AssessIQ is a closed-domain Retrieval-Augmented Generation (RAG) system. It ingests enterprise documents, indexes them for semantic search, and—given a job-role prompt—generates interview question–answer pairs that are grounded strictly in the uploaded documents. Each question is automatically classified as **Knowledge-Based** or **Skill-Based**, every answer is traceable to its source chunk, and out-of-scope prompts are rejected rather than answered. All processing stays on the host infrastructure.

The system is split into a **Python backend** (ingestion + RAG pipeline + REST API) and a **React frontend** (the web interface). They communicate over a camelCase JSON REST contract.

---

## 2. System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                        │
│  Login → Dashboard · Documents · Generate · Results · Admin            │
│  AuthContext (token)   AppContext (documents, qaSets)                  │
│                         api/client.js                                  │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  REST / JSON  (Bearer token)
┌───────────────────────────────▼──────────────────────────────────────┐
│                        BACKEND (FastAPI)                               │
│  api/main.py  ── routes ──  api/auth.py (accounts, tokens, roles)      │
│                              api/store.py (JSON-backed state)          │
│                                    │                                   │
│   ┌──────────────── rag/pipeline.py (orchestration) ───────────────┐  │
│   │  INGEST:  text_extractor → ingest(clean+chunk) → embeddings →   │  │
│   │           vector_store (FAISS index)                            │  │
│   │  GENERATE: retriever(top-k) → generator(LLM) → classifier →     │  │
│   │            answerability + grounding + source attribution       │  │
│   └─────────────────────────────────────────────────────────────────┘ │
│   Providers: OpenAI | Ollama | Offline      Embeddings: S-Transformers │
│                                              | hashing fallback        │
└────────────────────────────────────────────────────────────────────────┘
```

### Data flow

**Ingestion (on upload):** file → `text_extractor` (parse/OCR) → `ingest.clean_text` + `chunk_text` (overlapping chunks) → `embeddings` (dense vectors) → `vector_store` (FAISS index, persisted).

**Generation (on prompt):** job-role prompt → embed → `retriever` top-k chunks → `generator` (LLM, grounded) → per-question `classifier` (Knowledge/Skill) → grounding confidence + answerability gate + source chunk → `QASet`.

---

## 3. Module breakdown

### Backend (`backend/`)

| Path | Responsibility |
|------|----------------|
| `text_extractor/extractors.py` | Parse PDF/DOCX/TXT/PPTX/MD/images; OCR for scans *(from original repo)* |
| `ingest.py` | Clean text, structural chunking with overlap *(from original repo)* |
| `rag/config.py` | Environment-driven settings (models, provider, retrieval, auth) |
| `rag/embeddings.py` | Sentence-Transformers embeddings + hashing fallback (L2-normalised) |
| `rag/vector_store.py` | FAISS `IndexFlatIP` + numpy-cosine fallback; persistence |
| `rag/retriever.py` | Top-k dense passage retrieval |
| `rag/generator.py` | Pluggable LLM providers: OpenAI / Ollama / Offline; strict grounding |
| `rag/classifier.py` | Knowledge-vs-Skill via semantic similarity + lexical cues |
| `rag/pipeline.py` | Orchestration: ingest; single- and two-round generation |
| `api/main.py` | FastAPI app and all routes |
| `api/schemas.py` | camelCase Pydantic request/response models |
| `api/store.py` | JSON-backed state (documents, Q&A sets, params) + vector index |
| `api/auth.py` | Accounts, password hashing, signed tokens, role dependencies |

### Frontend (`frontend/src/`)

| Path | Responsibility |
|------|----------------|
| `api/client.js` | Single backend integration point (mock + HTTP, token handling) |
| `api/mockData.js` | Demo documents, Q&A sets, and users for mock mode |
| `context/AuthContext.jsx` | Session/token state, login/register/logout |
| `context/AppContext.jsx` | Documents + Q&A sets state, actions, ingestion polling |
| `components/Layout.jsx` | Sidebar nav, user card, role-gated Admin link |
| `components/QuestionCard.jsx` | Expandable question with sources + rating controls |
| `components/ui.jsx` | Shared primitives (Card, Button, badges, confidence bar) |
| `pages/Login.jsx` | Sign-in / register (demo quick-login in mock mode) |
| `pages/Dashboard.jsx` | Stats, Knowledge/Skill split, recent sets |
| `pages/Documents.jsx` | Upload + library with ingestion status |
| `pages/Generate.jsx` | Prompt, top-k, two-round toggle, document selection |
| `pages/Results.jsx` | Browse/filter/search, rate, delete, export JSON/CSV |
| `pages/Admin.jsx` | User list + tunable system parameters (admin only) |

---

## 4. REST API

Base URL `http://localhost:8000`. Responses are camelCase. Bearer token via `Authorization: Bearer <token>`.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/api/documents` | — | `Document[]` |
| `POST` | `/api/documents` | multipart `file` | `Document` (ingested) |
| `DELETE` | `/api/documents/{id}` | — | `204` |
| `GET` | `/api/qa-sets` | — | `QASet[]` |
| `POST` | `/api/generate` | `{ jobRole, prompt, topK, documentIds, twoRound }` | `QASet` |
| `DELETE` | `/api/qa-sets/{id}` | — | `204` |
| `PATCH` | `/api/qa-sets/{setId}/questions/{questionId}/rating` | `{ rating }` | `Question` |
| `GET` | `/api/stats` | — | `Stats` |
| `GET` | `/api/health` | — | runtime diagnostics |
| `POST` | `/api/auth/register` | `{ username, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | `{ username, password }` | `{ token, user }` |
| `GET` | `/api/auth/me` | — | `User` |
| `GET` | `/api/admin/users` | — (admin) | `User[]` |
| `GET` / `PUT` | `/api/admin/params` | system params | system params |

### Core data models

```jsonc
Document  { id, name, ext, sizeBytes, status, pages, chunks, uploadedAt, excerpt }
            // status: uploaded | extracting | chunking | indexed | failed

QASet     { id, jobRole, prompt, topK, twoRound, createdAt, documentIds, questions[] }

Question  { id, question, answer,
            type,         // "knowledge" | "skill"
            confidence,   // grounding score 0..1
            answerable,   // false => out-of-scope, flagged not hallucinated
            rating,       // 1 (up) | -1 (down) | null
            sources: [ { docId, docName, chunkId, snippet } ] }

User      { username, role }   // role: recruiter | admin
```

---

## 5. RAG pipeline details

- **Embeddings.** Sentence-Transformers `all-MiniLM-L6-v2` produces L2-normalised vectors; if unavailable, a deterministic hashing embedder is used so the system still runs.
- **Vector search.** FAISS `IndexFlatIP` (inner product = cosine on normalised vectors); falls back to numpy cosine. Both are exact nearest-neighbour.
- **Generation providers.** A shared interface lets the LLM be swapped without touching the pipeline: **OpenAI** (default; OpenAI-compatible too), **Ollama** (local open-source, privacy-preserving), **Offline** (extractive, no LLM, always available).
- **Two-round mode.** When enabled, a Knowledge round and a Skill round each retrieve their *own* context (category-augmented query) and generate only that category; results are combined.
- **Grounding & answerability.** A retrieval gate rejects prompts whose best chunk similarity is below a threshold. Each answer is matched back to its most similar retrieved chunk—that similarity is the displayed confidence and the cited source; weakly grounded answers are marked not answerable.

---

## 6. Setup

Prerequisites: **Python 3.10+** and **Node.js 18+**.

### Backend (terminal 1)

From the project root (the folder containing `backend/`):

```bash
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env # optional; set OPENAI_API_KEY for best results
uvicorn backend.api.main:app --reload --port 8000
```

- API docs (Swagger): `http://localhost:8000/docs`
- Diagnostics: `http://localhost:8000/api/health` (shows active embedder, vector store, LLM provider)

> Runs with zero config: without `sentence-transformers`/`faiss` it uses the fallbacks; without an `OPENAI_API_KEY` the OpenAI provider degrades to the offline generator. So the server always starts; install the extras for full quality. First run with `sentence-transformers` downloads the embedding model (~80 MB) once.

### Frontend (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env                 # set VITE_API_MODE=real to use the backend
npm run dev                          # http://localhost:5173
```

Leave `VITE_API_MODE=mock` (default) to run the UI standalone on demo data, with no backend.

### Sign-in

The app requires login. In mock mode use the demo quick-login (Recruiter or Admin). With the real backend, a seed admin `admin` / `admin123` is created on first run — change it via `backend/.env` (`ASSESSIQ_ADMIN_USER` / `ASSESSIQ_ADMIN_PASSWORD`).

---

## 7. Configuration (`backend/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `ASSESSIQ_LLM_PROVIDER` | `openai` | `openai` \| `ollama` \| `offline` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | — / `gpt-4o-mini` | OpenAI provider |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | `localhost:11434` / `llama3` | Ollama provider |
| `ASSESSIQ_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Embedding model |
| `ASSESSIQ_TOP_K` | `6` | Default retrieval depth |
| `ASSESSIQ_QUESTIONS_PER_SET` | `6` | Questions per generation |
| `ASSESSIQ_ANSWERABILITY_THRESHOLD` | `0.18` | Out-of-scope gate |
| `ASSESSIQ_REQUIRE_AUTH` | `false` | Require token on core routes |
| `ASSESSIQ_SECRET` | dev value | Token signing secret (set in production) |
| `ASSESSIQ_DATA_DIR` | `backend/.assessiq_data` | Persistence directory |

---

## 8. Technology stack

Python 3.10+ · FastAPI · Uvicorn · Pydantic v2 · PyMuPDF / pdfminer / python-docx / python-pptx · Tesseract / easyOCR · Sentence-Transformers · FAISS · OpenAI / Ollama · React 18 · Vite · Tailwind CSS · React Router · lucide-react.
