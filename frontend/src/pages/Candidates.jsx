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
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, EmptyState, StatusBadge } from "../components/ui.jsx";
import { formatDateTime, formatBytes } from "../lib/format.js";

const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";

function ProfileCard({ profile, onDelete, onGenerate, onViewDocs }) {
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    setLoadingDocs(true);
    try {
      const result = await import("../api/client.js").then((m) =>
        m.default.listDocuments(profile.id)
      );
      setDocs(result);
    } finally {
      setLoadingDocs(false);
    }
  }

  return (
    <Card className="overflow-hidden transition-all">
      <div
        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
          <Briefcase size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{profile.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <Clock size={12} />
            <span>{formatDateTime(profile.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(profile);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700 cursor-pointer"
          >
            <Sparkles size={12} /> Generate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${profile.name}" and all its documents? This cannot be undone.`)) {
                onDelete(profile.id);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
            title="Delete profile"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Documents ({docs.length})
            </h4>
            <button
              onClick={() => onViewDocs(profile)}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              <FolderOpen size={12} className="inline mr-1" />
              Manage Documents
            </button>
          </div>
          {loadingDocs ? (
            <p className="text-xs text-slate-400 py-2">Loading documents...</p>
          ) : docs.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 italic">No documents uploaded yet</p>
          ) : (
            <div className="space-y-1.5">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-slate-100"
                >
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 truncate flex-1">
                    {doc.name}
                  </span>
                  <StatusBadge status={doc.status} />
                  {doc.status === "indexed" && (
                    <span className="text-[10px] text-slate-400">{doc.chunks} chunks</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function JobProfiles() {
  const { jobProfiles, qaSets, deleteJobProfile, createJobProfile, uploadDocument } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const profiles = useMemo(() => {
    if (!searchQuery.trim()) return jobProfiles;
    const q = searchQuery.toLowerCase();
    return jobProfiles.filter((p) => p.name.toLowerCase().includes(q));
  }, [jobProfiles, searchQuery]);

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
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setCreating(true);
    try {
      const profile = await createJobProfile({ name: newProfileName.trim() });
      // Upload any pending files to the new profile
      for (const file of pendingFiles) {
        await uploadDocument(profile.id, file);
      }
      resetModal();
      // Navigate to the new profile's documents page
      navigate(`/job-profiles/${profile.id}/documents`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
          />
          <input
            type="text"
            placeholder="Search job profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border-0 bg-white text-xs outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
        <Button size="sm" onClick={() => setShowAddProfile(true)}>
          <Briefcase size={14} /> Add Job Profile
        </Button>
      </div>

      {/* Job Profiles List */}
      <div className="space-y-3">
        {profiles.length === 0 ? (
          <Card className="p-8 text-center">
            <EmptyState
              icon={Briefcase}
              title={searchQuery ? "No matching job profiles" : "No job profiles yet"}
              action={
                !searchQuery ? (
                  <Button size="sm" onClick={() => setShowAddProfile(true)}>
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add Job Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create a job role and upload documents for interview grounding
                  </p>
                </div>
              </div>
              <button
                onClick={resetModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              {/* Job Role Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Job Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. DevOps Intern"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Document Upload Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Documents <span className="text-slate-400 font-normal">(optional — upload now or later)</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                    dragging
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-slate-50/50 hover:border-brand-400 hover:bg-slate-50"
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
                  <div className="rounded-lg bg-white p-2 text-slate-400 shadow-sm ring-1 ring-slate-100">
                    <Upload size={18} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    Drop files here or click to browse
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    PDF, DOCX, TXT, PPTX, MD, images
                  </p>
                </div>

                {/* Pending Files List */}
                {pendingFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto scroll-thin">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-inset ring-slate-100"
                      >
                        <FileText size={13} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 truncate flex-1">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatBytes(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingFile(idx)}
                          className="rounded p-0.5 text-slate-300 hover:text-red-500 shrink-0 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetModal}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creating}>
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
