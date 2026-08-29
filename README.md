# AssessIQ

**Intelligent System for Job-Specific QA Generation** — a closed-domain Retrieval-Augmented Generation (RAG) system that turns enterprise documents into job-specific interview questions, each auto-classified **Knowledge-Based** or **Skill-Based**, with every answer grounded in (and traceable to) the source documents. Out-of-scope prompts are rejected rather than hallucinated, and all processing stays on your infrastructure.

## Repository layout

```
AssessIQ2/
├── backend/      # Python: ingestion + RAG pipeline + FastAPI API
│   ├── text_extractor/   parse PDF/DOCX/TXT/PPTX/MD/images (+ OCR)
│   ├── ingest.py         clean + chunk
│   ├── rag/              embeddings, FAISS retrieval, generation, classifier
│   └── api/              FastAPI app (six endpoints)
└── frontend/     # React + Vite + Tailwind UI
    └── src/              dashboard, documents, generate, results
```

See `backend/README.md` and `frontend/README.md` for full details.

## Quick start

### 1. Backend (terminal 1)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env      # set OPENAI_API_KEY for best results
uvicorn backend.api.main:app --reload --port 8000
```

Runs with zero config even without the heavy ML deps or an API key (lightweight fallbacks). Visit `http://localhost:8000/api/health` to see what's active.

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env
# in .env set:  VITE_API_MODE=real
npm run dev
```

Open `http://localhost:5173`. Upload documents, enter a job-role prompt, and generate grounded, classified Q&A.

> Leave `VITE_API_MODE=mock` (or skip the backend entirely) to run the UI standalone on built-in demo data.

## How it works

1. **Ingest** — documents are parsed, cleaned, and split into overlapping chunks.
2. **Index** — chunks are embedded (Sentence-Transformers) and stored in a FAISS index.
3. **Retrieve** — a job-role prompt fetches the top-k most relevant chunks.
4. **Generate** — an LLM (OpenAI / Ollama / offline) writes Q&A grounded strictly in those chunks.
5. **Classify & verify** — each question is tagged Knowledge/Skill, scored for grounding confidence, linked to its source chunk, and out-of-scope prompts are flagged.

## Status

- ✅ Document ingestion (parse → clean → chunk) — *from the original repo*
- ✅ Embeddings + FAISS retrieval (with lightweight fallback)
- ✅ RAG generation — pluggable OpenAI / Ollama / offline providers
- ✅ Knowledge/Skill classifier + answerability detection
- ✅ **Two-round generation** (Knowledge then Skill, separate retrieval) — matches sequence diagram
- ✅ FastAPI API layer (tested end-to-end)
- ✅ React frontend (five screens, mock + live modes)
- ✅ **Accounts & roles** — Recruiter / Admin, hashed passwords, signed tokens
- ✅ **Q&A rating** + **delete question sets** (recruiter use-cases)
- ✅ **Admin screen** — user list + tunable system parameters

> **Login:** the app requires sign-in. In mock mode, use the demo quick-login buttons (Recruiter or Admin). With the real backend, the seed admin is `admin` / `admin123` (change it via `backend/.env`).
