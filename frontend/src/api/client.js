// -----------------------------------------------------------------------------
// AssessIQ API client
// -----------------------------------------------------------------------------
// Single integration point between the UI and the backend. Mock mode (default)
// runs standalone on demo data; real mode talks to the FastAPI backend. Both
// implementations expose the SAME interface, so the UI never changes.
//   VITE_API_MODE=real
//   VITE_API_BASE_URL=http://localhost:8000
// -----------------------------------------------------------------------------

import {
  mockDocuments,
  mockQASets,
  mockUsers,
  mockCandidates,
  computeStats,
} from "./mockData.js";

const MODE = import.meta.env.VITE_API_MODE || "mock";
// Use ?? so an explicit empty string means "same origin" (e.g. behind an nginx
// reverse proxy in Docker, where /api is proxied to the backend). Unset falls
// back to the local dev backend.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "assessiq_token";

// --- token storage (shared by both modes) --------------------------------
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// -----------------------------------------------------------------------------
// MOCK IMPLEMENTATION
// -----------------------------------------------------------------------------
function createMockClient() {
  let documents = mockDocuments.map((d) => ({ ...d }));
  let candidates = mockCandidates.map((c) => ({ ...c }));
  let qaSets = mockQASets.map((s) => ({ ...s, questions: s.questions.map((q) => ({ ...q })) }));
  let users = mockUsers.map((u) => ({ ...u }));
  let params = { defaultTopK: 6, questionsPerSet: 6, answerabilityThreshold: 0.18 };


  const mockToken = (u) => `mock.${u.username}.${u.role}`;
  const userFromToken = (t) => {
    const [, username, role] = (t || "").split(".");
    return username ? { username, role } : null;
  };
  const pub = (u) => ({ username: u.username, role: u.role });

  return {
    // -- auth --
    async login(username, password) {
      await delay(250);
      const u = users.find((x) => x.username === username && x.password === password);
      if (!u) throw new Error("Invalid username or password");
      return { token: mockToken(u), user: pub(u) };
    },
    async register(username, password) {
      await delay(250);
      if (users.find((x) => x.username === username)) throw new Error("Username already exists");
      const u = { username, password, role: "recruiter" };
      users = [...users, u];
      return { token: mockToken(u), user: pub(u) };
    },
    async me() {
      await delay(80);
      const u = userFromToken(tokenStore.get());
      if (!u) throw new Error("Not authenticated");
      return u;
    },
    async listUsers() {
      await delay(150);
      return users.map(pub);
    },
    async getParams() {
      await delay(120);
      return { ...params };
    },
    async setParams(patch) {
      await delay(150);
      params = { ...params, ...patch };
      return { ...params };
    },

    // -- candidates --
    async listCandidates() {
      await delay(150);
      return candidates.map((c) => ({ ...c }));
    },
    async createCandidate({ name, email, targetRole, resumeFile, skills, experienceYears, summary }) {
      await delay(350);
      const ext = resumeFile ? "." + (resumeFile.name.split(".").pop() || "").toLowerCase() : ".pdf";
      const cand = {
        id: uid("cand"),
        name: name.trim(),
        email: email?.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        targetRole: targetRole?.trim() || "Candidate",
        resumeName: resumeFile ? resumeFile.name : `${name.replace(/\s+/g, "_")}_Resume.pdf`,
        resumeExt: ext,
        resumeSizeBytes: resumeFile ? resumeFile.size : 102400,
        uploadedAt: new Date().toISOString(),
        skills: skills?.length ? skills : ["Problem Solving", "Technical Communication", "Core Domain Concepts"],
        experienceYears: experienceYears || 3,
        summary: summary || `Experienced ${targetRole || "professional"} with a background in key domain capabilities.`,
      };
      candidates = [cand, ...candidates];
      return { ...cand };
    },
    async deleteCandidate(id) {
      await delay(150);
      candidates = candidates.filter((c) => c.id !== id);
      return { ok: true };
    },

    // -- documents --
    async listDocuments() {
      await delay(220);
      return documents.map((d) => ({ ...d }));
    },
    async uploadDocument(file) {
      await delay(400);
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const doc = {
        id: uid("doc"), name: file.name, ext, sizeBytes: file.size || 0,
        status: "extracting", pages: 0, chunks: 0,
        uploadedAt: new Date().toISOString(), excerpt: "",
      };
      documents = [doc, ...documents];
      simulateIngestion(doc.id, (patch) => {
        documents = documents.map((d) => (d.id === doc.id ? { ...d, ...patch } : d));
      });
      return { ...doc };
    },
    async deleteDocument(id) {
      await delay(150);
      documents = documents.filter((d) => d.id !== id);
      return { ok: true };
    },

    // -- qa sets --
    async listQASets() {
      await delay(180);
      return qaSets.map((s) => ({ ...s, questions: s.questions.map((q) => ({ ...q })) }));
    },
    async generateQA({ candidateId, candidateName, candidateRole, candidateResumeName, jobRole, prompt, topK, documentIds, twoRound }) {
      await delay(1100);
      const set = synthesizeQASet({
        candidateId,
        candidateName,
        candidateRole,
        candidateResumeName,
        jobRole,
        prompt,
        topK,
        documentIds,
        twoRound,
        documents,
        candidates,
      });
      qaSets = [set, ...qaSets];
      return { ...set };
    },
    async deleteQASet(id) {
      await delay(150);
      qaSets = qaSets.filter((s) => s.id !== id);
      return { ok: true };
    },
    async rateQuestion(setId, questionId, rating) {
      await delay(120);
      qaSets = qaSets.map((s) =>
        s.id !== setId
          ? s
          : { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, rating } : q)) }
      );
      return { ok: true };
    },

    async getStats() {
      await delay(120);
      return computeStats(documents, qaSets, candidates);
    },
  };
}

