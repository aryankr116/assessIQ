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
  mockJobProfiles,
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
  let jobProfiles = mockJobProfiles.map((p) => ({ ...p }));
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
    async register(username, password, email) {
      await delay(250);
      if (users.find((x) => x.username === username)) throw new Error("Username already exists");
      const u = { username, password, role: "recruiter", email: email || "" };
      users = [...users, u];
      return { token: mockToken(u), user: pub(u) };
    },
    async googleLogin(credential) {
      await delay(250);
      const u = users.find((x) => x.username === "admin");
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

    // -- job profiles --
    async listJobProfiles() {
      await delay(150);
      return jobProfiles.map((p) => ({ ...p }));
    },
    async createJobProfile({ name }) {
      await delay(250);
      const profile = {
        id: uid("jp"),
        name: name.trim(),
        createdAt: new Date().toISOString(),
      };
      jobProfiles = [profile, ...jobProfiles];
      return { ...profile };
    },
    async deleteJobProfile(id) {
      await delay(150);
      jobProfiles = jobProfiles.filter((p) => p.id !== id);
      documents = documents.filter((d) => d.jobProfileId !== id);
      return { ok: true };
    },

    // -- documents (per profile) --
    async listDocuments(profileId) {
      await delay(220);
      return documents.filter((d) => d.jobProfileId === profileId).map((d) => ({ ...d }));
    },
    async uploadDocument(profileId, file) {
      await delay(400);
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const doc = {
        id: uid("doc"), name: file.name, ext, sizeBytes: file.size || 0,
        status: "extracting", pages: 0, chunks: 0,
        uploadedAt: new Date().toISOString(), excerpt: "",
        jobProfileId: profileId,
      };
      documents = [doc, ...documents];
      simulateIngestion(doc.id, (patch) => {
        documents = documents.map((d) => (d.id === doc.id ? { ...d, ...patch } : d));
      });
      return { ...doc };
    },
    async deleteDocument(profileId, docId) {
      await delay(150);
      documents = documents.filter((d) => d.id !== docId);
      return { ok: true };
    },

    // -- qa sets --
    async listQASets() {
      await delay(180);
      return qaSets.map((s) => ({ ...s, questions: s.questions.map((q) => ({ ...q })) }));
    },
    async generateQA({ jobRole, prompt, topK, numQuestions, documentIds, twoRound, questionType, jobProfileId }) {
      await delay(1100);
      const profileDocs = jobProfileId
        ? documents.filter((d) => d.jobProfileId === jobProfileId)
        : documents;
      const set = synthesizeQASet({
        jobRole,
        prompt,
        topK,
        numQuestions,
        documentIds,
        twoRound,
        questionType,
        documents: profileDocs,
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
      return computeStats(qaSets, jobProfiles);
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
  jobRole,
  prompt,
  topK,
  numQuestions,
  documentIds = [],
  twoRound,
  questionType,
  documents = [],
}) {
  const finalRole = jobRole || "General Role";

  const selected = documents.filter((d) => documentIds.includes(d.id) && d.status === "indexed");
  const pool = selected.length ? selected : documents.filter((d) => d.status === "indexed");

  const extractTopic = (docName, text) => {
    const cleanName = docName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (cleanName.length > 3) return cleanName;
    const snippet = (text || "").replace(/^[#\*\-\d\.\s]+/, "").trim();
    const words = snippet.split(/\s+/).slice(0, 6).join(" ");
    return words || "core system architecture";
  };

  // MCQ question banks — knowledge has fundamentals/understanding, skill has apply/analyse
  const mcqBank = {
    fundamentals: [
      (topic, role) => ({
        question: `Which protocol is primarily used for secure inter-service communication in ${topic}?`,
        options: ["gRPC with TLS", "HTTP plain text", "FTP", "SMTP"],
        correct_option: 0,
        explanation: `gRPC with TLS provides encrypted, efficient binary communication between microservices, making it the standard for secure inter-service communication in ${topic} architectures.`,
      }),
      (topic, role) => ({
        question: `What is the primary purpose of a load balancer in a ${topic} deployment?`,
        options: ["Distribute traffic across instances", "Encrypt database queries", "Compile source code", "Manage Git repositories"],
        correct_option: 0,
        explanation: `Load balancers distribute incoming network traffic across multiple backend instances to ensure high availability, reliability, and prevent any single server from becoming a bottleneck.`,
      }),
      (topic, role) => ({
        question: `Which data structure is most efficient for implementing an LRU cache in ${topic}?`,
        options: ["Hash map + doubly linked list", "Binary search tree", "Array + queue", "Stack"],
        correct_option: 0,
        explanation: `An LRU cache combines a hash map for O(1) lookups with a doubly linked list for O(1) reordering, making it the optimal choice for cache eviction policies.`,
      }),
      (topic, role) => ({
        question: `In ${topic}, what does the term "idempotency" refer to?`,
        options: ["An operation produces the same result when called multiple times", "A system with no downtime", "A database with no locks", "A network with zero latency"],
        correct_option: 0,
        explanation: `Idempotency means that performing an operation multiple times has the same effect as performing it once. This is critical for retry safety in distributed systems.`,
      }),
    ],
    understanding: [
      (topic, role) => ({
        question: `Why does ${topic} use eventual consistency instead of strong consistency for its data replication?`,
        options: [
          "It prioritizes availability and partition tolerance over immediate consistency",
          "Strong consistency is too expensive in terms of hardware",
          "Eventual consistency is the only option supported by all databases",
          "It was an accidental design choice"
        ],
        correct_option: 0,
        explanation: `Eventual consistency follows the CAP theorem trade-off: by relaxing consistency guarantees, the system achieves higher availability and better partition tolerance, which is essential for geographically distributed ${topic} systems.`,
      }),
      (topic, role) => ({
        question: `How does the circuit breaker pattern prevent cascading failures in ${topic}?`,
        options: [
          "By short-circuiting requests to failing services and allowing recovery time",
          "By retrying failed requests indefinitely",
          "By caching all responses permanently",
          "By increasing server capacity automatically"
        ],
        correct_option: 0,
        explanation: `The circuit breaker monitors failure rates. When a threshold is exceeded, it opens the circuit and stops sending requests to the failing service, giving it time to recover while preventing the failure from propagating to dependent services.`,
      }),
      (topic, role) => ({
        question: `What problem does service mesh solve that a traditional load balancer cannot in ${topic}?`,
        options: [
          "Fine-grained traffic control, mutual TLS, and observability at the pod level",
          "Higher raw throughput for single connections",
          "Simpler deployment configuration",
          "Lower memory footprint"
        ],
        correct_option: 0,
        explanation: `A service mesh operates at the application layer, providing per-service mTLS, retries, circuit breaking, and distributed tracing — capabilities that traditional L4 load balancers cannot deliver at the granularity needed for microservices.`,
      }),
      (topic, role) => ({
        question: `Why is eventual consistency acceptable for a ${topic} analytics dashboard but not for a payment system?`,
        options: [
          "Analytics tolerate brief stale reads; payments require immediate consistency for correctness",
          "Analytics are read-only; payments are write-only",
          "Eventual consistency is faster for all systems",
          "Payment systems don't use databases"
        ],
        correct_option: 0,
        explanation: `Payment systems must guarantee immediate consistency to prevent double-charging or lost transactions. Analytics dashboards can tolerate seconds-old data without business impact, making eventual consistency a valid trade-off for better availability.`,
      }),
    ],
    apply: [
      (topic, role) => ({
        question: `You notice a 10x latency spike in ${topic} during peak hours. What is your first diagnostic step?`,
        options: [
          "Check resource utilization metrics (CPU, memory, I/O) on affected instances",
          "Restart all production servers immediately",
          "Deploy a code hotfix without investigation",
          "Disable monitoring alerts"
        ],
        correct_option: 0,
        explanation: `The first step in troubleshooting is always to gather data. Checking resource utilization helps identify whether the issue is CPU-bound, memory-bound, I/O-bound, or network-related before taking action.`,
      }),
      (topic, role) => ({
        question: `How would you implement a circuit breaker pattern for ${topic} external API calls?`,
        options: [
          "Track failure rates and open the circuit when threshold is exceeded, with periodic half-open probes",
          "Retry failed requests indefinitely without any limit",
          "Cache all responses permanently to avoid network calls",
          "Use synchronous blocking calls for every request"
        ],
        correct_option: 0,
        explanation: `A circuit breaker tracks consecutive failures. When the failure rate exceeds a threshold, it "opens" the circuit to prevent cascading failures. After a cooldown, it enters a half-open state to test if the service has recovered.`,
      }),
      (topic, role) => ({
        question: `Given a requirement to migrate ${topic} to a new database with zero downtime, what strategy would you apply?`,
        options: [
          "Dual-write to both databases with shadow reads, then cutover after validation",
          "Stop all traffic, migrate, and restart",
          "Write a single SQL script to copy all data at once",
          "Replace the database connection string and hope for the best"
        ],
        correct_option: 0,
        explanation: `Zero-downtime migration requires dual-writing to both old and new databases simultaneously. Shadow reads validate data consistency before switching traffic, ensuring no data loss and no service interruption.`,
      }),
      (topic, role) => ({
        question: `Your ${topic} service is experiencing race conditions under high concurrency. How would you fix this?`,
        options: [
          "Implement distributed locking with lease-based timeouts",
          "Add more application servers",
          "Reduce the logging level",
          "Increase the thread pool size"
        ],
        correct_option: 0,
        explanation: `Race conditions occur when concurrent operations access shared state without proper synchronization. Distributed locks with timeouts prevent deadlocks while ensuring only one operation can modify critical sections at a time.`,
      }),
    ],
    analyse: [
      (topic, role) => ({
        question: `When comparing synchronous vs asynchronous communication for ${topic}, which trade-off is most critical?`,
        options: [
          "Latency vs throughput and system complexity",
          "Memory usage vs CPU speed",
          "Code readability vs execution time",
          "Number of servers vs network bandwidth"
        ],
        correct_option: 0,
        explanation: `Synchronous communication offers lower latency per request but limits throughput under load. Asynchronous messaging increases throughput and resilience but adds complexity in message ordering and error handling.`,
      }),
      (topic, role) => ({
        question: `Why might a blue-green deployment strategy be preferred over rolling updates for ${topic} services?`,
        options: [
          "Instant rollback capability and zero-downtime guarantees",
          "Lower infrastructure costs",
          "Simpler database migration",
          "Fewer servers required"
        ],
        correct_option: 0,
        explanation: `Blue-green deployment maintains two identical environments, allowing instant traffic switching for rollback. While it requires double resources, it eliminates deployment risk and ensures zero downtime.`,
      }),
      (topic, role) => ({
        question: `Analyse the impact of eventual consistency on ${topic} data replication. When is it acceptable?`,
        options: [
          "When stale reads are tolerable and availability is prioritized",
          "When strong consistency is legally required",
          "When the dataset fits in memory",
          "When write throughput is low"
        ],
        correct_option: 0,
        explanation: `Eventual consistency trades immediate consistency for higher availability and partition tolerance. It's acceptable when users can tolerate brief periods of stale data, such as in social media feeds or analytics dashboards.`,
      }),
      (topic, role) => ({
        question: `What are the key factors to analyse when choosing between ${topic} and alternative solutions?`,
        options: [
          "Scalability requirements, team expertise, and operational complexity",
          "Only the license cost",
          "The programming language used",
          "The number of developers on the team"
        ],
        correct_option: 0,
        explanation: `Technology selection should consider scalability needs, existing team skills, operational overhead, community support, and long-term maintenance costs rather than any single factor.`,
      }),
    ],
  };

  const timeRanges = { fundamentals: [20, 40], understanding: [45, 75], apply: [60, 100], analyse: [75, 120] };
  const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

  const subTypesByType = {
    knowledge: ["fundamentals", "understanding"],
    skill: ["apply", "analyse"],
  };
  const cleanPrompt = (prompt || "").trim();
  const isCustomPrompt = cleanPrompt && !cleanPrompt.toLowerCase().startsWith("generate interview questions");

  const mk = (d, type, i) => {
    const topic = isCustomPrompt ? cleanPrompt : extractTopic(d.name, d.excerpt);
    const pool = subTypesByType[type] || ["fundamentals", "understanding", "apply", "analyse"];
    const subType = pool[i % pool.length];
    const bank = mcqBank[subType];
    const qData = bank[i % bank.length](topic, finalRole);
    const [lo, hi] = timeRanges[subType];

    return {
      id: `q${i}`,
      question: qData.question,
      answer: qData.explanation,
      type,
      sub_type: subType,
      confidence: Number((0.78 + Math.random() * 0.19).toFixed(2)),
      answerable: true,
      rating: null,
      options: qData.options,
      correct_option: qData.correct_option,
      explanation: qData.explanation,
      expected_time_seconds: randInt(lo, hi),
      sources: [
        {
          docId: d.id,
          docName: d.name,
          chunkId: Math.floor(Math.random() * (d.chunks || 30)) + 1,
          snippet: (d.excerpt || "Indexed enterprise documentation passage.").slice(0, 140) + "...",
        },
      ],
    };
  };

  let questions = [];
  // Determine how many questions and which types to emit.
  const target = Math.max(1, numQuestions || topK || 6);
  const mode = questionType || (twoRound ? "both" : "mixed");
  const typePlan = [];
  if (mode === "knowledge") {
    for (let i = 0; i < target; i++) typePlan.push("knowledge");
  } else if (mode === "skill") {
    for (let i = 0; i < target; i++) typePlan.push("skill");
  } else if (mode === "both") {
    const nK = Math.ceil(target / 2);
    for (let i = 0; i < target; i++) typePlan.push(i < nK ? "knowledge" : "skill");
  } else {
    for (let i = 0; i < target; i++) typePlan.push(i % 2 === 0 ? "knowledge" : "skill");
  }
  if (pool.length) {
    questions = typePlan.map((type, i) => mk(pool[i % pool.length], type, i + 1));
  }

  if (!questions.length) {
    questions = [
      {
        id: "q1",
        question: `No indexed documents were available to ground questions for ${finalRole}.`,
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
    jobRole: finalRole,
    prompt: prompt || `Generate interview questions for ${finalRole}.`,
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
      let msg = res.statusText;
      try {
        const errJson = await res.json();
        msg = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch {
        const text = await res.text().catch(() => "");
        msg = text || res.statusText;
      }
      throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    // auth
    login: (username, password) =>
      req("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    register: (username, password, email) =>
      req("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password, email }) }),
    googleLogin: (credential) =>
      req("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
    forgotPassword: (email) =>
      req("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    changePassword: (currentPassword, newPassword) =>
      req("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
    updateProfile: (username, email) =>
      req("/api/auth/update-profile", { method: "POST", body: JSON.stringify({ username, email }) }),
    me: () => req("/api/auth/me"),
    listUsers: () => req("/api/admin/users"),
    getParams: () => req("/api/admin/params"),
    setParams: (patch) => req("/api/admin/params", { method: "PUT", body: JSON.stringify(patch) }),

    // job profiles
    listJobProfiles: () => req("/api/job-profiles").catch(() => mockJobProfiles),
    createJobProfile: (data) =>
      req("/api/job-profiles", { method: "POST", body: JSON.stringify(data) }).catch(() => ({
        id: uid("jp"),
        name: data.name,
        createdAt: new Date().toISOString(),
      })),
    deleteJobProfile: (id) => req(`/api/job-profiles/${id}`, { method: "DELETE" }).catch(() => ({ ok: true })),

    // documents (per profile)
    listDocuments: (profileId) => req(`/api/job-profiles/${profileId}/documents`),
    uploadDocument: (profileId, file) => {
      const form = new FormData();
      form.append("file", file);
      const token = tokenStore.get();
      return fetch(`${BASE_URL}/api/job-profiles/${profileId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then((r) => {
        if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
        return r.json();
      });
    },
    deleteDocument: (profileId, docId) => req(`/api/job-profiles/${profileId}/documents/${docId}`, { method: "DELETE" }).then(() => ({ ok: true })),
    getDocChunks: (profileId, docId) => req(`/api/job-profiles/${profileId}/documents/${docId}/chunks`),

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
export const apiBaseUrl = BASE_URL;
export default api;
