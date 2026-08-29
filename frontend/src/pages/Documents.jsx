import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  FileType,
  FileImage,
  Trash2,
  Layers,
  FilePlus2,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, StatusBadge, EmptyState } from "../components/ui.jsx";
import { formatBytes, formatDateTime } from "../lib/format.js";

const ACCEPTED = ".pdf,.docx,.txt,.pptx,.md,.png,.jpg,.jpeg,.tiff,.tif,.bmp";

function iconFor(ext) {
  if ([".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"].includes(ext))
    return FileImage;
  if ([".pdf"].includes(ext)) return FileType;
  return FileText;
}

export default function Documents() {
  const { documents, uploadDocument, deleteDocument } = useApp();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

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

  return (
    <div className="space-y-6">
      {/* Uploader */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="rounded-full bg-brand-50 p-3 text-brand-600">
          <Upload size={26} />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          {busy ? "Uploading…" : "Drop files here or click to upload"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          PDF, DOCX, TXT, PPTX, MD, and images (OCR). Processed locally —
          documents never leave your environment.
        </p>
      </div>

      {/* Library */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Library{" "}
            <span className="ml-1 text-slate-400">({documents.length})</span>
          </h3>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No documents yet"
            action={
              <Button onClick={() => inputRef.current?.click()}>
                <Upload size={16} /> Upload your first document
              </Button>
            }
          >
            Upload source documents to build the closed-domain knowledge base
            that questions are generated from.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => {
              const Icon = iconFor(doc.ext);
              return (
                <Card key={doc.id} className="group p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="truncate text-sm font-medium text-slate-800"
                          title={doc.name}
                        >
                          {doc.name}
                        </p>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="flex-shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          title="Remove document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatBytes(doc.sizeBytes)} ·{" "}
                        {formatDateTime(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={doc.status} />
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Layers size={13} className="text-slate-400" />
                        {doc.status === "indexed"
                          ? `${doc.chunks} chunks`
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
  );
}
