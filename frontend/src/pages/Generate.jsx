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

const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";
const ACCEPTED_JOB_DESCRIPTION = ".pdf,application/pdf";
const EXPERIENCE_DIFFICULTY_LABELS = {
  beginner: "Foundational (0-2 years)",
  intermediate: "Intermediate (3-5 years)",
  advanced: "Advanced (6+ years)",
};

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
  const [newRoleJobDescription, setNewRoleJobDescription] = useState(null);
  const [newRoleDragging, setNewRoleDragging] = useState(false);
  const jobDescriptionInputRef = useRef(null);

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
  const selectedProfile = jobProfiles.find((profile) => profile.id === selectedProfileId);

  // 2. Selected docs (defaults to all indexed for the active profile)
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

  // 3. Question type (persisted)
  const [questionType, setQuestionType] = useState(generateState?.questionType || "both");

  // 4. Number of questions (persisted)
  const [questionCount, setQuestionCount] = useState(generateState?.questionCount || 6);

  // Generation state (not persisted — always fresh)
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Persist form state on every change
  useEffect(() => {
    setGenerateState((prev) => {
      const next = { ...(prev || {}) };
      delete next.prompt;
      delete next.profilePrompts;
      return {
        ...next,
        selectedProfileId,
        selectedRole,
        selectedDocs,
        questionType,
        questionCount,
      };
    });
  }, [selectedProfileId, selectedRole, selectedDocs, questionType, questionCount]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const profile = await createJobProfileQuick({
        name: newRoleName.trim(),
        jobDescriptionFile: newRoleJobDescription || undefined,
      });
      // Upload any files
      for (const file of newRoleFiles) {
        await uploadDocument(profile.id, file);
      }
      setSelectedProfileId(profile.id);
      setSelectedRole(profile.name);
      setNewRoleName("");
      setNewRoleFiles([]);
      setNewRoleJobDescription(null);
      setShowCreateRole(false);
    } catch (e) {
      setError(e.message || "Could not create the job profile.");
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
      const set = await generateQA({
        jobRole: selectedRole.trim(),
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

  const selectedIndexedDocs = indexedDocs.filter((doc) => selectedDocs.includes(doc.id));
  const setupSteps = [
    { label: "Target role", complete: Boolean(selectedRole.trim()) },
    { label: "Source material", complete: selectedIndexedDocs.length > 0 },
    { label: "Question format", complete: Boolean(questionType && questionCount) },
  ];
  const currentStepIndex = setupSteps.findIndex((step) => !step.complete);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-[#3A332D] bg-[#25201B] px-5 py-6 text-[#FBF8F1] shadow-[0_14px_34px_rgba(37,32,27,0.16)] sm:px-7 sm:py-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-9 select-none font-display text-[150px] leading-none text-white/[0.035] sm:right-8 sm:text-[180px]">
          02
        </span>
        <div className="relative z-[1] flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8B36E]">
              The Interview Fieldbook <span className="mx-1 text-white/30">/</span> Assessment builder
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Build the interview around the work.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#D9CCBA]">
              Choose a role, ground it in company material, then set the shape of the conversation.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 border-t border-white/10 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <span className="font-display text-4xl font-semibold leading-none text-[#D8B36E]">{questionCount}</span>
            <span className="max-w-[95px] text-[10px] font-semibold uppercase leading-4 tracking-[0.14em] text-[#D9CCBA]">
              questions<br />in this set
            </span>
          </div>
        </div>
      </section>

      <ol aria-label="Interview setup progress" className="grid gap-2 sm:grid-cols-3">
        {setupSteps.map((step, index) => {
          const isCurrent = currentStepIndex === index;
          return (
            <li
              key={step.label}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                step.complete
                  ? "border-[#D8CCB9] bg-[#FBF8F1]"
                  : isCurrent
                    ? "border-[#A84431]/35 bg-[#F8EAE4]/70"
                    : "border-[#D8CCB9]/70 bg-[#FBF8F1]/55"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                step.complete
                  ? "bg-[#25201B] text-[#D8B36E]"
                  : isCurrent
                    ? "bg-[#A84431] text-[#FBF8F1]"
                    : "border border-[#CBBBA5] text-slate-500"
              }`}>
                {step.complete ? <Check size={13} aria-hidden="true" /> : `0${index + 1}`}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-[#25201B]">{step.label}</span>
                <span className="mt-0.5 block text-[10px] text-slate-600">
                  {step.complete ? "Ready" : isCurrent ? "Next decision" : "Up next"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className={`grid grid-cols-1 gap-5 xl:items-start ${generating || result ? "xl:grid-cols-[minmax(350px,0.82fr)_minmax(0,1.18fr)]" : "xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.72fr)]"}`}>
        {/* Interview setup */}
        <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[#3A332D] bg-[#25201B] px-5 py-4 text-[#FBF8F1]">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8B36E]/25 bg-[#D8B36E]/10 text-[#D8B36E]">
                <Briefcase size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#D8B36E]">Step 01</p>
                <h3 className="mt-0.5 text-sm font-bold text-[#FBF8F1]">Choose a target role</h3>
              </div>
            </div>
            <span className="hidden text-[10px] text-[#B9AA98] sm:block">Saved profile or custom role</span>
          </div>

          <div className="space-y-5 p-5">
            {/* STEP 1: Select Job Role / Profile */}
            <div>
              <label className="block text-xs font-bold text-slate-800" htmlFor="target-job-role">
                Job role <span className="text-red-500">*</span>
              </label>

              <div className="mt-2 space-y-2">
                {jobProfiles.length > 0 && (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        aria-label="Search saved job profiles"
                        placeholder="Search saved profiles..."
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>

                    <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto scroll-thin pr-1 sm:grid-cols-2">
                      {filteredProfiles.length === 0 ? (
                        <p className="col-span-full py-2 text-center text-[11px] text-slate-500">No matching profiles. Enter a role below.</p>
                      ) : (
                        filteredProfiles.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={selectedProfileId === p.id}
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
                    id="target-job-role"
                    type="text"
                    placeholder="Select above or enter a custom role"
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      setSelectedProfileId("");
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setShowCreateRole(true);
                    }}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600"
                    title="Create new job profile with documents"
                  >
                    <Plus size={13} aria-hidden="true" /> New profile
                  </button>
                </div>
                {selectedProfile && (
                  <div className="rounded-xl border border-[#D8CCB9] bg-[#F7F1E8] p-3.5 text-[11px] text-slate-600">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#25201B]">Attached job description</p>
                        <p className="mt-0.5 truncate" title={selectedProfile.jobDescriptionName || undefined}>
                          {selectedProfile.jobDescriptionName
                            ? `${selectedProfile.jobDescriptionName}${selectedProfile.jobDescriptionWordCount != null ? ` · ${selectedProfile.jobDescriptionWordCount} words` : ""}`
                            : "No job description attached"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/job-profiles/${selectedProfile.id}/documents`)}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[#D8CCB9] bg-[#FBF8F1] px-2.5 text-[10px] font-semibold text-[#4F4337] transition hover:border-brand-300 hover:text-brand-700"
                      >
                        <FileText size={12} aria-hidden="true" />
                        Manage JD
                      </button>
                    </div>
                    {selectedProfile.skills?.length > 0 ? (
                      <p className="mt-2">
                        <span className="font-semibold text-slate-700">Extracted skills: </span>
                        {selectedProfile.skills.join(", ")}
                      </p>
                    ) : selectedProfile.jobDescriptionName ? (
                      <p className="mt-2">No recognized skills were extracted.</p>
                    ) : (
                      <p className="mt-2">Questions will use the role and selected documents.</p>
                    )}
                    <p className="mt-1">
                      <span className="font-semibold text-slate-700">Experience required: </span>
                      {selectedProfile.experienceRequirement || "Not mentioned"}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-700">Question difficulty: </span>
                      {EXPERIENCE_DIFFICULTY_LABELS[selectedProfile.difficultyLevel] ||
                        (selectedProfile.experienceRequirement
                          ? "Standard"
                          : "Standard (experience not mentioned)")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[#E2D6C4] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8CCB9] bg-[#F0E7D7] text-[#6E5424]">
                <FileText size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6E5424]">Step 02</p>
                <h3 className="mt-0.5 text-sm font-bold text-[#25201B]">Choose source material</h3>
              </div>
            </div>
            <span className="rounded-full border border-[#D8CCB9] bg-[#F7F1E8] px-2.5 py-1 text-[10px] font-semibold text-[#4F4337]">
              {selectedIndexedDocs.length} selected
            </span>
          </div>

          <div className="p-5">
            {/* STEP 2: Documents (auto-loaded from profile) */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Indexed reference documents <span className="text-red-500">*</span></p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Only ready sources can ground questions.</p>
                </div>
                {indexedDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllDocs}
                    className="inline-flex min-h-8 items-center rounded-lg px-2.5 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50"
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
                <div role="status" className="mt-3 rounded-xl border border-[#E2D6C4] bg-[#F7F1E8] p-4 text-xs text-slate-600">
                  Loading documents...
                </div>
              ) : profileDocs.length === 0 ? (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-[#CBBBA5] bg-[#F7F1E8] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-600">
                    No reference documents are attached to this profile yet. Upload company material to ground the generated answers.
                  </p>
                  <a
                    href={`/job-profiles/${selectedProfileId}/documents`}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#D8CCB9] bg-[#FBF8F1] px-3 text-xs font-semibold text-[#4F4337] transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <Upload size={13} aria-hidden="true" />
                    Manage sources
                  </a>
                </div>
              ) : (
                <div className="mt-3 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto scroll-thin pr-1 md:grid-cols-2">
                  {profileDocs.map((d) => {
                    const isIndexed = d.status === "indexed";
                    const isSel = selectedDocs.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!isIndexed}
                        aria-pressed={isSel}
                        title={!isIndexed ? "Available after indexing is complete" : undefined}
                        onClick={() => isIndexed && toggleDoc(d.id)}
                        className={`flex min-h-[58px] w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                          !isIndexed
                            ? "cursor-not-allowed border-[#E2D6C4] bg-[#F7F1E8] opacity-70"
                            : isSel
                            ? "cursor-pointer border-brand-300 bg-brand-50 font-semibold"
                            : "cursor-pointer border-[#E2D6C4] bg-[#FBF8F1] hover:border-brand-200 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSel ? "border-brand-600 bg-brand-600 text-white" : "border-[#CBBBA5] bg-white"
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
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2.5 border-b border-[#E2D6C4] px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] text-[#A84431]">
              <SlidersHorizontal size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#A84431]">Step 03</p>
              <h3 className="mt-0.5 text-sm font-bold text-[#25201B]">Set the question mix</h3>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="text-xs font-bold text-slate-800">Question type</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Choose what candidates should demonstrate.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { value: "knowledge", label: "Knowledge", desc: "Concepts & policies" },
                  { value: "skill", label: "Skill", desc: "Applied scenarios" },
                  { value: "both", label: "Both", desc: "Knowledge + Skill" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={questionType === opt.value}
                    onClick={() => setQuestionType(opt.value)}
                    className={`min-h-[82px] rounded-xl border p-3 text-left transition-all ${
                      questionType === opt.value
                        ? "border-brand-400 bg-brand-50 text-brand-800 shadow-[inset_0_0_0_1px_rgba(168,68,49,0.12)]"
                        : "border-[#E2D6C4] bg-[#FBF8F1] text-slate-600 hover:border-brand-200 hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {questionType === opt.value && <Check size={14} aria-hidden="true" className="text-brand-700" />}
                    </span>
                    <span className="mt-1.5 block text-[10px] leading-4 text-slate-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E2D6C4] pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800" htmlFor="question-count">
                    Set length
                  </label>
                  <p className="mt-0.5 text-[10px] text-slate-500">Choose between 2 and 20 questions.</p>
                </div>
                <output htmlFor="question-count" className="font-display text-3xl font-semibold leading-none text-[#A84431]">
                  {questionCount}
                </output>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="w-4 text-center text-[10px] font-medium text-slate-500">2</span>
                <div className="relative flex-1">
                  <input
                    id="question-count"
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    aria-valuetext={`${questionCount} questions`}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                  />
                </div>
                <span className="w-5 text-center text-[10px] font-medium text-slate-500">20</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Results */}
      {(generating || result) && (
        <div className="min-w-0 animate-fade-in-up">
          {generating && (
            <GeneratingState role={selectedRole || "Selected Role"} questionCount={questionCount} />
          )}

          {!generating && result && (
            <div className="space-y-4 animate-fade-in-up">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                <ChevronRight size={14} aria-hidden="true" className="rotate-180" />
                Back to setup
              </button>
              <ResultView
                result={result}
                onViewAll={() => navigate(`/results?setId=${result.id}`)}
              />
            </div>
          )}
        </div>
      )}

      {!generating && !result && (
        <aside className="min-w-0 xl:sticky xl:top-28">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[#3A332D] bg-[#25201B] px-5 py-4 text-[#FBF8F1]">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#D8B36E]">Draft review</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Your interview brief</h3>
              <p className="mt-1 text-[11px] leading-5 text-[#B9AA98]">
                A quick read-back before you build the question set.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <dl className="divide-y divide-[#E2D6C4]">
                <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
                  <dt className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Target role</dt>
                  <dd className="min-w-0 text-right text-xs font-semibold text-[#25201B]">
                    {selectedRole.trim() || "Choose or enter a role"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Grounding</dt>
                  <dd className="text-right text-xs font-semibold text-[#25201B]">
                    {selectedIndexedDocs.length
                      ? `${selectedIndexedDocs.length} of ${indexedDocs.length} sources`
                      : "No sources selected"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Question mix</dt>
                  <dd className="text-right text-xs font-semibold text-[#25201B]">
                    {questionType === "both"
                      ? "Knowledge + Skill"
                      : questionType === "knowledge"
                        ? "Knowledge"
                        : "Skill"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 pb-0">
                  <dt className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Set length</dt>
                  <dd className="text-right text-xs font-semibold text-[#25201B]">{questionCount} questions</dd>
                </div>
              </dl>

              <div
                role="status"
                className={`rounded-xl border px-3.5 py-3 ${
                  selectedRole.trim() && selectedIndexedDocs.length
                    ? "border-[#D8CCB9] bg-[#F7F1E8]"
                    : "border-[#E4B7A8] bg-[#F8EAE4]/70"
                }`}
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-[#25201B]">
                  <span className={`h-2 w-2 rounded-full ${
                    selectedRole.trim() && selectedIndexedDocs.length ? "bg-[#6E5424]" : "bg-[#A84431]"
                  }`} />
                  {selectedRole.trim() && selectedIndexedDocs.length ? "Ready to generate" : "A couple of details are needed"}
                </p>
                <p className="mt-1 pl-4 text-[10px] leading-4 text-slate-600">
                  {selectedRole.trim() && selectedIndexedDocs.length
                    ? "The selected reference files will ground the generated answers."
                    : !selectedRole.trim()
                      ? "Choose a target role and at least one indexed source."
                      : "Select at least one indexed source to ground the answers."}
                </p>
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] px-3.5 py-3 text-xs font-semibold text-[#893A2A]">
                  <AlertCircle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}

              <Button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                size="lg"
                className="min-h-12 w-full !rounded-xl !bg-[#A84431] font-semibold !text-[#FBF8F1] shadow-sm hover:!bg-[#893A2A]"
              >
                <Sparkles size={16} aria-hidden="true" />
                Generate {questionCount} questions
              </Button>
              <p className="text-center text-[10px] leading-4 text-slate-500">
                Answers include source references. Requests outside the selected material are flagged.
              </p>
            </div>
          </Card>
        </aside>
      )}

      </div>

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
                onClick={() => {
                  setShowCreateRole(false);
                  setNewRoleName("");
                  setNewRoleFiles([]);
                  setNewRoleJobDescription(null);
                  setError("");
                }}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Job Description <span className="text-slate-400 font-normal">(optional PDF)</span>
                </label>
                <input
                  ref={jobDescriptionInputRef}
                  type="file"
                  accept={ACCEPTED_JOB_DESCRIPTION}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && !file.name.toLowerCase().endsWith(".pdf")) {
                      setError("Job descriptions must be PDF files.");
                    } else {
                      setError("");
                      setNewRoleJobDescription(file || null);
                    }
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => jobDescriptionInputRef.current?.click()}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs text-slate-600"
                  >
                    <Upload size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">
                      {newRoleJobDescription?.name || "Upload PDF to extract skills and experience"}
                    </span>
                  </button>
                  {newRoleJobDescription && (
                    <button
                      type="button"
                      aria-label="Remove job description"
                      onClick={() => {
                        setNewRoleJobDescription(null);
                        setError("");
                      }}
                      className="rounded p-1 text-slate-400 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
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

              {error && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" size="sm" onClick={() => {
                  setShowCreateRole(false);
                  setNewRoleName("");
                  setNewRoleFiles([]);
                  setNewRoleJobDescription(null);
                  setError("");
                }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creatingRole || Boolean(error)}>
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

function GeneratingState({ role, questionCount }) {
  return (
    <Card role="status" aria-live="polite" className="overflow-hidden p-0">
      <div className="border-b border-[#3A332D] bg-[#25201B] px-5 py-6 text-[#FBF8F1] sm:px-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8B36E]/30 bg-[#D8B36E]/10 text-[#D8B36E]">
            <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#D8B36E]">Working from your sources</p>
            <h3 className="mt-1 font-display text-xl font-semibold">Shaping the question set</h3>
            <p className="mt-1 text-xs leading-5 text-[#B9AA98]">
              Preparing {questionCount} questions for {role}. This may take a moment.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Drafting question cards</p>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            aria-hidden="true"
            className="flex animate-pulse items-center gap-3 rounded-xl border border-[#E2D6C4] bg-[#F7F1E8] p-4"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <span className="h-7 w-7 shrink-0 rounded-lg bg-[#E2D6C4]" />
            <span className="flex-1 space-y-2">
              <span className="block h-2.5 w-4/5 rounded bg-[#E2D6C4]" />
              <span className="block h-2 w-2/5 rounded bg-[#E2D6C4]" />
            </span>
          </div>
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
