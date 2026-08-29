# AssessIQ — Frontend

React frontend for **AssessIQ** (*Intelligent System for Job-Specific QA Generation*) — a closed-domain Retrieval-Augmented Generation system that turns enterprise documents into job-specific interview questions, each auto-classified as **Knowledge-Based** or **Skill-Based**, with answers grounded in (and traceable to) the source documents.

This is the UI layer. It pairs with the Python ingestion/RAG backend in the [`backend/`](https://github.com/aryankr116/assessIQ) directory of the main repo.

## Stack

- **Vite** + **React 18** (JavaScript)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **lucide-react** for icons

## Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | **Dashboard** | Overview, ingestion stats, Knowledge/Skill split, recent question sets |
| `/documents` | **Document Library** | Drag-and-drop upload, ingestion status (extract → chunk → index), chunk counts |
| `/generate` | **Generate Q&A** | Job-role prompt, top-k depth, **two-round toggle**, document selection, grounded results |
| `/results` | **Results & Export** | Browse sets, filter, search, **rate questions**, **delete sets**, export JSON / CSV |
| `/admin` | **Admin** *(admin role only)* | View user accounts, tune system parameters |

Login is required (`/login` flow). In mock mode use the demo quick-login (Recruiter or Admin); in real mode it authenticates against the backend. Two roles: **recruiter** and **admin** (admin sees the Admin screen).

## Getting started

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview
```

## Mock mode vs. live backend

The app ships in **mock mode** — it runs standalone with realistic in-memory demo data, so you can develop and demo the UI before the QA-generation API exists.

All backend communication is isolated in a single file: **`src/api/client.js`**. It exposes one interface with two implementations (`createMockClient` and `createHttpClient`). Switching is config-only — no UI changes:

```bash
# frontend/.env  (copy from .env.example)
VITE_API_MODE=real
VITE_API_BASE_URL=http://localhost:8000
```

### Endpoints the live backend must provide

The HTTP client expects these endpoints; response shapes should match the objects in `src/api/mockData.js`.

| Method | Path | Returns | Notes |
|--------|------|---------|-------|
| `GET` | `/api/documents` | `Document[]` | Library listing |
| `POST` | `/api/documents` | `Document` | `multipart/form-data`, field `file` |
| `DELETE` | `/api/documents/:id` | `204` | Remove a document |
| `GET` | `/api/qa-sets` | `QASet[]` | Past generations |
| `POST` | `/api/generate` | `QASet` | Body: `{ jobRole, prompt, topK, documentIds }` |
| `GET` | `/api/stats` | `Stats` | Dashboard aggregates |

A Vite dev proxy for `/api` is pre-wired (commented) in `vite.config.js`.

### Core data shapes

```jsonc
// Document
{
  "id": "doc_...", "name": "Handbook.pdf", "ext": ".pdf",
  "sizeBytes": 1842311, "status": "indexed",   // uploaded|extracting|chunking|indexed|failed
  "pages": 42, "chunks": 128, "uploadedAt": "ISO", "excerpt": "…"
}

// QASet
{
  "id": "set_...", "jobRole": "Senior Backend Engineer",
  "prompt": "…", "topK": 6, "createdAt": "ISO",
  "documentIds": ["doc_..."],
  "questions": [{
    "id": "q1", "question": "…", "answer": "…",
    "type": "knowledge",        // "knowledge" | "skill"
    "confidence": 0.93,
    "answerable": true,          // false => out-of-scope, rejected not hallucinated
    "sources": [{ "docId": "doc_...", "docName": "Handbook.pdf",
                  "chunkId": 47, "snippet": "…" }]
  }]
}
```

## Project structure

```
frontend/
├── index.html
├── src/
│   ├── api/
│   │   ├── client.js      # ← single backend integration point (mock + HTTP)
│   │   └── mockData.js    # demo documents and Q&A sets
│   ├── components/        # Layout, QuestionCard, UI primitives
│   ├── context/           # AppContext: global docs/qaSets state + polling
│   ├── lib/               # formatting + JSON/CSV export helpers
│   ├── pages/             # Dashboard, Documents, Generate, Results
│   └── main.jsx
└── tailwind.config.js
```

## Notes

- **Privacy by design:** the UI reinforces the closed-domain model — answers are grounded only in uploaded files, and out-of-scope prompts are flagged rather than answered.
- The mock client simulates the ingestion pipeline advancing through *extracting → chunking → indexed* over a few seconds, and `AppContext` polls while any document is still processing.
- To wire the real pipeline, implement the endpoints above on your FastAPI backend and flip `VITE_API_MODE=real`.
