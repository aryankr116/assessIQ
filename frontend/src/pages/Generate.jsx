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
  Search,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, TypeBadge, ConfidenceBar, UnanswerablePill, StatusBadge } from "../components/ui.jsx";
import AddCandidateModal from "../components/AddCandidateModal.jsx";
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
  const [candidateSearch, setCandidateSearch] = useState("");

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

  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates;
    const q = candidateSearch.toLowerCase();
    return candidates.filter(
      (c) => c.name.toLowerCase().includes(q) || c.targetRole.toLowerCase().includes(q)
    );
  }, [candidates, candidateSearch]);

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
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
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
    setSelectedRoles((prev) => prev.filter((r) => r !== role));
  }

  // 3. Prompt
  const [prompt, setPrompt] = useState("");

  // 4. Grounding Enterprise Documents
  const [selectedDocs, setSelectedDocs] = useState(() => indexedDocs.map((d) => d.id));
  const [docSearch, setDocSearch] = useState("");
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  // 5. Question type: both | knowledge | skill
  const [questionType, setQuestionType] = useState("both");

  // 6. Number of questions
  const [questionCount, setQuestionCount] = useState(6);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const filteredDocs = useMemo(() => {
    if (!docSearch.trim()) return documents;
    const q = docSearch.toLowerCase();
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, docSearch]);

  function toggleDoc(id) {
    setSelectedDocs((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function selectAllDocs() {
    const visibleIndexed = filteredDocs.filter((d) => d.status === "indexed").map((d) => d.id);
    const allSelected = visibleIndexed.every((id) => selectedDocs.includes(id));
    if (allSelected) {
      setSelectedDocs((cur) => cur.filter((id) => !visibleIndexed.includes(id)));
    } else {
      setSelectedDocs((cur) => [...new Set([...cur, ...visibleIndexed])]);
    }
  }

  const allVisibleIndexed = filteredDocs.filter((d) => d.status === "indexed");
  const allVisibleSelected = allVisibleIndexed.length > 0 && allVisibleIndexed.every((d) => selectedDocs.includes(d.id));

  async function onGenerate() {
    setError("");
    if (selectedRoles.length === 0) {
      setError("Please select or add at least one target job role.");
      return;
    }
    if (selectedDocs.length === 0) {
      setError("Please select at least one indexed document for grounding.");
      return;
    }
    setGenerating(true);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        topK: questionCount,
        documentIds: selectedDocs,
        twoRound: questionType === "both",
        questionType,
      });
      setResult(set);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className={`grid grid-cols-1 gap-6 transition-all duration-500 ease-in-out ${generating || result ? "lg:grid-cols-12" : ""}`}>
      {/* Left Column: Configuration */}
      <div className={`transition-all duration-500 ease-in-out ${generating || result ? "space-y-6 lg:col-span-5" : "space-y-6 max-w-2xl mx-auto w-full"}`}>
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 font-bold">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assessment Setup</h3>
                <p className="text-[11px] text-slate-400">Configure your interview generation</p>
              </div>
            </div>
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
                  onClick={() => setShowAddCandidate(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                >
                  <UserPlus size={12} /> Add Candidate
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-800">
                  No candidates yet. Add a candidate first.
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {/* Candidate search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  {/* Candidate list */}
                  <div className="max-h-36 space-y-1 overflow-y-auto scroll-thin">
                    {filteredCandidates.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-2 text-center">No matches</p>
                    ) : (
                      filteredCandidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedCandidateId(c.id); setCandidateSearch(""); }}
                          className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition cursor-pointer ${
                            selectedCandidateId === c.id
                              ? "border-brand-400 bg-brand-50 font-semibold"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selectedCandidateId === c.id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                          }`}>
                            {selectedCandidateId === c.id && <Check size={10} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-slate-800">{c.name}</span>
                            <span className="block truncate text-[11px] text-slate-500">{c.targetRole}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {selectedCandidate && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{selectedCandidate.name}</span>
                        <span className="text-[11px] text-slate-500">{selectedCandidate.email}</span>
                      </div>
                      {selectedCandidate.resumeName && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-slate-700">
                          <FileCheck2 size={13} className="text-brand-600 shrink-0" />
                          <span className="truncate text-[11px] font-medium">{selectedCandidate.resumeName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: Job Roles */}
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

              {/* Active Roles */}
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
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Preset Roles */}
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

              {/* Custom Role */}
              <form onSubmit={addCustomRole} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom role..."
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
                Prompt <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="Specific focus topics..."
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(s.text)}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 4: Documents */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    4
                  </span>
                  Documents <span className="text-red-500">*</span>
                </label>
                {allVisibleIndexed.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllDocs}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {allVisibleSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {/* Doc search */}
              <div className="relative mt-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto scroll-thin pr-1">
                {filteredDocs.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    No documents found.
                  </p>
                ) : (
                  filteredDocs.map((d) => {
                    const isIndexed = d.status === "indexed";
                    const isSel = selectedDocs.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!isIndexed}
                        onClick={() => isIndexed && toggleDoc(d.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition ${
                          !isIndexed
                            ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                            : isSel
                            ? "border-brand-300 bg-brand-50 font-semibold cursor-pointer"
                            : "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSel
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSel && <Check size={11} />}
                        </span>
                        <FileText size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate text-slate-800">{d.name}</span>
                        <span className="ml-auto shrink-0 text-[11px] font-normal">
                          {isIndexed ? (
                            <span className="text-slate-400">{d.chunks} chunks</span>
                          ) : (
                            <StatusBadge status={d.status} />
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {selectedDocs.length > 0 && (
                <p className="mt-1.5 text-[11px] text-slate-400">{selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>

            {/* STEP 5: Question Type */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  5
                </span>
                Question Type
              </label>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Choose the style of questions to generate.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { value: "knowledge", label: "Knowledge", desc: "Concepts & policies" },
                  { value: "skill", label: "Skill", desc: "Applied scenarios" },
                  { value: "both", label: "Both", desc: "Knowledge + Skill" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQuestionType(opt.value)}
                    className={`rounded-lg border p-2.5 text-center transition-all cursor-pointer ${
                      questionType === opt.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 6: Number of Questions */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  6
                </span>
                Number of Questions
              </label>
              <p className="mt-0.5 text-[11px] text-slate-400">
                How many questions to generate per round.
              </p>
              <div className="mt-3 flex items-center gap-4">
                <span className="text-[11px] font-medium text-slate-400 w-6 text-center">2</span>
                <div className="relative flex-1">
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-400 w-6 text-center">20</span>
              </div>
              <div className="mt-1.5 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                  {questionCount} questions
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle size={14} className="shrink-0" /> {error}
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
                <Loader2 size={16} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Q&A
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Right Column: Results */}
      {(generating || result) && (
        <div className="lg:col-span-7 animate-fade-in-up">
          {generating && (
            <GeneratingState
              candidateName={selectedCandidate?.name || "Candidate"}
              roles={selectedRoles}
            />
          )}

          {!generating && result && (
            <div className="space-y-4 animate-fade-in-up">
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-2"
              >
                ← Back to setup
              </button>
              <ResultView
                result={result}
                onViewAll={() => navigate(`/results?setId=${result.id}`)}
              />
            </div>
          )}
        </div>
      )}

      <AddCandidateModal
        open={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
        onCreated={() => setShowAddCandidate(false)}
      />
    </div>
  );
}

function GeneratingState({ candidateName, roles = [] }) {
  const roleDisplay = roles.slice(0, 2).join(" & ");
  const steps = [
    `Analyzing profile for ${candidateName} (${roleDisplay})`,
    "Searching across enterprise documentation",
    "Synthesizing grounded interview questions",
    "Classifying into Knowledge and Skill types",
  ];
  return (
    <Card className="p-8">
      <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
        <Loader2 size={18} className="animate-spin text-brand-600" />
        Generating Interview Q&A...
      </div>
      <div className="mt-6 space-y-3.5">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            {s}
          </div>
        ))}
      </div>
      <div className="mt-7 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" style={{ animationDelay: `${i * 120}ms` }} />
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
                Generated
              </span>
              <span className="text-xs text-slate-400">{result.questions.length} questions</span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {result.candidateName || result.jobRole}
            </h3>
            <p className="text-xs font-medium text-brand-600">
              {result.candidateRole || result.jobRole}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onViewAll}>
            View All <ChevronRight size={14} />
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
