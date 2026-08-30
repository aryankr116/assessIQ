import { useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  UserPlus,
  Users,
  ClipboardList,
  Sparkles,
  ArrowRight,
  Upload,
  User,
  FileCheck2,
  Trash2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { computeStats } from "../api/mockData.js";
import { Card, Button } from "../components/ui.jsx";
import { formatDateTime, formatBytes } from "../lib/format.js";

function StatCard({ icon: Icon, label, value, tint, helper, iconColor }) {
  return (
    <Card className="p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`rounded-xl p-2.5 ${tint} ${iconColor}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        {value}
      </div>
      {helper && (
        <div className="mt-1.5 text-xs text-slate-400 font-medium">
          {helper}
        </div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { documents, candidates, qaSets, createCandidate, deleteCandidate, loading } = useApp();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateRole, setCandidateRole] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const fileInputRef = useRef(null);

  const stats = useMemo(
    () => computeStats(documents, qaSets, candidates),
    [documents, qaSets, candidates]
  );

  const recentSets = [...qaSets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  async function handleAddCandidate(e) {
    e.preventDefault();
    setCandidateError("");
    if (!candidateName.trim()) {
      setCandidateError("Please enter the candidate's name.");
      return;
    }
    if (!candidateRole.trim()) {
      setCandidateError("Please specify the target job role.");
      return;
    }
    setAddingCandidate(true);
    try {
      const newCand = await createCandidate({
        name: candidateName.trim(),
        email: candidateEmail.trim(),
        targetRole: candidateRole.trim(),
        resumeFile: resumeFile,
      });
      setCandidateName("");
      setCandidateRole("");
      setCandidateEmail("");
      setResumeFile(null);
      setShowAddModal(false);
      navigate(`/generate?candidateId=${newCand.id}`);
    } catch (err) {
      setCandidateError(err.message || "Failed to add candidate.");
    } finally {
      setAddingCandidate(false);
    }
  }

  if (loading) {
    return <div className="text-sm font-medium text-slate-400">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="border-slate-200 bg-gradient-to-r from-brand-700 via-brand-800 to-indigo-900 p-7 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 border border-white/10">
              <ShieldCheck size={14} className="text-emerald-400" /> Closed-Domain RAG Assessment System
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
              Job-Specific QA Generation Grounded in Enterprise Documents
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-brand-100/90">
              Ingest proprietary documentation, link candidate profiles and CVs, and generate verified Knowledge-Based and Skill-Based interview questions with source evidence.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                className="!text-brand-700 font-bold"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus size={14} /> Add Candidate
              </Button>
              <Link to="/generate">
                <Button
                  variant="ghost"
                  size="sm"
                  className="!text-white hover:!bg-white/10 font-bold"
                >
                  <Zap size={14} /> Launch Q&A Generator
                </Button>
              </Link>
              <Link to="/documents">
                <Button
                  variant="ghost"
                  size="sm"
                  className="!text-white hover:!bg-white/10"
                >
                  <Upload size={14} /> Upload Documents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Enterprise Documents"
          value={`${stats.indexedDocuments}`}
          tint="bg-blue-50"
          iconColor="text-blue-600"
          helper={`${stats.totalDocuments} total documents in knowledge library`}
        />
        <StatCard
          icon={Users}
          label="Interview Candidates"
          value={candidates.length}
          tint="bg-purple-50"
          iconColor="text-purple-600"
          helper="Candidates ready for custom Q&A synthesis"
        />
        <StatCard
          icon={ClipboardList}
          label="Synthesized Assessments"
          value={qaSets.length}
          tint="bg-emerald-50"
          iconColor="text-emerald-600"
          helper={`${stats.totalQuestions} grounded Q&A pairs generated`}
        />
      </div>

      {/* Candidate Hub & Recent Question Sets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Candidates Roster */}
        <Card className="p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users size={16} className="text-brand-600" />
                Interview Candidates
              </h3>
              <p className="text-xs text-slate-400">
                Candidates with uploaded resumes
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <UserPlus size={13} /> Add Candidate
            </Button>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <User size={28} className="mx-auto text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-600">No candidates registered</p>
              <p className="mt-1 text-xs text-slate-400">
                Add a candidate with their resume to generate customized questions.
              </p>
              <Button size="sm" className="mt-3" onClick={() => setShowAddModal(true)}>
                <UserPlus size={13} /> Add Candidate
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="group flex flex-col justify-between gap-2.5 rounded-xl border border-slate-200/80 p-3.5 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50/70 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                      {cand.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">{cand.name}</span>
                        <span className="rounded bg-brand-50 px-1.5 py-0.2 text-[10px] font-semibold text-brand-700 border border-brand-200">
                          {cand.targetRole}
                        </span>
                      </div>
                      {cand.resumeName && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <FileCheck2 size={12} className="text-brand-600 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{cand.resumeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link to={`/generate?candidateId=${cand.id}`}>
                      <Button size="sm" variant="secondary" className="!text-xs !py-1 !px-2.5">
                        <Sparkles size={12} /> Generate Q&A
                      </Button>
                    </Link>
                    <button
                      onClick={() => deleteCandidate(cand.id)}
                      title="Delete candidate"
                      className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Candidate Question Sets */}
        <Card className="p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ClipboardList size={16} className="text-brand-600" />
                Recent Question Sets
              </h3>
              <p className="text-xs text-slate-400">
                Latest generated assessments
              </p>
            </div>
            <Link
              to="/results"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {recentSets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <ClipboardList size={28} className="mx-auto text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-600">No question sets yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Launch the generator to create interview assessments.
              </p>
              <Link to="/generate">
                <Button size="sm" className="mt-3">
                  <Sparkles size={13} /> Generate First Q&A
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSets.map((set) => (
                <Link
                  key={set.id}
                  to={`/results?setId=${set.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                      {(set.candidateName || set.jobRole).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {set.candidateName ? set.candidateName : set.jobRole}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {set.candidateRole || set.jobRole} · {set.questions?.length || 0} Qs · {formatDateTime(set.createdAt)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <UserPlus size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Interview Candidate</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Candidate Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Target Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={candidateRole}
                  onChange={(e) => setCandidateRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Email Address (optional)</label>
                <input
                  type="email"
                  placeholder="e.g. sarah.c@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Resume (PDF, DOCX, TXT)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setResumeFile(e.target.files[0]);
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs hover:border-brand-400 transition"
                >
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Upload size={14} className="text-brand-600" />
                    <span>{resumeFile ? resumeFile.name : "Click to attach resume"}</span>
                  </div>
                  {resumeFile && (
                    <span className="text-brand-600 font-bold">{formatBytes(resumeFile.size)}</span>
                  )}
                </div>
              </div>

              {candidateError && (
                <div className="rounded bg-red-50 p-2 text-xs font-medium text-red-700">
                  {candidateError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addingCandidate}>
                  {addingCandidate ? "Saving…" : "Save & Generate"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
