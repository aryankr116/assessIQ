import { useState, useRef } from "react";
import { UserPlus, Upload, X } from "lucide-react";
import api from "../api/client.js";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "./ui.jsx";
import { formatBytes } from "../lib/format.js";

export default function AddCandidateModal({ open, onClose, onCreated }) {
  const { refreshCandidates } = useApp();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState("");
  const [resume, setResume] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createCandidate({
        name: name.trim(),
        targetRole: role.trim(),
        email: email.trim() || undefined,
        summary: summary.trim() || undefined,
        resumeFile: resume || undefined,
      });
      await refreshCandidates?.();
      onCreated?.();
      reset();
    } catch (err) {
      setError(err.message || "Failed to add candidate.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setName("");
    setRole("");
    setEmail("");
    setSummary("");
    setResume(null);
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Candidate</h3>
              <p className="text-xs text-slate-500">Create a new candidate profile</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Liam Henderson"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. liam.h@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Resume <span className="text-slate-400">(PDF, DOCX, TXT)</span>
            </label>
            <input
              type="file"
              ref={inputRef}
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setResume(e.target.files[0]);
              }}
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="mt-1.5 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 hover:border-brand-400 hover:bg-brand-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Upload size={16} className="text-brand-600" />
                <span className="text-xs font-medium text-slate-700">
                  {resume ? resume.name : "Click to attach resume"}
                </span>
              </div>
              {resume && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {formatBytes(resume.size)}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Brief background or interview focus..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Candidate"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
