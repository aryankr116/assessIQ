import { useRef, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Upload,
  FileText,
  FileType,
  FileImage,
  Trash2,
  Layers,
  FilePlus2,
  ArrowLeft,
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
  const { profileId } = useParams();
  const { uploadDocument, deleteDocument, jobProfiles } = useApp();
  const profile = jobProfiles.find((p) => p.id === profileId);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function loadDocs() {
    setLoading(true);
    try {
      const api = (await import("../api/client.js")).default;
      const docs = await api.listDocuments(profileId);
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profileId) loadDocs();
  }, [profileId]);

  // Poll for document status changes
  useEffect(() => {
    const stillProcessing = documents.some(
      (d) => d.status !== "indexed" && d.status !== "failed"
    );
    if (!stillProcessing) return;
    const t = setInterval(loadDocs, 1000);
    return () => clearInterval(t);
  }, [documents]);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        await uploadDocument(profileId, f);
      }
      await loadDocs();
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleDelete(docId) {
    await deleteDocument(profileId, docId);
    await loadDocs();
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Job profile not found.</p>
        <Link to="/job-profiles" className="text-sm text-brand-600 hover:text-brand-700 mt-2 inline-block">
          &larr; Back to Job Profiles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/job-profiles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Job Profiles
        </Link>
        <span className="text-slate-300">/</span>
        <h2 className="text-sm font-bold text-slate-900">{profile.name}</h2>
      </div>

      {/* Uploader */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all ${
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
          {busy ? "Ingesting & indexing files..." : "Drop documents here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-md">
          Upload documents for this job profile (PDF, DOCX, TXT, PPTX, images).
          They will be indexed for question generation.
        </p>
      </div>

      {/* Document List */}
      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Documents
            <span className="ml-1.5 text-xs text-slate-400 font-normal">
              ({documents.length} files)
            </span>
          </h3>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No documents uploaded yet"
            action={
              <Button onClick={() => inputRef.current?.click()}>
                <Upload size={16} /> Upload First Document
              </Button>
            }
          >
            Upload enterprise documents to ground interview questions for this job profile.
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
                          onClick={() => handleDelete(doc.id)}
                          className="flex-shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          title="Delete document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatBytes(doc.sizeBytes)} &middot; {formatDateTime(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  {doc.excerpt && (
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      &ldquo;{doc.excerpt}&rdquo;
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
                          : "processing..."}
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
  );
}
