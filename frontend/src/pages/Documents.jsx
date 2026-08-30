import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  FileText,
  FileType,
  FileImage,
  Trash2,
  Layers,
  FilePlus2,
  Folder,
  Users,
  UserPlus,
  FileCheck2,
  Sparkles,
  User,
  Mail,
  Briefcase,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, StatusBadge, EmptyState } from "../components/ui.jsx";
import { formatBytes, formatDateTime } from "../lib/format.js";


const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";

function iconFor(ext) {
  if ([".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"].includes(ext))
    return FileImage;
  if ([".pdf"].includes(ext)) return FileType;
  return FileText;
}

export default function Documents() {
  const {
    documents,
    candidates,
    uploadDocument,
    deleteDocument,
    createCandidate,
    deleteCandidate,
  } = useApp();

  const [activeFolder, setActiveFolder] = useState("enterprise"); // "enterprise" | "candidates"
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Add Candidate modal state
  const [showAddCandModal, setShowAddCandModal] = useState(false);
  const [candName, setCandName] = useState("");
  const [candRole, setCandRole] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candResume, setCandResume] = useState(null);
  const [candSkills, setCandSkills] = useState("");
  const [candSummary, setCandSummary] = useState("");
  const [savingCand, setSavingCand] = useState(false);
  const [candError, setCandError] = useState("");
  const candResumeInputRef = useRef(null);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        await uploadDocument(f);
      }
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleCreateCandidate(e) {
    e.preventDefault();
    setCandError("");
    if (!candName.trim()) {
      setCandError("Please enter the candidate's name.");
      return;
    }
    if (!candRole.trim()) {
      setCandError("Please enter the target job role.");
      return;
    }
    setSavingCand(true);
    try {
      const skillsArray = candSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createCandidate({
        name: candName.trim(),
        email: candEmail.trim(),
        targetRole: candRole.trim(),
        resumeFile: candResume,
        skills: skillsArray.length ? skillsArray : undefined,
        summary: candSummary.trim() || undefined,
      });

      setCandName("");
      setCandRole("");
      setCandEmail("");
      setCandResume(null);
      setCandSkills("");
      setCandSummary("");
      setShowAddCandModal(false);
    } catch (err) {
      setCandError(err.message || "Failed to create candidate.");
    } finally {
      setSavingCand(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Folder Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveFolder("enterprise")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeFolder === "enterprise"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Folder size={16} className={activeFolder === "enterprise" ? "text-brand-600" : "text-slate-400"} />
            Enterprise Knowledge Base
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                activeFolder === "enterprise"
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFolder("candidates")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeFolder === "candidates"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={16} className={activeFolder === "candidates" ? "text-brand-600" : "text-slate-400"} />
            Candidate Profiles & Resumes
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                activeFolder === "candidates"
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {candidates.length}
            </span>
          </button>

        </div>

        {activeFolder === "candidates" && (
          <Button size="sm" onClick={() => setShowAddCandModal(true)}>
            <UserPlus size={14} /> Add Candidate & Resume
          </Button>
        )}
      </div>

      {/* FOLDER 1: ENTERPRISE KNOWLEDGE DOCUMENTS */}
      {activeFolder === "enterprise" && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Uploader */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
              dragging
                ? "border-brand-500 bg-brand-50"
                : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50 shadow-sm"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_DOCS}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="rounded-2xl bg-brand-50 p-3.5 text-brand-600 shadow-sm">
              <Upload size={24} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">
              {busy ? "Ingesting & indexing files…" : "Drop enterprise documents here or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              Upload technical manuals, coding standards, and policy guides (PDF, DOCX, TXT, PPTX).
              Processed locally in your closed-domain RAG pipeline.
            </p>
          </div>

          {/* Library Grid */}
          <div>
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Grounding Knowledge Files
                <span className="ml-1.5 text-xs text-slate-400 font-normal">
                  ({documents.length} files)
                </span>
              </h3>
            </div>

            {documents.length === 0 ? (
              <EmptyState
                icon={FilePlus2}
                title="No enterprise documents uploaded"
                action={
                  <Button onClick={() => inputRef.current?.click()}>
                    <Upload size={16} /> Upload First Document
                  </Button>
                }
              >
                Upload source documents to build the internal knowledge base that candidate questions are grounded upon.
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documents.map((doc) => {
                  const Icon = iconFor(doc.ext);
                  return (
                    <Card key={doc.id} className="group p-4.5 transition-all hover:border-brand-300 hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          <Icon size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="truncate text-sm font-bold text-slate-900"
                              title={doc.name}
                            >
                              {doc.name}
                            </p>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="flex-shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                              title="Delete document"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatBytes(doc.sizeBytes)} · {formatDateTime(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>

                      {doc.excerpt && (
                        <p className="mt-3 text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{doc.excerpt}"
                        </p>
                      )}

                      <div className="mt-3.5 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between">
                          <StatusBadge status={doc.status} />
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Layers size={13} className="text-slate-400" />
                            {doc.status === "indexed"
                              ? `${doc.chunks} chunks indexed`
                              : doc.chunksTotal
                              ? `embedding ${doc.chunksDone}/${doc.chunksTotal}`
                              : "processing…"}
                          </span>
                        </div>
                        {doc.status !== "indexed" &&
                          doc.status !== "failed" &&
                          doc.chunksTotal > 0 && (
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full bg-brand-500 transition-all duration-300"
                                style={{
                                  width: `${Math.round(
                                    (doc.chunksDone / doc.chunksTotal) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOLDER 2: CANDIDATE PROFILES & RESUMES */}
      {activeFolder === "candidates" && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Registered Candidates & Resumes
                <span className="ml-1.5 text-xs text-slate-400 font-normal">
                  ({candidates.length} profiles)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Manage candidate CVs, target roles, and trigger customized question generation
              </p>
            </div>
          </div>

          {candidates.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No candidates added yet"
              action={
                <Button onClick={() => setShowAddCandModal(true)}>
                  <UserPlus size={16} /> Add First Candidate
                </Button>
              }
            >
              Add a candidate profile with their resume file to generate tailored interview assessments.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {candidates.map((cand) => (
                <Card key={cand.id} className="group flex flex-col justify-between p-5 transition-all hover:border-brand-300 hover:shadow-md">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-sm">
                          {cand.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-base font-bold text-slate-900">{cand.name}</h4>
                          <span className="inline-block rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                            {cand.targetRole}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCandidate(cand.id)}
                        className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Delete candidate"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Email & Date */}
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      {cand.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400" />
                          <span className="truncate">{cand.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Added {formatDateTime(cand.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Resume File Badge */}
                    <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCheck2 size={16} className="text-brand-600 flex-shrink-0" />
                          <span className="truncate text-xs font-semibold text-slate-800" title={cand.resumeName}>
                            {cand.resumeName || "Candidate_Resume.pdf"}
                          </span>
                        </div>
                        <span className="flex-shrink-0 text-[10px] text-slate-400 font-medium">
                          {formatBytes(cand.resumeSizeBytes || 102400)}
                        </span>
                      </div>
                    </div>

                    {/* Skills pills */}
                    {cand.skills && cand.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cand.skills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    {cand.summary && (
                      <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {cand.summary}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 border-t border-slate-100 pt-3">
                    <Link to={`/generate?candidateId=${cand.id}`} className="w-full">
                      <Button size="sm" className="w-full">
                        <Sparkles size={13} /> Generate Assessment Q&A
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddCandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Candidate & Resume</h3>
                  <p className="text-xs text-slate-500">
                    Store candidate profile and CV in the repository
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCandModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Candidate Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Henderson"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Target Job Role <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Backend Engineer"
                    value={candRole}
                    onChange={(e) => setCandRole(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Email Address <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. liam.h@example.com"
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              {/* Resume File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Candidate Resume <span className="text-slate-400">(PDF, DOCX, TXT)</span>
                </label>
                <input
                  type="file"
                  ref={candResumeInputRef}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setCandResume(e.target.files[0]);
                  }}
                />
                <div
                  onClick={() => candResumeInputRef.current?.click()}
                  className="mt-1.5 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 hover:border-brand-400 hover:bg-brand-50/50"
                >
                  <div className="flex items-center gap-2.5">
                    <Upload size={16} className="text-brand-600" />
                    <span className="text-xs font-medium text-slate-700">
                      {candResume ? candResume.name : "Click to attach candidate resume"}
                    </span>
                  </div>
                  {candResume && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatBytes(candResume.size)}
                    </span>
                  )}
                </div>
              </div>

              {/* Skills Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Key Skills / Technologies <span className="text-slate-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kubernetes, Go, PostgreSQL, AWS, Kafka"
                  value={candSkills}
                  onChange={(e) => setCandSkills(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Candidate Summary / Notes <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief background or specific interview focus notes..."
                  value={candSummary}
                  onChange={(e) => setCandSummary(e.target.value)}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {candError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                  {candError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddCandModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingCand}>
                  {savingCand ? "Saving Candidate…" : "Save Candidate"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
