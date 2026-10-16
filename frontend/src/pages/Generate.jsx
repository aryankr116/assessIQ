import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  FileText,
  Check,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  Search,
  Briefcase,
  Plus,
  Upload,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, TypeBadge, UnanswerablePill, StatusBadge } from "../components/ui.jsx";
import QuestionCard from "../components/QuestionCard.jsx";
import { formatBytes } from "../lib/format.js";

const PROMPT_SUGGESTIONS = [
  { label: "Deployment & CI/CD", text: "Focus on automated CI/CD rollbacks, zero-downtime deployment, and canary testing." },
  { label: "RBAC & Security", text: "Emphasize multi-tenant isolation, RBAC policy enforcement, and secret rotation standards." },
  { label: "Data Pipelines", text: "Target distributed message queues, Kafka lag mitigation, and nightly ETL batch recovery." },
  { label: "System Scalability", text: "Focus on horizontal scaling, caching topologies, and microservice SLA metrics." },
];

const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";

export default function Generate() {
  const { jobProfiles, generateQA, generateState, setGenerateState, createJobProfileQuick, uploadDocument } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramJobRole = searchParams.get("jobRole");
  const paramProfileId = searchParams.get("profileId");

  // Initialize from persisted state or URL params (only once)
  const initialized = useMemo(() => {
    if (paramProfileId && paramJobRole) {
      return { profileId: paramProfileId, role: paramJobRole };
    }
    return null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 1. Job Role / Profile Selection
  const [selectedProfileId, setSelectedProfileId] = useState(
    generateState?.selectedProfileId || initialized?.profileId || ""
  );
  const [selectedRole, setSelectedRole] = useState(
    generateState?.selectedRole || initialized?.role || ""
  );
  const [roleSearch, setRoleSearch] = useState("");

  // Inline create
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleFiles, setNewRoleFiles] = useState([]);
  const [newRoleDragging, setNewRoleDragging] = useState(false);

  // Documents for selected profile
  const [profileDocs, setProfileDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Load documents when profile changes
  useEffect(() => {
    if (!selectedProfileId) {
      setProfileDocs([]);
      return;
    }
    let active = true;
    (async () => {
      setLoadingDocs(true);
      try {
        const api = (await import("../api/client.js")).default;
        const docs = await api.listDocuments(selectedProfileId);
        if (active) setProfileDocs(docs);
      } finally {
        if (active) setLoadingDocs(false);
      }
    })();
    return () => { active = false; };
  }, [selectedProfileId]);

  // Poll for doc status changes
  useEffect(() => {
    if (!selectedProfileId) return;
    const stillProcessing = profileDocs.some(
      (d) => d.status !== "indexed" && d.status !== "failed"
    );
    if (!stillProcessing) return;
    const t = setInterval(async () => {
      const api = (await import("../api/client.js")).default;
      const docs = await api.listDocuments(selectedProfileId);
      setProfileDocs(docs);
    }, 1000);
    return () => clearInterval(t);
  }, [selectedProfileId, profileDocs]);

  const indexedDocs = useMemo(
    () => profileDocs.filter((d) => d.status === "indexed"),
    [profileDocs]
  );

  const filteredProfiles = useMemo(() => {
    if (!roleSearch.trim()) return jobProfiles;
    const q = roleSearch.toLowerCase();
    return jobProfiles.filter((p) => p.name.toLowerCase().includes(q));
  }, [jobProfiles, roleSearch]);

  // 2. Prompt (per-profile, persisted)
  const profilePrompts = generateState?.profilePrompts || {};
  const [prompt, setPrompt] = useState(profilePrompts[selectedProfileId] || generateState?.prompt || "");

  // 3. Selected docs (defaults to all indexed for the active profile)
  const [selectedDocs, setSelectedDocs] = useState(generateState?.selectedDocs || []);

  // Tracks which profile the current selection belongs to, and whether the user
  // has explicitly changed it. Prevents a selection made under one profile from
  // leaking into generation for a different profile.
  const selScopeRef = useRef({
    profile: generateState?.selectedProfileId || "",
    touched: false,
  });

  useEffect(() => {
    const scope = selScopeRef.current;
    const all = indexedDocs.map((d) => d.id);

    if (scope.profile !== selectedProfileId) {
      // Profile changed: the old selection points at another profile's documents.
      scope.profile = selectedProfileId;
      scope.touched = false;
      setSelectedDocs(all);
      return;
    }

    if (scope.touched) {
      // User has chosen for this profile: keep it, drop only vanished doc ids.
      setSelectedDocs((cur) => {
        const valid = cur.filter((id) => indexedDocs.some((d) => d.id === id));
        return valid.length === cur.length ? cur : valid;
      });
      return;
    }

    // Not touched yet: restore valid ids, otherwise default to this profile's docs.
    setSelectedDocs((cur) => {
      const valid = cur.filter((id) => indexedDocs.some((d) => d.id === id));
      if (valid.length === 0) return all;
      return valid.length === cur.length ? cur : valid;
    });
  }, [selectedProfileId, indexedDocs]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Question type (persisted)
  const [questionType, setQuestionType] = useState(generateState?.questionType || "both");

  // 5. Number of questions (persisted)
  const [questionCount, setQuestionCount] = useState(generateState?.questionCount || 6);

  // Generation state (not persisted — always fresh)
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Persist form state on every change
  useEffect(() => {
    setGenerateState((prev) => ({
      ...(prev || {}),
      selectedProfileId,
      selectedRole,
      profilePrompts: {
        ...(prev?.profilePrompts || {}),
        [selectedProfileId]: prompt,
      },
      selectedDocs,
      questionType,
      questionCount,
    }));
  }, [selectedProfileId, selectedRole, prompt, selectedDocs, questionType, questionCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // When profile changes, load the saved prompt for that profile
  const prevProfileRef = useMemo(() => ({ current: selectedProfileId }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedPrompt = generateState?.profilePrompts?.[selectedProfileId];
    if (savedPrompt !== undefined && savedPrompt !== prompt) {
      setPrompt(savedPrompt);
    } else if (!savedPrompt && selectedProfileId) {
      // New profile with no saved prompt — start empty
      setPrompt("");
    }
  }, [selectedProfileId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDoc(id) {
    selScopeRef.current.touched = true;
    setSelectedDocs((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function selectAllDocs() {
    selScopeRef.current.touched = true;
    const allSelected = indexedDocs.every((d) => selectedDocs.includes(d.id));
    if (allSelected) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(indexedDocs.map((d) => d.id));
    }
  }

  // Inline profile creation
  async function handleCreateRole(e) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const profile = await createJobProfileQuick({ name: newRoleName.trim() });
      // Upload any files
      for (const file of newRoleFiles) {
        await uploadDocument(profile.id, file);
      }
      setSelectedProfileId(profile.id);
      setSelectedRole(profile.name);
      setNewRoleName("");
      setNewRoleFiles([]);
      setShowCreateRole(false);
    } finally {
      setCreatingRole(false);
    }
  }

  async function onGenerate() {
    setError("");
    if (!selectedRole.trim()) {
      setError("Please select or enter a target job role.");
      return;
    }
    // Never send documents that don't belong to the active profile.
    const docIds = selectedDocs.filter((id) => indexedDocs.some((d) => d.id === id));
    if (docIds.length === 0) {
      setError("Please select at least one indexed document for grounding.");
      return;
    }
    setGenerating(true);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const finalPrompt =
        prompt.trim() ||
        `Generate interview questions for ${selectedRole} grounded in enterprise documentation.`;

      const set = await generateQA({
        jobRole: selectedRole.trim(),
        prompt: finalPrompt,
        topK: questionCount,
        numQuestions: questionCount,
        documentIds: docIds,
        twoRound: questionType === "both",
        questionType,
        jobProfileId: selectedProfileId || undefined,
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
            {/* STEP 1: Select Job Role / Profile */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  1
                </span>
                Job Role <span className="text-red-500">*</span>
              </label>

              <div className="mt-2 space-y-2">
                {jobProfiles.length > 0 && (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        placeholder="Search saved profiles..."
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>

                    <div className="max-h-36 space-y-1 overflow-y-auto scroll-thin">
                      {filteredProfiles.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-2 text-center">No matches</p>
                      ) : (
                        filteredProfiles.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProfileId(p.id);
                              setSelectedRole(p.name);
                              setRoleSearch("");
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition cursor-pointer ${
                              selectedProfileId === p.id
                                ? "border-brand-400 bg-brand-50 font-semibold"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              selectedProfileId === p.id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                            }`}>
                              {selectedProfileId === p.id && <Check size={10} />}
                            </span>
                            <span className="truncate font-semibold text-slate-800">{p.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or type a job role..."
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      setSelectedProfileId("");
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateRole(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors shrink-0 cursor-pointer"
                    title="Create new job profile with documents"
                  >
                    <Plus size={13} /> New
                  </button>
                </div>
              </div>
            </div>

            {/* STEP 2: Prompt */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  2
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

            {/* STEP 3: Documents (auto-loaded from profile) */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    3
                  </span>
                  Documents <span className="text-red-500">*</span>
                  {selectedDocs.length > 0 && (
                    <span className="ml-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      {selectedDocs.length} selected
                    </span>
                  )}
                </label>
                {indexedDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllDocs}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {indexedDocs.every((d) => selectedDocs.includes(d.id)) ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {!selectedProfileId ? (
                <div className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-800">
                  Select a job profile above to load its documents.
                </div>
              ) : loadingDocs ? (
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  Loading documents...
                </div>
              ) : profileDocs.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-800">
                  No documents uploaded for this profile yet.{" "}
                  <a href={`/job-profiles/${selectedProfileId}/documents`} className="font-semibold underline">
                    Upload documents
                  </a>
                </div>
              ) : (
                <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto scroll-thin pr-1">
                  {profileDocs.map((d) => {
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
                            isSel ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
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
                  })}
                </div>
              )}
            </div>

            {/* STEP 4: Question Type */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  4
                </span>
                Question Type
              </label>
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

            {/* STEP 5: Number of Questions (slider only) */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  5
                </span>
                Number of Questions
              </label>
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
            <GeneratingState role={selectedRole || "Selected Role"} />
          )}

          {!generating && result && (
            <div className="space-y-4 animate-fade-in-up">
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-2"
              >
                &larr; Back to setup
              </button>
              <ResultView
                result={result}
                onViewAll={() => navigate(`/results?setId=${result.id}`)}
              />
            </div>
          )}
        </div>
      )}

      {/* Inline Create Job Profile Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">New Job Profile</h3>
                  <p className="text-xs text-slate-500">Create a job role and optionally upload docs</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreateRole(false); setNewRoleName(""); setNewRoleFiles([]); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Job Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. DevOps Intern"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Optional file upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Documents <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setNewRoleDragging(true); }}
                  onDragLeave={() => setNewRoleDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setNewRoleDragging(false); setNewRoleFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                  onClick={() => document.getElementById("inline-file-input")?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-4 text-center transition-all ${
                    newRoleDragging
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-slate-50/50 hover:border-brand-400"
                  }`}
                >
                  <input
                    id="inline-file-input"
                    type="file"
                    multiple
                    accept={ACCEPTED_DOCS}
                    className="hidden"
                    onChange={(e) => { setNewRoleFiles((prev) => [...prev, ...Array.from(e.target.files)]); e.target.value = ""; }}
                  />
                  <Upload size={18} className="text-slate-400" />
                  <p className="mt-1.5 text-xs font-semibold text-slate-600">Drop files or click to browse</p>
                  <p className="text-[10px] text-slate-400">PDF, DOCX, TXT, PPTX, images</p>
                </div>
                {newRoleFiles.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto scroll-thin">
                    {newRoleFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded bg-white px-2.5 py-1 ring-1 ring-inset ring-slate-100">
                        <FileText size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-700 truncate flex-1">{f.name}</span>
                        <span className="text-[10px] text-slate-400">{formatBytes(f.size)}</span>
                        <button type="button" onClick={() => setNewRoleFiles((prev) => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 cursor-pointer"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" size="sm" onClick={() => { setShowCreateRole(false); setNewRoleName(""); setNewRoleFiles([]); }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creatingRole}>
                  {creatingRole ? "Creating..." : newRoleFiles.length > 0 ? "Create & Upload" : "Create Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GeneratingState({ role }) {
  const steps = [
    `Analyzing requirements for ${role}`,
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
        {steps.map((s) => (
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
            <h3 className="mt-2 text-lg font-bold text-slate-900">{result.jobRole}</h3>
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
