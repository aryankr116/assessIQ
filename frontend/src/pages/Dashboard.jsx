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
  FileCheck2,
  BookOpen,
  TrendingUp,
  FolderOpen,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { computeStats } from "../api/mockData.js";
import { Card, Button, StatusBadge } from "../components/ui.jsx";
import { formatBytes } from "../lib/format.js";

function StatCard({ icon: Icon, label, value, trend, trendLabel, accent = "brand" }) {
  const accentMap = {
    brand: { bg: "bg-brand-50", icon: "text-brand-600", ring: "ring-brand-100" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-100" },
    slate: { bg: "bg-slate-100", icon: "text-slate-600", ring: "ring-slate-200" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600", ring: "ring-amber-100" },
  };
  const a = accentMap[accent] || accentMap.brand;
  return (
    <div className="group rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100/80">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
            {value}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {label}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} ${a.icon} ring-1 ${a.ring}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span className={`flex items-center gap-0.5 ${trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
            <TrendingUp size={12} className={trend < 0 ? "rotate-180" : ""} />
            {trend > 0 ? "+" : ""}{trend}
          </span>
          <span className="text-slate-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    ready: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    draft: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
    done: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
    active: { bg: "bg-brand-50", text: "text-brand-600", dot: "bg-brand-400" },
  };
  const s = map[status] || map.done;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function KitRow({ set, idx }) {
  const initials = (set.candidateName || `C${idx + 1}`)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const status = idx === 0 ? "ready" : idx === 1 ? "draft" : "done";
  const role = set.candidateRole || set.jobRole;
  const roleBadge = role?.includes("Dev") ? "Engineering" : role?.includes("SDET") ? "QA" : "General";
  return (
    <Link
      to={`/results?setId=${set.id}`}
      className="group flex items-center gap-4 rounded-xl px-4 py-3.5 hover:bg-slate-50/80 transition-all duration-150 hover:shadow-sm border border-transparent hover:border-slate-100"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-teal-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100/50">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 truncate">
          {set.candidateName || `Candidate ${idx + 1}`}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400 truncate">{role}</span>
          <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {roleBadge}
          </span>
        </div>
      </div>
      <StatusPill status={status} />
      <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
    </Link>
  );
}

function DocRow({ doc }) {
  const usageCount = Math.max(1, Math.floor(Math.random() * 25));
  const isIngesting = doc.status !== "indexed" && doc.status !== "failed";
  const ext = doc.name.split(".").pop()?.toUpperCase() || "FILE";
  return (
    <Link
      to="/docs"
      className="group flex items-center gap-3.5 rounded-xl px-3.5 py-3 hover:bg-slate-50/80 transition-all duration-150 border border-transparent hover:border-slate-100"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
        <FileCheck2 size={18} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
          {doc.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
            {ext}
          </span>
          {isIngesting ? (
            <StatusBadge status={doc.status} />
          ) : (
            <span className="text-xs text-slate-400">Used in {usageCount} assessments</span>
          )}
        </div>
      </div>
    </Link>
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
    return <div className="text-sm font-medium text-slate-300">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-7">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-teal-700 p-8 lg:p-10 shadow-elevated">
        {/* Background effects */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-300/5 blur-3xl" />
        {/* Subtle noise texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")'}} />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-100 ring-1 ring-inset ring-white/15">
            <Sparkles size={12} /> AI-Powered Generation
          </span>
          <h2 className="mt-4 text-3xl font-black text-white font-display tracking-tight leading-tight lg:text-4xl">
            Prepare Custom Interview Questions
          </h2>
          <p className="mt-3 text-sm text-brand-100/70 max-w-lg leading-relaxed">
            AI-powered interview intelligence, tailored to every candidate.
            Cross-reference company manuals with resumes to generate grounded questions.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {/* Primary: solid dark */}
            <Link to="/generate">
              <Button className="bg-brand-950 text-white hover:bg-black/40 shadow-lg hover:shadow-xl ring-1 ring-inset ring-white/10 font-bold px-6 py-3 text-sm">
                <Sparkles size={16} /> Generate Assessment
              </Button>
            </Link>
            {/* Secondary: glass */}
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white/10 text-white hover:bg-white/20 ring-1 ring-inset ring-white/20 backdrop-blur-sm px-5 py-3 text-sm font-semibold"
            >
              <UserPlus size={16} /> Add Candidate
            </Button>
            {/* Tertiary: text links */}
            <Link to="/candidates">
              <Button className="text-brand-200 hover:text-white hover:bg-white/10 px-3 py-2 text-sm font-medium">
                <Users size={14} /> Candidates
              </Button>
            </Link>
            <Link to="/docs">
              <Button className="text-brand-200 hover:text-white hover:bg-white/10 px-3 py-2 text-sm font-medium">
                <FileText size={14} /> Upload Doc
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Interview Kits" value={qaSets.length} trend={4} trendLabel="this month" accent="brand" />
        <StatCard icon={BookOpen} label="Active Documents" value={stats.indexedDocuments} trendLabel="all synced" accent="emerald" />
        <StatCard icon={Users} label="Candidates" value={candidates.length} trend={1} trendLabel="new" accent="slate" />
        <StatCard icon={Zap} label="Questions Generated" value={qaSets.reduce((acc, s) => acc + (s.questions?.length || 0), 0)} trendLabel="total" accent="amber" />
      </div>

      {/* Recent Kits & Docs Library & Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Interview Kits */}
        <Card className="p-0 lg:col-span-7 overflow-hidden">
          <div className="px-6 pt-6 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Recent Interview Kits</h3>
              <p className="text-xs text-slate-400 mt-0.5">{recentSets.length} of {qaSets.length} kits</p>
            </div>
            <Link to="/results" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentSets.length === 0 ? (
            <div className="mx-6 mb-6 mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <ClipboardList size={24} className="mx-auto text-slate-200" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium text-slate-400">No interview kits yet</p>
              <Button size="sm" className="mt-4" onClick={() => setShowAddModal(true)}>
                <Sparkles size={14} /> Create First Kit
              </Button>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {recentSets.map((set, idx) => (
                <KitRow key={set.id} set={set} idx={idx} />
              ))}
            </div>
          )}
        </Card>

        {/* Right column: Docs + Activity */}
        <div className="space-y-6 lg:col-span-5">
          {/* Documents Library */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Knowledge Base</h3>
                <p className="text-xs text-slate-400 mt-0.5">{documents.length} documents indexed</p>
              </div>
              <Link to="/docs" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1">
                <FolderOpen size={12} /> Add New
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="mx-6 mb-6 mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <FileText size={24} className="mx-auto text-slate-200" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium text-slate-400">No documents yet</p>
                <Link to="/docs">
                  <Button size="sm" className="mt-4">
                    <Upload size={14} /> Upload Documents
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="px-2 pb-2">
                {documents
                  .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
                  .slice(0, 4)
                  .map((doc) => (
                    <DocRow key={doc.id} doc={doc} />
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated animate-fade-in-up">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <UserPlus size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Add Interview Candidate</h3>
                  <p className="text-xs text-slate-400">Create a new candidate profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={candidateRole}
                  onChange={(e) => setCandidateRole(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address (optional)</label>
                <input
                  type="email"
                  placeholder="e.g. sarah.c@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resume (PDF, DOCX, TXT)</label>
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
                  className="mt-1.5 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs hover:border-brand-300 hover:bg-brand-50/30 transition-all"
                >
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Upload size={14} className="text-slate-300" />
                    <span>{resumeFile ? resumeFile.name : "Click to attach resume"}</span>
                  </div>
                  {resumeFile && (
                    <span className="text-brand-600 font-semibold">{formatBytes(resumeFile.size)}</span>
                  )}
                </div>
              </div>

              {candidateError && (
                <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-100">
                  {candidateError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addingCandidate}>
                  {addingCandidate ? "Saving..." : "Save & Generate"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
