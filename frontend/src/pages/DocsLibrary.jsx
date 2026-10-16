import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Trash2,
  Search,
  AlertCircle,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  FileImage,
} from "lucide-react";
import api, { apiBaseUrl } from "../api/client.js";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, StatusBadge } from "../components/ui.jsx";
import { formatBytes, formatDateTime } from "../lib/format.js";

const ACCEPTED_DOCS = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";

const extIcons = {
  pdf: FileText,
  docx: File,
  txt: File,
  md: FileCode,
  pptx: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  default: FileText,
};

function getExtIcon(ext) {
  return extIcons[ext.replace(".", "")] || extIcons.default;
}

export default function DocsLibrary() {
  const { documents, uploadDocument, deleteDocument } = useApp();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const inputRef = useRef(null);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        !searchQuery.trim() ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isIngesting = doc.status !== "indexed" && doc.status !== "failed";
      const matchFilter =
        filterCategory === "all" ||
        (filterCategory === "active" && doc.status === "indexed") ||
        (filterCategory === "ingesting" && isIngesting);
      return matchSearch && matchFilter;
    });
  }, [documents, searchQuery, filterCategory]);

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

  async function openDoc(doc) {
    const url = `${apiBaseUrl}/api/documents/${doc.id}/file`;
    window.open(url, "_blank");
  }

  return (
    <div
      className="space-y-6"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-brand-600 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-slate-900 font-display">
          Documents
        </h1>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload size={15} /> Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 items-center">
        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none ring-1 ring-inset ring-slate-200 hover:ring-slate-300 focus:ring-2 focus:ring-brand-500/20 transition-all"
          >
            <option value="all">All ({documents.length})</option>
            <option value="active">Ready</option>
            <option value="ingesting">Processing</option>
          </select>
        </div>
        <div className="relative max-w-xs mx-auto w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-300"
          />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border-0 bg-white text-sm outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
        <div />
      </div>

      {/* Upload Area */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_DOCS}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-brand-500/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-brand-400 bg-white p-12 text-center shadow-lg">
            <Upload size={40} className="mx-auto text-brand-400 mb-3" />
            <p className="text-sm font-bold text-brand-700">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Docs Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredDocs.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <FileText size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {searchQuery ? "No documents match your search" : "No documents yet"}
            </p>
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="mt-3"
            >
              <Upload size={14} /> Upload Documents
            </Button>
          </div>
        )}

        {filteredDocs.map((doc) => {
          const isIngesting =
            doc.status !== "indexed" && doc.status !== "failed";
          const DocIcon = getExtIcon(doc.ext);
          const isReady = doc.status === "indexed";

          return (
            <Card
              key={doc.id}
              className={`group p-5 transition-all border-l-4 border-l-emerald-500 ${
                isReady ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer" : ""
              } ${isIngesting ? "border-l-amber-400 ring-1 ring-amber-200 bg-amber-50/20" : ""} ${doc.status === "failed" ? "border-l-red-400" : ""}`}
              onClick={() => isReady && openDoc(doc)}
            >
              {/* Top row: icon + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                      isReady
                        ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <DocIcon size={22} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-slate-800 text-sm line-clamp-1"
                      title={doc.name}
                    >
                      {doc.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatBytes(doc.sizeBytes)} · {doc.ext.replace(".", "").toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                </div>
              </div>

              {/* Info */}
              {isIngesting ? (
                <div className="mt-3 rounded-xl bg-amber-50/90 p-3 space-y-2 ring-1 ring-inset ring-amber-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      {doc.status === "extracting"
                        ? "Extracting text..."
                        : doc.status === "uploading"
                          ? "Uploading..."
                          : doc.status === "chunking"
                            ? "Chunking..."
                            : doc.status === "embedding"
                              ? "Embedding..."
                              : "Processing..."}
                    </span>
                    <span className="text-[11px] font-mono text-amber-600">
                      {doc.chunksTotal
                        ? `${doc.chunksDone}/${doc.chunksTotal}`
                        : ""}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200/80">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                      style={{
                        width: doc.chunksTotal
                          ? `${Math.round((doc.chunksDone / doc.chunksTotal) * 100)}%`
                          : "40%",
                      }}
                    />
                  </div>
                </div>
              ) : doc.status === "failed" ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 space-y-1.5 text-xs ring-1 ring-inset ring-red-100">
                  <div className="flex items-center gap-1.5 font-semibold text-red-600">
                    <AlertCircle size={14} />
                    {doc.excerpt?.startsWith("Insufficient content")
                      ? "Document too small"
                      : "Ingestion failed"}
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-500">
                    {doc.excerpt || "Could not parse document."}
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {doc.excerpt || "No preview available."}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{doc.chunks || 0} sections</span>
                    <span>·</span>
                    <span>{formatDateTime(doc.uploadedAt)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              {doc.status === "failed" && (
                <div className="mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
              {isReady && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view →
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                    className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

    </div>
  );
}
