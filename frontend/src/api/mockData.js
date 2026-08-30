// Mock data grounded in the AssessIQ domain (closed-domain RAG over enterprise docs).
// Mirrors the structured output produced by the backend ingestion pipeline
// (raw_text -> cleaned_text -> chunks -> structured JSON).

// Demo accounts for mock mode (real mode authenticates against the backend).
export const mockUsers = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "recruiter", password: "demo123", role: "recruiter" },
];

export const mockDocuments = [
  {
    id: "doc_engineering_handbook",
    name: "Engineering_Handbook.pdf",
    ext: ".pdf",
    sizeBytes: 1_842_311,
    status: "indexed", // uploaded | extracting | chunking | indexed | failed
    pages: 42,
    chunks: 128,
    uploadedAt: "2026-06-11T09:24:00Z",
    excerpt:
      "All production services must expose a /health endpoint returning HTTP 200 within 500ms. Deployments follow a blue-green strategy with automated rollback when error rates exceed 2% over a five-minute window...",
  },
  {
    id: "doc_security_policy",
    name: "Security_Policy_v3.docx",
    ext: ".docx",
    sizeBytes: 318_004,
    status: "indexed",
    pages: 18,
    chunks: 54,
    uploadedAt: "2026-06-11T09:31:00Z",
    excerpt:
      "Access to customer data requires multi-factor authentication and is governed by role-based access control. Secrets are stored in the company vault and rotated every 90 days...",
  },
  {
    id: "doc_data_pipeline_runbook",
    name: "Data_Pipeline_Runbook.txt",
    ext: ".txt",
    sizeBytes: 96_540,
    status: "indexed",
    pages: 9,
    chunks: 31,
    uploadedAt: "2026-06-12T14:02:00Z",
    excerpt:
      "The ETL job runs nightly at 02:00 UTC. If the upstream Kafka topic lags by more than 10 minutes, the orchestrator pauses downstream transforms and pages the on-call engineer...",
  },
  {
    id: "doc_onboarding_guide",
    name: "New_Hire_Onboarding.pptx",
    ext: ".pptx",
    sizeBytes: 4_201_889,
    status: "chunking",
    pages: 28,
    chunks: 0,
    uploadedAt: "2026-06-15T08:40:00Z",
    excerpt:
      "Week one focuses on environment setup, code-review etiquette, and shadowing an on-call rotation. New engineers complete a starter task by the end of the first sprint...",
  },
];

export const mockCandidates = [
  {
    id: "cand_alex_johnson",
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    targetRole: "Senior Backend Engineer",
    resumeName: "Alex_Johnson_Backend_Resume.pdf",
    resumeExt: ".pdf",
    resumeSizeBytes: 124500,
    uploadedAt: "2026-06-12T10:15:00Z",
    skills: ["Distributed Systems", "Kubernetes", "PostgreSQL", "Go", "Python"],
    experienceYears: 6,
    summary:
      "Senior backend engineer with 6+ years building microservices, blue-green deployment pipelines, and high-availability APIs.",
  },
  {
    id: "cand_priya_sharma",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    targetRole: "Data Engineer",
    resumeName: "Priya_Sharma_DataEng_CV.docx",
    resumeExt: ".docx",
    resumeSizeBytes: 98200,
    uploadedAt: "2026-06-13T14:20:00Z",
    skills: ["Apache Kafka", "Airflow", "PySpark", "Snowflake", "ETL Pipelines"],
    experienceYears: 4,
    summary:
      "Data engineer experienced in streaming architectures, nightly ETL pipelines, and lag orchestration.",
  },
  {
    id: "cand_marcus_vance",
    name: "Marcus Vance",
    email: "marcus.v@example.com",
    targetRole: "Security Analyst",
    resumeName: "Marcus_Vance_Security_Resume.pdf",
    resumeExt: ".pdf",
    resumeSizeBytes: 142000,
    uploadedAt: "2026-06-14T09:00:00Z",
    skills: ["RBAC", "Vulnerability Assessment", "SOC 2", "Incident Response", "Vault"],
    experienceYears: 5,
    summary:
      "Cybersecurity specialist focused on enterprise identity governance, vault secret rotation, and access policies.",
  },
];

