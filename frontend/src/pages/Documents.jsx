import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileImage,
  FilePlus2,
  FileText,
  FileType,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, EmptyState, StatusBadge } from "../components/ui.jsx";
import { formatBytes, formatDateTime } from "../lib/format.js";

const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";
const ACCEPTED_JOB_DESCRIPTION = ".pdf,application/pdf";

function iconFor(ext) {
  if ([".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"].includes(ext)) {
    return FileImage;
  }
  if (ext === ".pdf") return FileType;
  return FileText;
}

function processingLabel(doc) {
  if (doc.status === "indexed") {
    return `${doc.chunks || 0} searchable chunks are ready for question generation.`;
  }
  if (doc.status === "failed") {
    return "Processing stopped. Remove this source and upload it again to retry.";
  }
  if (doc.chunksTotal > 0) {
    return `Building searchable chunks · ${doc.chunksDone || 0} of ${doc.chunksTotal}`;
  }
  if (doc.status === "extracting") return "Reading and preparing source text";
  return "Preparing this source for indexing";
}

export default function Documents() {
  const { profileId } = useParams();
  const {
    uploadDocument,
    deleteDocument,
    updateJobDescription,
    getJobDescription,
    deleteJobDescription,
    jobProfiles,
    loading: profilesLoading,
  } = useApp();
  const profile = jobProfiles.find((p) => p.id === profileId);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [jobDescription, setJobDescription] = useState(null);
  const [jobDescriptionLoading, setJobDescriptionLoading] = useState(false);
  const [jobDescriptionError, setJobDescriptionError] = useState("");
  const [jobDescriptionExpanded, setJobDescriptionExpanded] = useState(false);
  const [jobDescriptionDeleting, setJobDescriptionDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const referenceInputRef = useRef(null);
  const jobDescriptionInputRef = useRef(null);

  const loadJobDescription = useCallback(async () => {
    if (!profile?.jobDescriptionName) {
      setJobDescription(null);
      setJobDescriptionLoading(false);
      setJobDescriptionError("");
      setJobDescriptionExpanded(false);
      return;
    }

    setJobDescriptionLoading(true);
    setJobDescriptionError("");
    try {
      const description = await getJobDescription(profileId);
      setJobDescription(description);
    } catch (error) {
      setJobDescriptionError(error.message || "Unable to load the job description.");
    } finally {
      setJobDescriptionLoading(false);
    }
  }, [getJobDescription, profile?.jobDescriptionName, profileId]);

  useEffect(() => {
    loadJobDescription();
  }, [loadJobDescription]);

  async function loadDocs(showLoading = false) {
    if (showLoading) setLoading(true);
    setLoadError("");
    try {
      const api = (await import("../api/client.js")).default;
      const docs = await api.listDocuments(profileId);
      setDocuments(docs);
    } catch (error) {
      setLoadError(error.message || "Unable to load source documents.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    if (profileId) loadDocs(true);
  }, [profileId]);

  useEffect(() => {
    const stillProcessing = documents.some(
      (doc) => doc.status !== "indexed" && doc.status !== "failed"
    );
    if (!stillProcessing || loadError) return undefined;
    const timer = setInterval(() => loadDocs(), 1200);
    return () => clearInterval(timer);
  }, [documents, loadError]);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (busy) {
      setUploadError("Wait for the current upload to finish before adding more files.");
      return;
    }
    setBusy(true);
    setUploadError("");
    setUploadNotice("");
    let uploadedCount = 0;
    try {
      for (const file of files) {
        await uploadDocument(profileId, file);
        uploadedCount += 1;
      }
      setUploadNotice(
        `${uploadedCount} ${uploadedCount === 1 ? "file" : "files"} added to this profile's source queue.`
      );
    } catch (error) {
      setUploadError(error.message || "Unable to upload the selected files.");
    } finally {
      await loadDocs();
      setBusy(false);
    }
  }

  async function uploadJobDescription(fileList) {
    const file = Array.from(fileList || [])[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Job descriptions must be PDF files.");
      setUploadNotice("");
      return;
    }
    if (busy) {
      setUploadError("Wait for the current upload to finish before adding a job description.");
      return;
    }

    setBusy(true);
    setUploadError("");
    setUploadNotice("");
    setJobDescriptionError("");
    try {
      await updateJobDescription(profileId, file);
      const description = await getJobDescription(profileId);
      setJobDescription(description);
      setJobDescriptionExpanded(true);
      setUploadNotice(
        description.text?.trim()
          ? `${description.wordCount ?? 0} words extracted from ${description.name || file.name}.`
          : `${file.name} is attached. PDF text extraction is not simulated in demo mode.`
      );
    } catch (error) {
      setUploadError(error.message || "Unable to extract the job description.");
    } finally {
      setBusy(false);
    }
  }

  async function removeJobDescription() {
    if (!window.confirm("Remove this job description and its extracted role details?")) return;
    setJobDescriptionDeleting(true);
    setUploadError("");
    setUploadNotice("");
    try {
      await deleteJobDescription(profileId);
      setJobDescription(null);
      setJobDescriptionExpanded(false);
      setUploadNotice("Job description removed from this profile.");
    } catch (error) {
      setUploadError(error.message || "Unable to remove the job description.");
    } finally {
      setJobDescriptionDeleting(false);
    }
  }

  function onReferenceDrop(event) {
    event.preventDefault();
    setDragging(false);
    uploadFiles(event.dataTransfer.files);
  }

  async function handleDelete(docId) {
    setDeletingId(docId);
    setUploadError("");
    setUploadNotice("");
    try {
      await deleteDocument(profileId, docId);
      await loadDocs();
    } catch (error) {
      setUploadError(error.message || "Unable to remove this source.");
    } finally {
      setDeletingId("");
    }
  }

  if (!profile && profilesLoading) {
    return (
      <div role="status" className="mx-auto max-w-xl py-16 text-center text-sm text-slate-600">
        Loading job profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="font-display text-xl font-semibold text-[#25201B]">Job profile not found</p>
        <p className="mt-2 text-sm text-slate-600">This profile may have been removed or is no longer available.</p>
        <Link
          to="/job-profiles"
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#A84431] px-4 text-sm font-semibold text-[#FBF8F1] transition hover:bg-[#873727]"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to Job Profiles
        </Link>
      </div>
    );
  }

  const readyCount = documents.filter((doc) => doc.status === "indexed").length;
  const failedCount = documents.filter((doc) => doc.status === "failed").length;
  const processingCount = documents.length - readyCount - failedCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#D8CCB9] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/job-profiles"
            className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-[#A84431]"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Job Profiles
          </Link>
          <div className="mt-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8CCB9] bg-[#F0E7D7] text-[#6E5424]">
              <Briefcase size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A84431]">Source library</p>
              <h2 className="mt-0.5 truncate font-display text-2xl font-semibold tracking-tight text-[#25201B]">
                {profile.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage the role&apos;s job description and track reference files through indexing.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8CCB9] bg-[#FBF8F1] px-3 py-1.5 font-medium text-[#4F4337]">
            <CheckCircle2 size={13} aria-hidden="true" className="text-[#6E5424]" />
            {readyCount} ready
          </span>
          {processingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8B36E]/50 bg-[#F6EFDF] px-3 py-1.5 font-medium text-[#6E5424]">
              <Loader2 size={13} aria-hidden="true" className="animate-spin" />
              {processingCount} processing
            </span>
          )}
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4B7A8] bg-[#F8EAE4] px-3 py-1.5 font-medium text-[#893A2A]">
              <AlertCircle size={13} aria-hidden="true" />
              {failedCount} failed
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] text-[#A84431]">
                <FileType size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A84431]">Role input</p>
                <h3 className="mt-1 text-sm font-bold text-[#25201B]">Job description</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Keep the full extracted description and role details attached to this profile.
                </p>
              </div>
            </div>
            <input
              ref={jobDescriptionInputRef}
              type="file"
              accept={ACCEPTED_JOB_DESCRIPTION}
              className="hidden"
              onChange={(event) => {
                uploadJobDescription(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => jobDescriptionInputRef.current?.click()}
              className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#A84431] px-4 text-sm font-semibold text-[#FBF8F1] transition hover:bg-[#873727] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={15} aria-hidden="true" />
              {busy
                ? "Saving job description..."
                : profile.jobDescriptionName
                  ? "Replace job description PDF"
                  : "Upload job description PDF"}
            </button>
            <p className="mt-3 border-t border-[#E2D6C4] pt-3 text-[11px] leading-5 text-slate-600">
              PDF only. Replacing it refreshes the extracted skills, experience, and full-text preview used across this profile.
            </p>
            {profile.jobDescriptionName && (
              <button
                type="button"
                disabled={busy || jobDescriptionDeleting}
                onClick={removeJobDescription}
                className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#E4B7A8] bg-[#F8EAE4] px-3 text-xs font-semibold text-[#893A2A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {jobDescriptionDeleting ? (
                  <Loader2 size={13} aria-hidden="true" className="animate-spin" />
                ) : (
                  <Trash2 size={13} aria-hidden="true" />
                )}
                Remove job description
              </button>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8CCB9] bg-[#F0E7D7] text-[#6E5424]">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E5424]">Supporting material</p>
                <h3 className="mt-1 text-sm font-bold text-[#25201B]">Reference documents</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Add handbooks, policies, guides, or other material for grounded questions.
                </p>
              </div>
            </div>
            <input
              ref={referenceInputRef}
              type="file"
              multiple
              accept={ACCEPTED_DOCS}
              className="hidden"
              onChange={(event) => {
                uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose or drop reference documents"
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onReferenceDrop}
              onClick={() => referenceInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  referenceInputRef.current?.click();
                }
              }}
              className={`mt-5 flex min-h-[108px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-4 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A84431] ${
                dragging
                  ? "border-[#A84431] bg-[#F8EAE4]"
                  : "border-[#CBBBA5] bg-[#F7F1E8] hover:border-[#A84431]/60 hover:bg-[#FBF8F1]"
              }`}
            >
              <Upload size={18} aria-hidden="true" className="text-[#A84431]" />
              <span className="mt-2 text-xs font-semibold text-[#4F4337]">
                {busy ? "Adding files..." : "Drop files or browse"}
              </span>
              <span className="mt-1 text-[10px] text-slate-600">PDF, DOCX, TXT, PPTX, MD, images</span>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden !border-[#3A332D] !bg-[#25201B] p-5 text-[#F0E7D7]">
          <div className="flex items-center gap-2">
            <Layers size={16} aria-hidden="true" className="text-[#D8B36E]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8B36E]">What happens next</p>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">From upload to usable source</h3>
          <ol className="mt-4 space-y-3">
            {[
              ["01", "Text extraction", "The file is read and prepared."],
              ["02", "Chunking", "Text is split into searchable sections."],
              ["03", "Indexing", "Sections become available for grounded Q&A."],
            ].map(([step, title, description]) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D8B36E]/35 bg-[#D8B36E]/10 text-[10px] font-bold text-[#D8B36E]">
                  {step}
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#FBF8F1]">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#B9AA98]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="overflow-hidden p-0" aria-busy={jobDescriptionLoading || busy}>
        <div className="flex flex-col gap-3 border-b border-[#E2D6C4] px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] text-[#A84431]">
              <FileText size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A84431]">Profile context</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-[#25201B]">Job description details</h3>
              <p className="mt-1 truncate text-xs text-slate-600">
                {profile.jobDescriptionName || "No job description attached"}
              </p>
            </div>
          </div>
          {profile.jobDescriptionName && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#D8CCB9] bg-[#F7F1E8] px-3 py-1.5 text-xs font-semibold text-[#4F4337]">
              {jobDescription?.wordCount ?? profile.jobDescriptionWordCount ?? "—"} words
            </span>
          )}
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {jobDescriptionLoading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 size={15} aria-hidden="true" className="animate-spin" />
              Loading extracted job description...
            </p>
          ) : jobDescriptionError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] px-4 py-3 text-sm text-[#893A2A]">
              <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" />{jobDescriptionError}</span>
              <button
                type="button"
                onClick={loadJobDescription}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E4B7A8] bg-[#FBF8F1] px-3 text-xs font-semibold text-[#893A2A] transition hover:bg-white"
              >
                <RefreshCw size={12} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : !profile.jobDescriptionName ? (
            <p className="rounded-xl border border-dashed border-[#CBBBA5] bg-[#F7F1E8] px-4 py-4 text-sm text-slate-600">
              Upload a JD PDF above. Its extracted text, skills, and experience will be shown here and on the job profile.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E2D6C4] bg-[#F7F1E8] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6D5E4E]">Experience required</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#25201B]">
                    {jobDescription?.experienceRequirement || profile.experienceRequirement || "Not specified"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E2D6C4] bg-[#F7F1E8] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6D5E4E]">Question difficulty</p>
                  <p className="mt-1.5 text-sm font-semibold capitalize text-[#25201B]">
                    {jobDescription?.difficultyLevel || profile.difficultyLevel || "Standard"}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6D5E4E]">Extracted skills</p>
                {(jobDescription?.skills || profile.skills || []).length ? (
                  <div className="flex flex-wrap gap-2">
                    {(jobDescription?.skills || profile.skills || []).map((skill) => (
                      <span key={skill} className="rounded-full border border-[#D8CCB9] bg-[#FBF8F1] px-3 py-1.5 text-xs font-medium text-[#4F4337]">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">No recognized skills were extracted.</p>
                )}
              </div>

              {jobDescription?.text?.trim() ? (
                <div className="rounded-xl border border-[#E2D6C4] bg-[#FBF8F1]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2D6C4] px-4 py-3">
                    <p className="text-xs font-semibold text-[#4F4337]">Extracted job description text</p>
                    <button
                      type="button"
                      aria-expanded={jobDescriptionExpanded}
                      onClick={() => setJobDescriptionExpanded((expanded) => !expanded)}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#A84431] transition hover:bg-[#F8EAE4]"
                    >
                      {jobDescriptionExpanded ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                      {jobDescriptionExpanded ? "Show less" : "View full text"}
                    </button>
                  </div>
                  <pre className={`overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-sans text-xs leading-6 text-slate-700 ${jobDescriptionExpanded ? "max-h-[36rem]" : "max-h-40"}`}>
                    {jobDescription.text}
                  </pre>
                </div>
              ) : (
                <p className="rounded-xl border border-[#D8CCB9] bg-[#F7F1E8] px-4 py-3 text-xs leading-5 text-slate-600">
                  The JD is attached, but its full extracted text is unavailable for preview. Replace the PDF to refresh extraction. In demo mode, PDF text extraction is not simulated.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {(loadError || uploadError || uploadNotice) && (
        <div className="space-y-2">
          {loadError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] px-4 py-3 text-sm text-[#893A2A]">
              <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" />{loadError}</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => loadDocs(true)}
                className="min-h-9 rounded-lg border border-[#E4B7A8] bg-[#FBF8F1] px-3 text-xs font-semibold text-[#893A2A] transition hover:bg-white disabled:opacity-60"
              >
                Try again
              </button>
            </div>
          )}
          {uploadError && (
            <p role="alert" className="flex items-center gap-2 rounded-xl border border-[#E4B7A8] bg-[#F8EAE4] px-4 py-3 text-sm text-[#893A2A]">
              <AlertCircle size={16} aria-hidden="true" /> {uploadError}
            </p>
          )}
          {uploadNotice && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-[#D8CCB9] bg-[#F7F1E8] px-4 py-3 text-sm text-[#4F4337]">
              <CheckCircle2 size={16} aria-hidden="true" className="text-[#6E5424]" /> {uploadNotice}
            </p>
          )}
        </div>
      )}

      <Card className="overflow-hidden p-0" aria-busy={loading || busy}>
        <div className="flex flex-col gap-3 border-b border-[#E2D6C4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#25201B]">Source queue</h3>
            <p className="mt-1 text-xs text-slate-600">
              Follow each file through extraction, chunking, and indexing.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600">
            {documents.length} {documents.length === 1 ? "source" : "sources"}
          </span>
        </div>

        {loading ? (
          <div role="status" aria-label="Loading source documents" className="space-y-3 p-5 sm:p-6">
            <span className="sr-only">Loading source documents</span>
            {[0, 1].map((item) => (
              <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl border border-[#E2D6C4] p-4">
                <div className="h-10 w-10 rounded-xl bg-[#E2D6C4]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-[#E2D6C4]" />
                  <div className="h-3 w-2/3 rounded bg-[#F0E7D7]" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 && loadError ? null : documents.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={FilePlus2}
              title="No sources uploaded yet"
            >
              Reference document indexing progress appears here. The job description and extracted role details are managed above.
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-[#E2D6C4]">
            {documents.map((doc) => {
              const Icon = iconFor(doc.ext);
              const hasProgress = doc.status !== "indexed" && doc.status !== "failed" && doc.chunksTotal > 0;
              const progress = hasProgress
                ? Math.min(100, Math.round(((doc.chunksDone || 0) / doc.chunksTotal) * 100))
                : 0;

              return (
                <li key={doc.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8CCB9] bg-[#F0E7D7] text-[#6E5424]">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#25201B]" title={doc.name}>
                          {doc.name}
                        </p>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {formatBytes(doc.sizeBytes)} <span aria-hidden="true">·</span> Added {formatDateTime(doc.uploadedAt)}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">{processingLabel(doc)}</p>
                      {hasProgress && (
                        <div
                          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2D6C4]"
                          role="progressbar"
                          aria-label={`Indexing progress for ${doc.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progress}
                        >
                          <div
                            className="h-full rounded-full bg-[#A84431] transition-[width] duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                      {doc.status === "failed" && doc.excerpt && (
                        <p role="alert" className="mt-2 line-clamp-2 text-xs text-[#893A2A]">
                          {doc.excerpt}
                        </p>
                      )}
                      {doc.status === "indexed" && doc.excerpt && (
                        <p className="mt-2 line-clamp-2 border-l-2 border-[#D8B36E] pl-3 text-xs italic text-slate-600">
                          {doc.excerpt}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === doc.id}
                      aria-label={`Remove ${doc.name}`}
                      title="Remove source"
                      onClick={() => handleDelete(doc.id)}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-[#D8CCB9] bg-[#FBF8F1] px-3 text-xs font-semibold text-slate-600 transition hover:border-[#E4B7A8] hover:bg-[#F8EAE4] hover:text-[#893A2A] disabled:cursor-wait disabled:opacity-60"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 size={13} aria-hidden="true" className="animate-spin" />
                      ) : (
                        <Trash2 size={13} aria-hidden="true" />
                      )}
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