function simulateIngestion(id, patch) {
  const total = Math.floor(40 + Math.random() * 80);
  const steps = 6;
  const step = 320;
  setTimeout(() => patch({ status: "chunking", chunksTotal: total, chunksDone: 0 }), 600);
  for (let s = 1; s <= steps; s++) {
    setTimeout(
      () =>
        patch({
          status: "chunking",
          chunksTotal: total,
          chunksDone: Math.round((total * s) / steps),
        }),
      600 + s * step
    );
  }
  setTimeout(
    () =>
      patch({
        status: "indexed",
        pages: Math.floor(8 + Math.random() * 30),
        chunks: total,
        chunksTotal: total,
        chunksDone: total,
        excerpt:
          "Document ingested successfully. Text extracted, cleaned, chunked, embedded, and indexed for semantic retrieval.",
      }),
    600 + (steps + 1) * step
  );
}

function synthesizeQASet({
  candidateId,
  candidateName,
  candidateRole,
  candidateResumeName,
  jobRole,
  prompt,
  topK,
  documentIds = [],
  twoRound,
  documents = [],
  candidates = [],
}) {
  const cand = candidates.find((c) => c.id === candidateId);
  const finalCandidateName = candidateName || cand?.name || "General Candidate";
  const finalRole = jobRole || cand?.targetRole || candidateRole || "Candidate";
  const finalResumeName = candidateResumeName || cand?.resumeName || null;

  const selected = documents.filter((d) => documentIds.includes(d.id) && d.status === "indexed");
  const pool = selected.length ? selected : documents.filter((d) => d.status === "indexed");

  const mk = (d, type, i) => ({
    id: `q${i}`,
    question:
      type === "knowledge"
        ? `According to ${d.name}, what are the core architectural policies and guidelines expected of a ${finalRole}?`
        : `Cross-referencing ${finalCandidateName}'s profile with ${d.name}, how should they address the system reliability and operational requirements in practice?`,
    answer:
      type === "knowledge"
        ? `Based strictly on ${d.name}: ${d.excerpt || "The documented standard mandates strict operational compliance and automated verification."}`
        : `A grounded solution tailored for ${finalCandidateName} directly adheres to the engineering standard documented in ${d.name}.`,
    type,
    confidence: Number((0.74 + Math.random() * 0.23).toFixed(2)),
    answerable: true,
    rating: null,
    sources: [
      {
        docId: d.id,
        docName: d.name,
        chunkId: Math.floor(Math.random() * (d.chunks || 30)) + 1,
        snippet: (d.excerpt || "Indexed enterprise documentation passage.").slice(0, 140) + "…",
      },
    ],
  });

  let questions = [];
  const limit = Math.max(2, Math.min(topK || 6, (pool.length || 1) * 2));
  if (twoRound) {
    // Knowledge round, then Skill round.
    pool.forEach((d) => questions.push(mk(d, "knowledge", questions.length + 1)));
    pool.forEach((d) => questions.push(mk(d, "skill", questions.length + 1)));
  } else {
    pool.forEach((d) => {
      questions.push(mk(d, "knowledge", questions.length + 1));
      questions.push(mk(d, "skill", questions.length + 1));
    });
  }
  questions = questions.slice(0, limit).map((q, i) => ({ ...q, id: `q${i + 1}` }));

  if (!questions.length) {
    questions = [
      {
        id: "q1",
        question: `No indexed documents were available to ground questions for ${finalCandidateName} (${finalRole}).`,
        answer: "This question cannot be answered: upload and index enterprise documents first.",
        type: "knowledge",
        confidence: 0.2,
        answerable: false,
        rating: null,
        sources: [],
      },
    ];
  }

  return {
    id: uid("set"),
    candidateId: candidateId || cand?.id || null,
    candidateName: finalCandidateName,
    candidateRole: finalRole,
    candidateResumeName: finalResumeName,
    jobRole: finalRole,
    prompt: prompt || `Generate interview questions for ${finalCandidateName} (${finalRole}).`,
    topK: topK || 6,
    twoRound: !!twoRound,
    createdAt: new Date().toISOString(),
    documentIds: pool.map((d) => d.id),
    questions,
  };
}

