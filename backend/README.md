# AssessIQ — Backend

Python backend for **AssessIQ** (*Intelligent System for Job-Specific QA Generation*). It ingests enterprise documents, indexes them for semantic retrieval, and runs a **Retrieval-Augmented Generation (RAG)** pipeline that produces interview question–answer pairs grounded only in those documents — each auto-classified **Knowledge-Based** or **Skill-Based**, with out-of-scope prompts rejected rather than hallucinated.

It extends the original repo's ingestion code (`text_extractor/` + `ingest.py`) with the embedding, retrieval, generation, classification, and API layers, and serves the exact REST contract the React frontend expects.

## Architecture

```
                upload                          prompt
                  │                               │
          ┌───────▼────────┐              ┌───────▼────────┐
          │ text_extractor │              │   Retriever    │  top-k dense search
          │  (parse + OCR) │              │  (FAISS/numpy) │
          └───────┬────────┘              └───────┬────────┘
                  │ raw text                       │ context chunks
          ┌───────▼────────┐              ┌───────▼────────┐
          │   ingest.py    │              │   Generator    │  OpenAI / Ollama / offline
          │ clean + chunk  │              │ (grounded LLM) │  → grounded Q&A
          └───────┬────────┘              └───────┬────────┘
                  │ chunks                         │ raw Q&A
          ┌───────▼────────┐              ┌───────▼────────┐
          │   Embeddings   │── vectors ──▶│  Classifier +  │  Knowledge/Skill tag,
          │ (S-Transformers│   FAISS idx  │ answerability  │  grounding confidence,
          │   / hashing)   │              │  + sources     │  source attribution
          └────────────────┘              └───────┬────────┘
                                                  │
                                          FastAPI │ /api/*  ──▶  React frontend
```

### Modules

| File | Role |
|------|------|
| `text_extractor/` | *(existing)* parse PDF/DOCX/TXT/PPTX/MD/images, with OCR |
| `ingest.py` | *(existing)* clean text + overlapping chunking |
| `rag/embeddings.py` | Sentence-Transformers embeddings, hashing fallback |
| `rag/vector_store.py` | FAISS `IndexFlatIP` with numpy-cosine fallback + persistence |
| `rag/retriever.py` | top-k dense passage retrieval |
| `rag/generator.py` | pluggable LLM providers: OpenAI / Ollama / offline |
| `rag/classifier.py` | Knowledge-vs-Skill via semantic similarity + lexical cues |
| `rag/pipeline.py` | orchestration: ingest, and retrieve→generate→classify→ground |
| `api/main.py` | FastAPI app — the six endpoints |
| `api/schemas.py` | camelCase Pydantic models matching the frontend |
| `api/store.py` | JSON-backed state (documents, Q&A sets) + the vector index |

## Setup

From the **project root** (the folder containing `backend/`):

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

Configure (optional — sensible defaults apply):

```bash
cp backend/.env.example backend/.env
# edit backend/.env — at minimum set OPENAI_API_KEY to use the OpenAI provider
```

> **Runs with zero config.** If `sentence-transformers`/`faiss` aren't installed, it uses a lightweight hashing embedder + numpy search. If the OpenAI provider has no API key, it falls back to the offline extractive generator. So the server always starts; install the extras for full quality.

## Run

```bash
uvicorn backend.api.main:app --reload --port 8000
```

- API root: `http://localhost:8000`
- Interactive docs (Swagger): `http://localhost:8000/docs`
- Health/diagnostics: `http://localhost:8000/api/health` — shows which embedder, vector store, and LLM provider are active.

Then start the frontend with `VITE_API_MODE=real` (see `frontend/README.md`) and the UI is live against this backend.

## API

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/api/documents` | — | `Document[]` |
| `POST` | `/api/documents` | `multipart/form-data` field `file` | `Document` (ingested + indexed) |
| `DELETE` | `/api/documents/{id}` | — | `204` |
| `GET` | `/api/qa-sets` | — | `QASet[]` |
| `POST` | `/api/generate` | `{ jobRole, prompt, topK, documentIds, twoRound }` | `QASet` |
| `DELETE` | `/api/qa-sets/{id}` | — | `204` |
| `PATCH` | `/api/qa-sets/{setId}/questions/{questionId}/rating` | `{ rating }` (`1`/`-1`/`null`) | `Question` |
| `GET` | `/api/stats` | — | `Stats` |
| `GET` | `/api/health` | — | runtime diagnostics |
| `POST` | `/api/auth/register` | `{ username, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | `{ username, password }` | `{ token, user }` |
| `GET` | `/api/auth/me` | — (Bearer token) | `User` |
| `GET` | `/api/admin/users` | — (admin token) | `User[]` |
| `GET` / `PUT` | `/api/admin/params` | system params | system params |

Responses are camelCase and match `frontend/src/api/mockData.js` exactly, so flipping the frontend from mock to real needs no code changes.

### Accounts & roles

Two roles — **recruiter** (default) and **admin**. Passwords are PBKDF2-hashed; bearer tokens are HMAC-signed. A seed admin (`admin` / `admin123` by default — change it) is created on first run. Core routes allow anonymous access while `ASSESSIQ_REQUIRE_AUTH=false` (frictionless demo); set it `true` to require a token. Admin routes always require an admin token.

### Two-round generation

`POST /api/generate` with `"twoRound": true` runs the report's sequence-diagram flow: a **Knowledge** round and a **Skill** round, each with its *own* retrieval context, then combined. Default (`false`) is a single mixed round.

## LLM providers

Set `ASSESSIQ_LLM_PROVIDER` in `.env`:

- **`openai`** *(default)* — OpenAI or any OpenAI-compatible endpoint. Set `OPENAI_API_KEY`, optionally `OPENAI_MODEL` / `OPENAI_BASE_URL`.
- **`ollama`** — local open-source models (privacy-preserving). Set `OLLAMA_HOST` / `OLLAMA_MODEL`; requires a running Ollama with the model pulled.
- **`offline`** — no LLM; extractive question/answer generation straight from retrieved chunks. Always available, fully local, good for demos.

All providers ground answers strictly in retrieved context and flag unanswerable items.

## How grounding & answerability work

- **Retrieval gate:** if the best chunk similarity for a prompt is below `ASSESSIQ_ANSWERABILITY_THRESHOLD`, the prompt is returned as *out-of-scope* instead of generating answers.
- **Per-answer grounding:** each generated answer is matched back to its most similar retrieved chunk; that similarity becomes the displayed **confidence**, and the chunk becomes the cited **source**. Answers that don't ground well are marked not answerable.

## Tested

All endpoints were verified end-to-end on the fallback path (hashing embedder + numpy search + offline generator): upload→ingest→index, grounded generation with correct Knowledge/Skill split and source attribution, out-of-scope rejection, stats, and delete.
