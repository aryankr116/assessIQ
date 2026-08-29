# Deploying AssessIQ

Two ways to deploy:

- **Docker** — runs the *full system* (backend + frontend) on any machine with one command. Best for a real, self-contained deployment.
- **Static (mock) hosting** — puts just the frontend online for free, on built-in demo data. Best for a quick public showcase.

---

# Part 1 — Docker (full system)

Runs the FastAPI backend and the React frontend as containers. The frontend (nginx)
serves the UI and reverse-proxies `/api` to the backend, so it's all one origin — no CORS.

### Prerequisite

Install **Docker Desktop** (docker.com/products/docker-desktop) and make sure it's running:

```bash
docker --version
```

### Option 1 — Full stack with one command (recommended)

From the project root:

```bash
docker compose up --build
```

Open **http://localhost:8080**. Log in with the demo accounts or `admin` / `admin123`,
upload a document, and generate. Stored data persists in a Docker volume.

- Stop it: press **Ctrl+C**, then `docker compose down` (add `-v` to also delete stored data).
- **LLM quality:** by default the backend uses the offline generator. For OpenAI-quality
  questions, create a `.env` file next to `docker-compose.yml` containing
  `ASSESSIQ_LLM_PROVIDER=openai` and `OPENAI_API_KEY=sk-...`, then re-run `docker compose up --build`.
- **Real embeddings (Sentence-Transformers + FAISS):** in `docker-compose.yml` set
  `INSTALL_ML: "true"` under the backend build args, then rebuild. The image gets much
  larger and the first build is slower, but retrieval quality improves. (Default uses the
  lightweight fallback so the image stays small and always works.)

### Option 2 — Mock frontend only (single container, no backend)

```bash
docker build -t assessiq-frontend ./frontend
docker run --rm -p 8080:80 assessiq-frontend
```

Open **http://localhost:8080** — the standalone demo on built-in data.

### Option 3 — Backend image only

```bash
docker build -f backend/Dockerfile -t assessiq-backend .
docker run --rm -p 8000:8000 -v assessiq_data:/data assessiq-backend
```

API + Swagger docs at **http://localhost:8000/docs**.

### Deploying the containers to a server

Any host that runs Docker works (a cloud VM, Render, Railway, Fly.io, etc.). Typically you
either run `docker compose up -d --build` on the server, or build and push the images to a
registry (Docker Hub / GitHub Container Registry) and pull them on the host. Put the server
behind HTTPS (a reverse proxy like Caddy/Traefik, or the platform's built-in TLS) and set a
strong `ASSESSIQ_SECRET` and `ASSESSIQ_REQUIRE_AUTH=true` for a real deployment.

---

# Part 2 — Static (mock) hosting (free, frontend only)

This deploys **only the frontend**, running on built-in demo data (`VITE_API_MODE=mock`).
No backend, no server, no database — a free static website. Each visitor gets their own
in-browser demo (data resets on reload).

> Config already included: `frontend/vercel.json` (Vercel) and `frontend/public/_redirects`
> (Netlify) handle single-page-app routing so deep links and refresh don't 404.

## Prerequisite

Push the project to GitHub first (see the repo's push steps). The hosts below build
directly from your GitHub repo.

---

## Option A — Vercel (recommended)

1. Go to **vercel.com** and sign up with your GitHub account (free).
2. Click **Add New… → Project**, then **Import** the `assessIQ` repository.
3. In the import screen set:
   - **Root Directory:** `frontend`  ← important (the app lives in a subfolder)
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. (Optional) Under **Environment Variables** add `VITE_API_MODE` = `mock`. It's the
   default anyway, so you can skip this.
5. Click **Deploy**. After ~1 minute you get a live URL like
   `https://assessiq-xxxx.vercel.app`.

Every future `git push` to the repo auto-redeploys.

---

## Option B — Netlify

1. Go to **netlify.com**, sign up with GitHub.
2. **Add new site → Import an existing project**, pick the `assessIQ` repo.
3. Set:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Click **Deploy**. You get a URL like `https://assessiq.netlify.app`.

The included `_redirects` file handles SPA routing automatically.

---

## Option C — Vercel CLI (deploy without GitHub)

If you'd rather deploy straight from your machine:

```bash
cd "/Users/parashkashyap/Claude/Projects/AssessIQ2/frontend"
npx vercel        # first run: log in + answer prompts (accept defaults)
npx vercel --prod # publish to the production URL
```

---

## After it's live

- Open the URL, log in with the demo buttons (**Recruiter** or **Admin**), take the tour,
  upload (simulated), generate Q&A, and explore Results/Admin.
- Share the link — anyone can try the full UI with no setup.

## What the mock does NOT do

- No real document processing or RAG — questions are realistic sample data.
- Nothing persists — each visitor's data resets on page reload.
- Logins are demo accounts, not real auth.

## Going from mock → full system (later)

Deploy the FastAPI backend to a Python host (Render / Railway / Fly.io), give it an
`OPENAI_API_KEY`, a real `ASSESSIQ_SECRET`, `ASSESSIQ_REQUIRE_AUTH=true`, and CORS for your
frontend domain. Then set `VITE_API_MODE=real` and `VITE_API_BASE_URL=<backend-url>` in the
frontend host's environment variables and redeploy.