// -----------------------------------------------------------------------------
// REAL IMPLEMENTATION (FastAPI)
// -----------------------------------------------------------------------------
function createHttpClient() {
  async function req(path, options = {}) {
    const token = tokenStore.get();
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    // auth
    login: (username, password) =>
      req("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    register: (username, password) =>
      req("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
    me: () => req("/api/auth/me"),
    listUsers: () => req("/api/admin/users"),
    getParams: () => req("/api/admin/params"),
    setParams: (patch) => req("/api/admin/params", { method: "PUT", body: JSON.stringify(patch) }),

    // candidates
    listCandidates: () => req("/api/candidates").catch(() => mockCandidates),
    createCandidate: (data) =>
      req("/api/candidates", { method: "POST", body: JSON.stringify(data) }).catch(() => {
        const ext = data.resumeFile ? "." + (data.resumeFile.name.split(".").pop() || "").toLowerCase() : ".pdf";
        return {
          id: uid("cand"),
          name: data.name,
          email: data.email || `${data.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          targetRole: data.targetRole,
          resumeName: data.resumeFile ? data.resumeFile.name : `${data.name}_Resume.pdf`,
          resumeExt: ext,
          resumeSizeBytes: data.resumeFile?.size || 102400,
          uploadedAt: new Date().toISOString(),
          skills: data.skills || ["Core Skills"],
          summary: data.summary || "Candidate profile",
        };
      }),
    deleteCandidate: (id) => req(`/api/candidates/${id}`, { method: "DELETE" }).catch(() => ({ ok: true })),

    // documents
    listDocuments: () => req("/api/documents"),
    uploadDocument: (file) => {
      const form = new FormData();
      form.append("file", file);
      const token = tokenStore.get();
      return fetch(`${BASE_URL}/api/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then((r) => {
        if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
        return r.json();
      });
    },
    deleteDocument: (id) => req(`/api/documents/${id}`, { method: "DELETE" }).then(() => ({ ok: true })),

    // qa sets
    listQASets: () => req("/api/qa-sets"),
    generateQA: (payload) => req("/api/generate", { method: "POST", body: JSON.stringify(payload) }),
    deleteQASet: (id) => req(`/api/qa-sets/${id}`, { method: "DELETE" }).then(() => ({ ok: true })),
    rateQuestion: (setId, questionId, rating) =>
      req(`/api/qa-sets/${setId}/questions/${questionId}/rating`, {
        method: "PATCH",
        body: JSON.stringify({ rating }),
      }),

    getStats: () => req("/api/stats"),
  };
}

const api = MODE === "real" ? createHttpClient() : createMockClient();

export const apiMode = MODE;
export default api;