// A generated Q&A set is what the RAG + classifier pipeline returns for a candidate & job-role prompt.
export const mockQASets = [
  {
    id: "set_backend_engineer",
    candidateId: "cand_alex_johnson",
    candidateName: "Alex Johnson",
    candidateRole: "Senior Backend Engineer",
    candidateResumeName: "Alex_Johnson_Backend_Resume.pdf",
    jobRole: "Senior Backend Engineer",
    prompt:
      "Generate interview questions for Alex Johnson (Senior Backend Engineer) covering deployment, reliability, and data security from company handbook.",
    topK: 6,
    createdAt: "2026-06-13T11:15:00Z",
    documentIds: ["doc_engineering_handbook", "doc_security_policy"],
    questions: [
      {
        id: "q1",
        question:
          "Describe the blue-green deployment strategy used for production services and explain how automated rollback is triggered.",
        answer:
          "Production services are deployed using a blue-green strategy. A new (green) environment is brought up alongside the live (blue) one, traffic is shifted over, and the system monitors error rates. Automated rollback is triggered when error rates exceed 2% over a five-minute window, returning traffic to the previous environment.",
        type: "knowledge",
        confidence: 0.93,
        answerable: true,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 47,
            snippet:
              "Deployments follow a blue-green strategy with automated rollback when error rates exceed 2% over a five-minute window.",
          },
        ],
      },
      {
        id: "q2",
        question:
          "Implement a health-check handler that satisfies the platform's production readiness requirement.",
        answer:
          "Every production service must expose a /health endpoint that returns HTTP 200 within 500ms. A correct implementation responds quickly without depending on slow downstream calls, optionally reporting liveness/readiness separately so the load balancer can route only to healthy instances.",
        type: "skill",
        confidence: 0.88,
        answerable: true,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 12,
            snippet:
              "All production services must expose a /health endpoint returning HTTP 200 within 500ms.",
          },
        ],
      },
      {
        id: "q3",
        question:
          "What controls govern access to customer data, and how often are secrets rotated?",
        answer:
          "Access to customer data requires multi-factor authentication and is governed by role-based access control (RBAC). Secrets are stored in the company vault and rotated every 90 days.",
        type: "knowledge",
        confidence: 0.95,
        answerable: true,
        sources: [
          {
            docId: "doc_security_policy",
            docName: "Security_Policy_v3.docx",
            chunkId: 8,
            snippet:
              "Access to customer data requires multi-factor authentication and is governed by role-based access control. Secrets are rotated every 90 days.",
          },
        ],
      },
      {
        id: "q4",
        question:
          "Given a sudden spike in 5xx errors after a deploy, walk through how you would use the platform's tooling to diagnose and recover.",
        answer:
          "Because rollback is automated at a 2% error threshold over five minutes, first confirm whether rollback already fired. If not yet triggered, inspect the green environment's logs and health endpoint, compare against the blue baseline, and either force a rollback or roll forward with a fix once the root cause is isolated.",
        type: "skill",
        confidence: 0.71,
        answerable: true,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 47,
            snippet:
              "Automated rollback when error rates exceed 2% over a five-minute window.",
          },
        ],
      },
    ],
  },
  {
    id: "set_data_engineer",
    candidateId: "cand_priya_sharma",
    candidateName: "Priya Sharma",
    candidateRole: "Data Engineer",
    candidateResumeName: "Priya_Sharma_DataEng_CV.docx",
    jobRole: "Data Engineer",
    prompt:
      "Generate questions for Priya Sharma (Data Engineer) focused on the nightly ETL pipeline, Kafka lag, and on-call handling.",
    topK: 5,
    createdAt: "2026-06-14T16:48:00Z",
    documentIds: ["doc_data_pipeline_runbook"],
    questions: [
      {
        id: "q1",
        question:
          "When does the nightly ETL job run, and what happens when the upstream Kafka topic lags?",
        answer:
          "The ETL job runs nightly at 02:00 UTC. If the upstream Kafka topic lags by more than 10 minutes, the orchestrator pauses downstream transforms and pages the on-call engineer.",
        type: "knowledge",
        confidence: 0.94,
        answerable: true,
        sources: [
          {
            docId: "doc_data_pipeline_runbook",
            docName: "Data_Pipeline_Runbook.txt",
            chunkId: 3,
            snippet:
              "The ETL job runs nightly at 02:00 UTC. If the upstream Kafka topic lags by more than 10 minutes, the orchestrator pauses downstream transforms.",
          },
        ],
      },
      {
        id: "q2",
        question:
          "Write the orchestration logic that pauses downstream transforms when topic lag exceeds the documented threshold.",
        answer:
          "The logic checks consumer lag against a 10-minute threshold; when exceeded, it halts downstream transform tasks and emits a page to on-call. A robust implementation reads lag from the orchestrator's sensor, short-circuits dependent tasks, and records the event for the runbook.",
        type: "skill",
        confidence: 0.83,
        answerable: true,
        sources: [
          {
            docId: "doc_data_pipeline_runbook",
            docName: "Data_Pipeline_Runbook.txt",
            chunkId: 3,
            snippet:
              "the orchestrator pauses downstream transforms and pages the on-call engineer.",
          },
        ],
      },
      {
        id: "q3",
        question:
          "What is the company's disaster-recovery RPO for the analytics warehouse?",
        answer:
          "This question cannot be answered from the provided documents. The runbook describes the nightly ETL schedule and lag handling but does not specify a disaster-recovery RPO for the analytics warehouse.",
        type: "knowledge",
        confidence: 0.34,
        answerable: false,
        sources: [],
      },
    ],
  },
];

// Aggregate stats for the dashboard
export function computeStats(documents = [], qaSets = [], candidates = []) {
  const indexedDocs = documents.filter((d) => d.status === "indexed");
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunks || 0), 0);
  const allQuestions = qaSets.flatMap((s) => s.questions || []);
  const knowledge = allQuestions.filter((q) => q.type === "knowledge").length;
  const skill = allQuestions.filter((q) => q.type === "skill").length;
  const unanswerable = allQuestions.filter((q) => !q.answerable).length;
  return {
    totalDocuments: documents.length,
    indexedDocuments: indexedDocs.length,
    totalChunks,
    totalCandidates: candidates.length,
    totalQaSets: qaSets.length,
    totalQuestions: allQuestions.length,
    knowledgeCount: knowledge,
    skillCount: skill,
    unanswerableCount: unanswerable,
  };
}

