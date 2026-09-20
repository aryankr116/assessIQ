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
    jobProfileId: "jp_backend_engineer",
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
    jobProfileId: "jp_backend_engineer",
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
    jobProfileId: "jp_data_engineer",
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
    jobProfileId: "jp_devops_intern",
  },
];

export const mockJobProfiles = [
  {
    id: "jp_backend_engineer",
    name: "Senior Backend Engineer",
    createdAt: "2026-06-11T09:20:00Z",
  },
  {
    id: "jp_data_engineer",
    name: "Data Engineer",
    createdAt: "2026-06-12T14:00:00Z",
  },
  {
    id: "jp_devops_intern",
    name: "DevOps Intern",
    createdAt: "2026-06-13T10:00:00Z",
  },
];

// A generated Q&A set is what the RAG + classifier pipeline returns for a job role prompt.
export const mockQASets = [
  {
    id: "set_backend_engineer",
    jobRole: "Senior Backend Engineer",
    prompt:
      "Generate interview questions for Senior Backend Engineer covering deployment, reliability, and data security from company handbook.",
    topK: 6,
    createdAt: "2026-06-13T11:15:00Z",
    documentIds: ["doc_engineering_handbook", "doc_security_policy"],
    questions: [
      {
        id: "q1",
        question: "In the company's deployment strategy, when is automated rollback triggered?",
        options: [
          "When error rates exceed 2% over a five-minute window",
          "When CPU usage goes above 80%",
          "When the deploy takes more than 10 minutes",
          "When more than 5 developers approve the release"
        ],
        correct_option: 0,
        explanation: "The Engineering Handbook specifies that automated rollback is triggered when error rates exceed 2% over a five-minute window during a blue-green deployment.",
        answer: "Automated rollback is triggered when error rates exceed 2% over a five-minute window.",
        type: "knowledge",
        sub_type: "fundamentals",
        confidence: 0.93,
        answerable: true,
        expected_time_seconds: 35,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 47,
            snippet: "Deployments follow a blue-green strategy with automated rollback when error rates exceed 2% over a five-minute window.",
          },
        ],
      },
      {
        id: "q2",
        question: "What is the maximum allowed response time for the /health endpoint in production?",
        options: ["500ms", "1 second", "5 seconds", "100ms"],
        correct_option: 0,
        explanation: "The platform requirement states that every production service must expose a /health endpoint returning HTTP 200 within 500ms.",
        answer: "Every production service must return HTTP 200 from /health within 500ms.",
        type: "skill",
        sub_type: "apply",
        confidence: 0.88,
        answerable: true,
        expected_time_seconds: 75,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 12,
            snippet: "All production services must expose a /health endpoint returning HTTP 200 within 500ms.",
          },
        ],
      },
      {
        id: "q3",
        question: "How often are secrets rotated according to the security policy?",
        options: ["Every 90 days", "Every 30 days", "Once a year", "Never — they are permanent"],
        correct_option: 0,
        explanation: "The Security Policy v3 states that secrets are stored in the company vault and rotated every 90 days to minimize exposure risk.",
        answer: "Secrets are rotated every 90 days.",
        type: "knowledge",
        sub_type: "understanding",
        confidence: 0.95,
        answerable: true,
        expected_time_seconds: 55,
        sources: [
          {
            docId: "doc_security_policy",
            docName: "Security_Policy_v3.docx",
            chunkId: 8,
            snippet: "Secrets are stored in the company vault and rotated every 90 days.",
          },
        ],
      },
      {
        id: "q4",
        question: "You notice a 10x latency spike in production after a deploy. What is your first diagnostic step?",
        options: [
          "Check resource utilization metrics on affected instances",
          "Immediately roll back the deployment",
          "Restart all production servers",
          "Disable monitoring alerts temporarily"
        ],
        correct_option: 0,
        explanation: "Before taking action, you should gather data. Checking CPU, memory, and I/O metrics helps identify whether the issue is resource-bound or code-related.",
        answer: "First check resource utilization to identify the bottleneck before deciding on remediation.",
        type: "skill",
        sub_type: "apply",
        confidence: 0.71,
        answerable: true,
        expected_time_seconds: 95,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 47,
            snippet: "Automated rollback when error rates exceed 2% over a five-minute window.",
          },
        ],
      },
      {
        id: "q5",
        question: "Analyse the trade-offs between the blue-green deployment strategy and a rolling update approach.",
        options: [
          "Blue-green offers instant rollback but requires double infrastructure; rolling is resource-efficient but slower to revert",
          "Blue-green is always cheaper than rolling updates",
          "Rolling updates provide instant rollback while blue-green does not",
          "There is no practical difference between the two strategies"
        ],
        correct_option: 0,
        explanation: "Blue-green maintains two identical environments enabling instant rollback at the cost of double resources. Rolling updates are more resource-efficient but rollback requires re-deploying previous versions, which is slower.",
        answer: "Blue-green provides instant rollback and zero downtime but requires double the infrastructure. Rolling updates are more resource-efficient but rollback is slower.",
        type: "knowledge",
        sub_type: "understanding",
        confidence: 0.85,
        answerable: true,
        expected_time_seconds: 65,
        sources: [
          {
            docId: "doc_engineering_handbook",
            docName: "Engineering_Handbook.pdf",
            chunkId: 47,
            snippet: "Deployments follow a blue-green strategy with automated rollback.",
          },
        ],
      },
    ],
  },
  {
    id: "set_data_engineer",
    jobRole: "Data Engineer",
    prompt:
      "Generate questions for Data Engineer focused on the nightly ETL pipeline, Kafka lag, and on-call handling.",
    topK: 5,
    createdAt: "2026-06-14T16:48:00Z",
    documentIds: ["doc_data_pipeline_runbook"],
    questions: [
      {
        id: "q1",
        question: "At what time does the nightly ETL job run?",
        options: ["02:00 UTC", "00:00 UTC", "06:00 UTC", "12:00 UTC"],
        correct_option: 0,
        explanation: "The Data Pipeline Runbook specifies that the ETL job runs nightly at 02:00 UTC to process the day's accumulated data.",
        answer: "The ETL job runs nightly at 02:00 UTC.",
        type: "knowledge",
        sub_type: "fundamentals",
        confidence: 0.94,
        answerable: true,
        expected_time_seconds: 25,
        sources: [
          {
            docId: "doc_data_pipeline_runbook",
            docName: "Data_Pipeline_Runbook.txt",
            chunkId: 3,
            snippet: "The ETL job runs nightly at 02:00 UTC.",
          },
        ],
      },
      {
        id: "q2",
        question: "When the upstream Kafka topic lags by more than 10 minutes, what action does the orchestrator take?",
        options: [
          "Pauses downstream transforms and pages the on-call engineer",
          "Automatically restarts the Kafka consumer",
          "Sends an email to the data team and continues processing",
          "Drops the lagging messages and proceeds"
        ],
        correct_option: 0,
        explanation: "The runbook states that when Kafka lag exceeds 10 minutes, the orchestrator pauses downstream transforms and pages the on-call engineer to investigate.",
        answer: "The orchestrator pauses downstream transforms and pages the on-call engineer.",
        type: "knowledge",
        sub_type: "understanding",
        confidence: 0.92,
        answerable: true,
        expected_time_seconds: 60,
        sources: [
          {
            docId: "doc_data_pipeline_runbook",
            docName: "Data_Pipeline_Runbook.txt",
            chunkId: 3,
            snippet: "the orchestrator pauses downstream transforms and pages the on-call engineer.",
          },
        ],
      },
      {
        id: "q3",
        question: "How would you implement lag monitoring that triggers alerts before downstream impact?",
        options: [
          "Set up a polling sensor that checks Kafka consumer lag every 60 seconds against a configurable threshold",
          "Monitor only CPU usage of the Kafka brokers",
          "Check lag once per day during the ETL run",
          "Rely on manual checks by the on-call engineer"
        ],
        correct_option: 0,
        explanation: "A proactive approach polls consumer lag at regular intervals (e.g., every 60 seconds) and triggers alerts when the lag exceeds a configurable threshold, allowing intervention before downstream transforms are affected.",
        answer: "Implement a polling sensor that checks Kafka consumer lag every 60 seconds against a configurable threshold.",
        type: "skill",
        sub_type: "apply",
        confidence: 0.83,
        answerable: true,
        expected_time_seconds: 100,
        sources: [
          {
            docId: "doc_data_pipeline_runbook",
            docName: "Data_Pipeline_Runbook.txt",
            chunkId: 3,
            snippet: "the orchestrator pauses downstream transforms and pages the on-call engineer.",
          },
        ],
      },
      {
        id: "q4",
        question: "What is the company's disaster-recovery RPO for the analytics warehouse?",
        options: [
          "Not specified in the available documentation",
          "1 hour",
          "24 hours",
          "Real-time replication"
        ],
        correct_option: 0,
        explanation: "The runbook describes the nightly ETL schedule and lag handling but does not specify a disaster-recovery RPO for the analytics warehouse.",
        answer: "This question cannot be answered from the provided documents.",
        type: "knowledge",
        sub_type: "fundamentals",
        confidence: 0.34,
        answerable: false,
        expected_time_seconds: 30,
        sources: [],
      },
    ],
  },
];

// Aggregate stats for the dashboard
export function computeStats(qaSets = [], jobProfiles = []) {
  const allQuestions = qaSets.flatMap((s) => s.questions || []);
  const knowledge = allQuestions.filter((q) => q.type === "knowledge").length;
  const skill = allQuestions.filter((q) => q.type === "skill").length;
  const unanswerable = allQuestions.filter((q) => !q.answerable).length;
  return {
    totalJobProfiles: jobProfiles.length,
    totalQaSets: qaSets.length,
    totalQuestions: allQuestions.length,
    knowledgeCount: knowledge,
    skillCount: skill,
    unanswerableCount: unanswerable,
  };
}
