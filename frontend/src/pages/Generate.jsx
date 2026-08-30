import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  FileText,
  Check,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  UserPlus,
  FileCheck2,
  X,
  Plus,
  Briefcase,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, TypeBadge, ConfidenceBar, UnanswerablePill } from "../components/ui.jsx";
import QuestionCard from "../components/QuestionCard.jsx";

const PRESET_ROLES = [
  "Senior Backend Engineer",
  "Data Engineer",
  "DevOps Specialist",
  "Security Analyst",
  "Frontend Engineer",
  "Cloud Architect",
  "Machine Learning Engineer",
];

const PROMPT_SUGGESTIONS = [
  { label: "Deployment & CI/CD", text: "Focus on automated CI/CD rollbacks, zero-downtime deployment, and canary testing." },
  { label: "RBAC & Security", text: "Emphasize multi-tenant isolation, RBAC policy enforcement, and secret rotation standards." },
  { label: "Data Pipelines", text: "Target distributed message queues, Kafka lag mitigation, and nightly ETL batch recovery." },
  { label: "System Scalability", text: "Focus on horizontal scaling, caching topologies, and microservice SLA metrics." },
];

export default function Generate() {
  const { documents, candidates, generateQA } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramCandidateId = searchParams.get("candidateId");

  const indexedDocs = useMemo(
    () => documents.filter((d) => d.status === "indexed"),
    [documents]
  );

  // 1. Candidate Selection
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    paramCandidateId || (candidates[0]?.id ?? "")
  );

  useEffect(() => {
    if (paramCandidateId) {
      setSelectedCandidateId(paramCandidateId);
    } else if (!selectedCandidateId && candidates.length > 0) {
      setSelectedCandidateId(candidates[0].id);
    }
  }, [paramCandidateId, candidates, selectedCandidateId]);

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) || null,
    [candidates, selectedCandidateId]
  );

  // 2. Multiple Job Roles
  const [selectedRoles, setSelectedRoles] = useState(() => [
    selectedCandidate?.targetRole || "Senior Backend Engineer",
  ]);
  const [customRoleInput, setCustomRoleInput] = useState("");

  useEffect(() => {
    if (selectedCandidate?.targetRole) {
      setSelectedRoles((prev) =>
        prev.includes(selectedCandidate.targetRole)
          ? prev
          : [selectedCandidate.targetRole, ...prev]
      );
    }
  }, [selectedCandidate]);

  function toggleRole(role) {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  }

  function addCustomRole(e) {
    e.preventDefault();
    const trimmed = customRoleInput.trim();
    if (trimmed && !selectedRoles.includes(trimmed)) {
      setSelectedRoles([...selectedRoles, trimmed]);
      setCustomRoleInput("");
    }
  }

  function removeRole(role) {
    if (selectedRoles.length > 1) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    }
  }

  // 3. Prompt
  const [prompt, setPrompt] = useState("");

  // 4. Grounding Enterprise Documents
  const [selectedDocs, setSelectedDocs] = useState(() => indexedDocs.map((d) => d.id));

  // 5. Two-round Mode
  const [twoRound, setTwoRound] = useState(true);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedDocs.length === 0 && indexedDocs.length > 0) {
      setSelectedDocs(indexedDocs.map((d) => d.id));
    }
  }, [indexedDocs.length, selectedDocs.length]);

  function toggleDoc(id) {
    setSelectedDocs((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function selectAllDocs() {
    if (selectedDocs.length === indexedDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(indexedDocs.map((d) => d.id));
    }
  }

  async function onGenerate() {
    setError("");
    if (selectedRoles.length === 0) {
      setError("Please select or add at least one target job role.");
      return;
    }
    if (selectedDocs.length === 0) {
      setError("Please select at least one indexed enterprise document for grounding.");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const candidateName = selectedCandidate ? selectedCandidate.name : "Interview Candidate";
      const combinedRoleString = selectedRoles.join(" / ");
      const finalPrompt =
        prompt.trim() ||
        `Generate interview questions for ${candidateName} targeting ${combinedRoleString} grounded in enterprise documentation.`;

      const set = await generateQA({
        candidateId: selectedCandidate?.id || null,
        candidateName,
        candidateRole: combinedRoleString,
        candidateResumeName: selectedCandidate?.resumeName || null,
        jobRole: combinedRoleString,
        prompt: finalPrompt,
        topK: 6,
        documentIds: selectedDocs,
        twoRound,
      });
      setResult(set);
    } catch (e) {
      setError(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Configuration Stepper (5 cols) */}
      <div className="space-y-6 lg:col-span-5">
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 font-bold">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assessment Setup</h3>
                <p className="text-[11px] text-slate-400">Configure candidate RAG parameters</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              Closed-Domain RAG
            </span>
          </div>

          <div className="mt-5 space-y-5">
            {/* STEP 1: Select Candidate */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    1
                  </span>
                  Interview Candidate <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/documents")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                >
                  <UserPlus size={12} /> Manage candidates
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-800">
                  No candidates registered yet. Please add a candidate in the Documents tab.
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.targetRole}
                      </option>
                    ))}
                  </select>

                  {selectedCandidate && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{selectedCandidate.name}</span>
                        <span className="text-[11px] text-slate-500">{selectedCandidate.email}</span>
                      </div>
                      {selectedCandidate.resumeName && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-slate-700">
                          <FileCheck2 size={13} className="text-brand-600 flex-shrink-0" />
                          <span className="truncate text-[11px] font-medium">{selectedCandidate.resumeName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: Job Roles (Multi-Role Selection) */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    2
                  </span>
                  Job Roles <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedRoles.length} selected
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Select one or multiple roles to synthesize multi-faceted questions.
              </p>

              {/* Active Selected Roles Badges */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs"
                  >
                    <Briefcase size={12} />
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRole(role)}
                      className="rounded-full p-0.5 hover:bg-brand-700 text-brand-100 hover:text-white"
                      title="Remove role"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Preset Roles Toggle Chips */}
              <div className="mt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Presets
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRESET_ROLES.map((preset) => {
                    const isSelected = selectedRoles.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => toggleRole(preset)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? `✓ ${preset}` : `+ ${preset}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Role */}
              <form onSubmit={addCustomRole} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom role (e.g. Systems Reliability Eng)..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <Button type="submit" size="sm" variant="secondary" className="!px-3 !py-1.5">
                  <Plus size={13} /> Add
                </Button>
              </form>
            </div>

            {/* STEP 3: Prompt */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  3
                </span>
                Prompt <span className="text-slate-400 font-normal">(optional focus areas)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="Specific focus topics (e.g. disaster recovery, blue-green deployment, authentication)..."
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />

              {/* Quick Prompt Suggestions */}
              <div className="mt-2 space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick focus areas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(s.text)}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition"
                      title={s.text}
                    >
                      💡 {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 4: Grounding Documents */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    4
                  </span>
                  Grounding Enterprise Documents <span className="text-red-500">*</span>
                </label>
                {indexedDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllDocs}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {selectedDocs.length === indexedDocs.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Questions will be extracted strictly from these indexed company files.
              </p>

              <div className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto scroll-thin pr-1">
                {indexedDocs.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    No indexed documents found. Upload documents in the Documents tab.
                  </p>
                ) : (
                  indexedDocs.map((d) => {
                    const isSel = selectedDocs.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDoc(d.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition cursor-pointer ${
                          isSel
                            ? "border-brand-300 bg-brand-50 font-semibold"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                            isSel
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSel && <Check size={11} />}
                        </span>
                        <FileText size={14} className="flex-shrink-0 text-slate-400" />
                        <span className="truncate text-slate-800">{d.name}</span>
                        <span className="ml-auto flex-shrink-0 text-[11px] text-slate-400 font-normal">
                          {d.chunks} chunks
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* STEP 5: Two-Round Cognitive Mode */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setTwoRound((v) => !v)}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 transition cursor-pointer"
              >
                <span
                  className={`mt-0.5 flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition ${
                    twoRound ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      twoRound ? "translate-x-4" : ""
                    }`}
                  />
                </span>
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    5. Two-Round Cognitive Mode
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500 leading-snug">
                    Generates <strong>Knowledge-Based</strong> (concepts & policies) and <strong>Skill-Based</strong> (applied scenarios & troubleshooting) in distinct rounds.
                  </span>
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <Button
            onClick={onGenerate}
            disabled={generating}
            size="lg"
            className="mt-6 w-full"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Generating Assessment…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Candidate Q&A
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Right Column: Results & Interactive Output Preview (7 cols) */}
      <div className="lg:col-span-7">
        {generating && (
          <GeneratingState
            candidateName={selectedCandidate?.name || "Candidate"}
            roles={selectedRoles}
          />
        )}

        {!generating && !result && (
          <Card className="flex h-full min-h-[26rem] flex-col items-center justify-center p-10 text-center">
            <div className="rounded-2xl bg-brand-50 p-4 text-brand-600">
              <Sparkles size={32} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-800">
              Grounded Candidate Assessment
            </h3>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
              Configure candidate details, job roles, and enterprise documents on the left.
              The closed-domain RAG engine will extract verified citations and synthesize interview questions.
            </p>
          </Card>
        )}

        {!generating && result && (
          <ResultView
            result={result}
            onViewAll={() => navigate(`/results?setId=${result.id}`)}
          />
        )}
      </div>
    </div>
  );
}

function GeneratingState({ candidateName, roles = [] }) {
  const roleDisplay = roles.slice(0, 2).join(" & ");
  const steps = [
    `Analyzing profile & job roles for ${candidateName} (${roleDisplay})`,
    "Performing vector search across enterprise documentation",
    "Synthesizing strictly grounded interview answers with chunk citations",
    "Classifying questions into Knowledge-Based and Skill-Based types",
  ];
  return (
    <Card className="p-8">
      <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
        <Loader2 size={18} className="animate-spin text-brand-600" />
        Running Closed-Domain RAG Pipeline…
      </div>
      <div className="mt-6 space-y-3.5">
        {steps.map((s, i) => (
          <div
            key={s}
            className="flex items-center gap-3 text-xs text-slate-600 font-medium"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            {s}
          </div>
        ))}
      </div>
      <div className="mt-7 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-slate-100"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </Card>
  );
}

function ResultView({ result, onViewAll }) {
  const kn = result.questions.filter((q) => q.type === "knowledge").length;
  const sk = result.questions.filter((q) => q.type === "skill").length;
  const oos = result.questions.filter((q) => !q.answerable).length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
                Generated Assessment
              </span>
              <span className="text-xs text-slate-400">
                {result.questions.length} questions
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {result.candidateName || result.jobRole}
            </h3>
            <p className="text-xs font-medium text-brand-600">
              {result.candidateRole || result.jobRole}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onViewAll}>
            Open in Results <ChevronRight size={14} />
          </Button>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <TypeBadge type="knowledge" size="sm" /> {kn} Knowledge
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <TypeBadge type="skill" size="sm" /> {sk} Skill
          </span>
          {oos > 0 && (
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <UnanswerablePill /> {oos} Out of scope
            </span>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {result.questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i} />
        ))}
      </div>
    </div>
  );
}
