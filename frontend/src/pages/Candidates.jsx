import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Briefcase,
  Trash2,
  Sparkles,
  Clock,
  FileText,
  Upload,
  Layers,
  X,
  FolderOpen,
  FilePlus2,
  ChevronDown,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, EmptyState, StatusBadge } from "../components/ui.jsx";
import { formatDateTime, formatBytes } from "../lib/format.js";

const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";
const ACCEPTED_JOB_DESCRIPTION = ".pdf,application/pdf";

function ProfileCard({ profile, onDelete, onGenerate, onViewDocs }) {
  const [docs, setDocs] = useState([]);
  const [docsError, setDocsError] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function loadDocuments() {
    setLoadingDocs(true);
    setDocsError("");
    try {
      const result = await import("../api/client.js").then((m) =>
        m.default.listDocuments(profile.id)
      );
      setDocs(result);
    } catch (error) {
      setDocsError(error.message || "Unable to load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    await loadDocuments();
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`profile-sources-${profile.id}`}
          onClick={toggleExpand}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A84431]"
        >
          <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D8CCB9] bg-[#F0E7D7] text-[#6E5424]">
            <Briefcase size={19} strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-md border border-[#FBF8F1] bg-[#D8B36E] text-[#211B17]">
              <Layers size={9} strokeWidth={2} />
            </span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[#25201B]">{profile.name}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Clock size={12} aria-hidden="true" />
              <span>Created {formatDateTime(profile.createdAt)}</span>
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600">
              <FileText size={12} aria-hidden="true" className="shrink-0 text-[#A84431]" />
              <span className="truncate">
                {profile.jobDescriptionName
                  ? `${profile.jobDescriptionName}${profile.jobDescriptionWordCount != null ? ` · ${profile.jobDescriptionWordCount} words` : ""}`
                  : "No job description attached"}
              </span>
            </span>
            <span className="mt-1 block text-[11px] font-medium text-[#A84431]">
              {expanded ? "Hide source preview" : "Preview attached sources"}
            </span>
          </span>

          <ChevronDown
            size={17}
            aria-hidden="true"
            className={`shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => onViewDocs(profile)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#D8CCB9] bg-[#FBF8F1] px-3 text-xs font-semibold text-[#4F4337] transition hover:border-[#A84431]/40 hover:bg-[#F7F1E8] hover:text-[#873727]"
          >
            <FolderOpen size={13} aria-hidden="true" />
            Manage sources
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(profile);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#A84431] px-3 text-xs font-bold text-[#FBF8F1] shadow-sm transition-colors hover:bg-[#873727]"
          >
            <Sparkles size={12} aria-hidden="true" /> Generate
          </button>
          <button
            type="button"
            aria-label={`Delete ${profile.name}`}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${profile.name}" and all its documents? This cannot be undone.`)) {
                onDelete(profile.id);
              }
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8CCB9] bg-[#FBF8F1] text-slate-500 transition-colors hover:border-[#E4B7A8] hover:bg-[#F8EAE4] hover:text-[#893A2A]"
            title="Delete profile"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        id={`profile-sources-${profile.id}`}
        hidden={!expanded}
        className="border-t border-[#E2D6C4] bg-[#F7F1E8]/70 px-4 py-4 sm:px-5"
      >
          <section className="mb-4 rounded-xl border border-[#D8CCB9] bg-[#FBF8F1] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#6D5E4E]">
                  Job description
                </h4>
                <p className="mt-1 truncate text-sm font-semibold text-[#25201B]">
                  {profile.jobDescriptionName || "No job description attached"}
                </p>
              </div>
              {profile.jobDescriptionName && profile.jobDescriptionWordCount != null && (
                <span className="rounded-full border border-[#D8CCB9] bg-[#F0E7D7] px-2.5 py-1 text-[10px] font-semibold text-[#4F4337]">
                  {profile.jobDescriptionWordCount} words extracted
                </span>
              )}
            </div>
            {profile.jobDescriptionName ? (
              <>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <p className="rounded-lg bg-[#F7F1E8] px-3 py-2 text-slate-600">
                    <span className="font-semibold text-[#4F4337]">Experience: </span>
                    {profile.experienceRequirement || "Not specified"}
                  </p>
                  <p className="rounded-lg bg-[#F7F1E8] px-3 py-2 text-slate-600">
                    <span className="font-semibold text-[#4F4337]">Question level: </span>
                    <span className="capitalize">{profile.difficultyLevel || "Standard"}</span>
                  </p>
                </div>
                {profile.skills?.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                      Extracted skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-[#D8CCB9] bg-white px-2.5 py-1 text-[10px] font-medium text-[#4F4337]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-600">No recognized skills were extracted.</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                Add a JD from Manage sources to extract and display skills and experience.
              </p>
            )}
          </section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#6D5E4E]">
              Source preview <span className="font-medium normal-case tracking-normal">({docs.length})</span>
            </h4>
          </div>
          {loadingDocs ? (
            <p role="status" className="py-2 text-xs text-slate-500">Loading source documents...</p>
          ) : docsError ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 py-2 text-xs text-[#893A2A]">
              <span>{docsError}</span>
              <button
                type="button"
                onClick={loadDocuments}
                className="font-semibold underline underline-offset-2 hover:text-[#64291F]"
              >
                Try again
              </button>
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#CBBBA5] bg-[#FBF8F1] px-4 py-3">
              <p className="text-xs text-slate-600">
                {profile.jobDescriptionName
                  ? "No supporting reference documents uploaded yet. The job description is shown above."
                  : "No sources uploaded yet. Add a job description or supporting documents."}
              </p>
              <button
                type="button"
                onClick={() => onViewDocs(profile)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#A84431] px-3 text-xs font-semibold text-[#FBF8F1] transition hover:bg-[#873727]"
              >
                <FilePlus2 size={13} aria-hidden="true" /> Add sources
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[#E2D6C4] bg-[#FBF8F1] px-3 py-2.5"
                >
                  <FileText size={14} aria-hidden="true" className="shrink-0 text-[#A84431]" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#25201B]">
                    {doc.name}
                  </span>
                  <StatusBadge status={doc.status} />
                  {doc.status === "indexed" && (
                    <span className="text-[10px] text-slate-500">{doc.chunks} chunks</span>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </Card>
  );
}

export default function JobProfiles() {
  const { jobProfiles, loading, deleteJobProfile, createJobProfile, uploadDocument } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const jobDescriptionInputRef = useRef(null);

  const profiles = useMemo(() => {
    if (!searchQuery.trim()) return jobProfiles;
    const q = searchQuery.toLowerCase();
    return jobProfiles.filter((p) => p.name.toLowerCase().includes(q));
  }, [jobProfiles, searchQuery]);
  const profilesWithDescription = jobProfiles.filter((profile) => profile.jobDescriptionName).length;

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    setPendingFiles((prev) => [...prev, ...files]);
  }

  function removePendingFile(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function resetModal() {
    setShowAddProfile(false);
    setNewProfileName("");
    setPendingFiles([]);
    setJobDescriptionFile(null);
    setProfileError("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setCreating(true);
    setProfileError("");
    try {
      const profile = await createJobProfile({
        name: newProfileName.trim(),
        jobDescriptionFile: jobDescriptionFile || undefined,
      });
      // Upload any pending files to the new profile
      for (const file of pendingFiles) {
        await uploadDocument(profile.id, file);
      }
      resetModal();
      // Navigate to the new profile's documents page
      navigate(`/job-profiles/${profile.id}/documents`);
    } catch (error) {
      setProfileError(error.message || "Could not create the job profile.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-[#3A332D] bg-[#25201B] px-5 py-6 text-[#FBF8F1] shadow-[0_14px_34px_rgba(37,32,27,0.16)] sm:px-7 sm:py-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-9 select-none font-display text-[150px] leading-none text-white/[0.035] sm:right-8 sm:text-[180px]">
          01
        </span>
        <div className="relative z-[1] flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8B36E]">
              The Interview Fieldbook <span className="mx-1 text-white/30">/</span> Role library
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Keep every role brief close at hand.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#D9CCBA]">
              Manage job descriptions and reference sources together, then build an interview from the same profile.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-white/10 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <div className="min-w-[88px]">
              <p className="font-display text-3xl font-semibold leading-none text-[#D8B36E]">{jobProfiles.length}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#D9CCBA]">Profiles</p>
            </div>
            <div className="min-w-[88px]">
              <p className="font-display text-3xl font-semibold leading-none text-[#D8B36E]">{profilesWithDescription}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#D9CCBA]">With a JD</p>
            </div>
            <Button
              size="sm"
              className="min-h-10 !bg-[#A84431] !text-[#FBF8F1] hover:!bg-[#873727]"
              onClick={() => setShowAddProfile(true)}
            >
              <Briefcase size={14} aria-hidden="true" /> Add Job Profile
            </Button>
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={15}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            aria-label="Search job profiles"
            placeholder="Search role library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#D8CCB9] bg-[#FBF8F1] py-2.5 pl-10 pr-3 text-sm text-[#25201B] outline-none transition focus:border-[#A84431]/60 focus:ring-2 focus:ring-[#A84431]/15 placeholder:text-slate-500"
          />
        </div>
        <p className="px-1 text-xs font-medium text-slate-600">
          Showing <span className="font-semibold text-[#25201B]">{profiles.length}</span> of {jobProfiles.length}{" "}
          {jobProfiles.length === 1 ? "profile" : "profiles"}
        </p>
      </Card>

      {/* Job Profiles List */}
      <div className="space-y-3" aria-busy={loading}>
        {loading ? (
          Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="p-5" aria-hidden="true">
              <div className="flex animate-pulse items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            </Card>
          ))
        ) : profiles.length === 0 ? (
          <Card className="p-8 text-center">
            <EmptyState
              icon={Briefcase}
              title={searchQuery ? "No matching job profiles" : "No job profiles yet"}
              action={
                !searchQuery ? (
                  <Button
                    size="sm"
                    onClick={() => setShowAddProfile(true)}
                    className="!bg-[#A84431] !text-[#FBF8F1] hover:!bg-[#873727]"
                  >
                    <Briefcase size={14} /> Create First Profile
                  </Button>
                ) : null
              }
            >
              {!searchQuery
                ? "Create job profiles like DevOps Intern or Backend Developer to organize your interview assessments."
                : "Try adjusting your search filter."}
            </EmptyState>
          </Card>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onDelete={deleteJobProfile}
              onGenerate={(p) => navigate(`/generate?jobRole=${encodeURIComponent(p.name)}&profileId=${p.id}`)}
              onViewDocs={(p) => navigate(`/job-profiles/${p.id}/documents`)}
            />
          ))
        )}
      </div>

      {/* Add Job Profile Modal */}
      {showAddProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-job-profile-title"
            className="max-h-[min(90vh,760px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#D8CCB9] bg-[#FBF8F1] p-5 shadow-2xl animate-fade-in-up sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-[#E2D6C4] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8CCB9] bg-[#F0E7D7] text-[#A84431]">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 id="add-job-profile-title" className="font-display text-lg font-semibold text-[#25201B]">
                    Add Job Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set up a role, then keep its description and sources together.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close add job profile"
                onClick={resetModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-[#F0E7D7] hover:text-[#25201B]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              {/* Job Role Name */}
              <div>
                <label className="block text-xs font-semibold text-[#4F4337]">
                  Job Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. DevOps Intern"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#D8CCB9] bg-white px-3.5 py-2.5 text-sm text-[#25201B] outline-none transition focus:border-[#A84431]/70 focus:ring-2 focus:ring-[#A84431]/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4F4337]">
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
                      setJobDescriptionFile(null);
                      setProfileError("Job descriptions must be PDF files.");
                    } else {
                      setProfileError("");
                      setJobDescriptionFile(file || null);
                    }
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#CBBBA5] bg-[#F7F1E8] px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => jobDescriptionInputRef.current?.click()}
                    className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left text-xs text-slate-600 transition hover:text-[#A84431]"
                  >
                    <Upload size={14} aria-hidden="true" className="shrink-0 text-[#A84431]" />
                    <span className="truncate">
                      {jobDescriptionFile?.name || "Upload a PDF to extract required skills and experience"}
                    </span>
                  </button>
                  {jobDescriptionFile && (
                    <button
                      type="button"
                      aria-label="Remove job description"
                      onClick={() => {
                        setJobDescriptionFile(null);
                        setProfileError("");
                      }}
                      className="rounded p-1 text-slate-400 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
                  During setup, extracted skills guide topics and experience helps calibrate difficulty. Use Manage sources to replace the JD or add supporting documents later.
                </p>
              </div>

              {/* Document Upload Area */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4F4337]">
                  Supporting documents <span className="font-normal text-slate-500">(optional — upload now or later)</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose or drop supporting documents"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A84431] ${
                    dragging
                      ? "border-[#A84431] bg-[#F7F1E8]"
                      : "border-[#D8CCB9] bg-white/60 hover:border-[#A84431]/60 hover:bg-[#F7F1E8]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_DOCS}
                    className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  />
                  <div className="rounded-lg border border-[#E2D6C4] bg-[#FBF8F1] p-2 text-[#A84431] shadow-sm">
                    <Upload size={18} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#4F4337]">
                    Drop files here or click to browse
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    PDF, DOCX, TXT, PPTX, MD, images
                  </p>
                </div>

                {profileError && (
                  <p role="alert" className="text-xs font-semibold text-red-600">
                    {profileError}
                  </p>
                )}

                {/* Pending Files List */}
                {pendingFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto scroll-thin">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 rounded-lg border border-[#E2D6C4] bg-white px-3 py-1.5"
                      >
                        <FileText size={13} aria-hidden="true" className="shrink-0 text-[#A84431]" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#25201B]">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {formatBytes(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingFile(idx)}
                          aria-label={`Remove ${file.name}`}
                          className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-[#F8EAE4] hover:text-[#893A2A]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E2D6C4] pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || Boolean(profileError)}
                  className="min-h-10 !bg-[#A84431] !text-[#FBF8F1] hover:!bg-[#873727]"
                >
                  {creating ? (
                    "Creating..."
                  ) : pendingFiles.length > 0 ? (
                    <>
                      <FilePlus2 size={14} /> Create & Upload
                    </>
                  ) : (
                    "Create Profile"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
