import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Layers,
  HelpCircle,
  BrainCircuit,
  Wrench,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Upload,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { computeStats } from "../api/mockData.js";
import { Card, Button, TypeBadge } from "../components/ui.jsx";
import { formatDateTime } from "../lib/format.js";

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`rounded-lg p-2 ${tint}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { documents, qaSets, loading } = useApp();
  const stats = useMemo(
    () => computeStats(documents, qaSets),
    [documents, qaSets]
  );

  const recentSets = [...qaSets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const total = stats.knowledgeCount + stats.skillCount || 1;
  const knowledgePct = Math.round((stats.knowledgeCount / total) * 100);

  if (loading) {
    return <div className="text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-7">
      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-brand-700 to-brand-900 p-7 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <ShieldAlert size={13} /> Closed-domain · privacy-preserving
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Turn enterprise documents into job-specific interview questions
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-100">
              AssessIQ ingests your documents, retrieves the most relevant
              passages with a RAG pipeline, and generates question–answer pairs
              grounded only in your files — each auto-tagged Knowledge-Based or
              Skill-Based.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/generate">
                <Button variant="secondary" className="!text-brand-700">
                  <Sparkles size={16} /> Generate Q&A
                </Button>
              </Link>
              <Link to="/documents">
                <Button
                  variant="ghost"
                  className="!text-white hover:!bg-white/10"
                >
                  <Upload size={16} /> Upload documents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Documents"
          value={`${stats.indexedDocuments}/${stats.totalDocuments}`}
          tint="bg-brand-50 text-brand-600"
        />
        <StatCard
          icon={Layers}
          label="Indexed chunks"
          value={stats.totalChunks}
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={HelpCircle}
          label="Questions generated"
          value={stats.totalQuestions}
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ShieldAlert}
          label="Out-of-scope caught"
          value={stats.unanswerableCount}
          tint="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Classification split */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-800">
            Question classification
          </h3>
          <p className="text-xs text-slate-400">
            Cognitive type across all generated questions
          </p>

          <div className="mt-5 flex items-center justify-center">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 36 36" className="h-36 w-36 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#e9d5ff"
                  strokeWidth="4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeDasharray={`${knowledgePct} ${100 - knowledgePct}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">
                  {stats.totalQuestions}
                </span>
                <span className="text-[11px] text-slate-400">questions</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <BrainCircuit size={15} className="text-blue-600" /> Knowledge
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {stats.knowledgeCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Wrench size={15} className="text-purple-600" /> Skill
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {stats.skillCount}
              </span>
            </div>
          </div>
        </Card>

        {/* Recent sets */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Recent question sets
              </h3>
              <p className="text-xs text-slate-400">
                Latest generations by job role
              </p>
            </div>
            <Link
              to="/results"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {recentSets.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No question sets yet. Generate your first set to see it here.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSets.map((set) => (
                <Link
                  key={set.id}
                  to="/results"
                  className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {set.jobRole}
                    </div>
                    <div className="text-xs text-slate-400">
                      {set.questions.length} questions ·{" "}
                      {formatDateTime(set.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <TypeBadge
                      type={
                        set.questions.filter((q) => q.type === "knowledge")
                          .length >=
                        set.questions.filter((q) => q.type === "skill").length
                          ? "knowledge"
                          : "skill"
                      }
                      size="sm"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
