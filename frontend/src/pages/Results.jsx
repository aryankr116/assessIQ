import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  FileJson,
  Sheet,
  Sparkles,
  Search,
  Trash2,
  Clock,
  Layers,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, EmptyState, TypeBadge, UnanswerablePill } from "../components/ui.jsx";
import QuestionCard from "../components/QuestionCard.jsx";
import { formatDateTime } from "../lib/format.js";
import { exportJSON, exportCSV } from "../lib/export.js";

const FILTERS = [
  { key: "all", label: "All Questions" },
  { key: "knowledge", label: "Knowledge" },
  { key: "skill", label: "Skill" },
  { key: "unanswerable", label: "Out of scope" },
];

export default function Results() {
  const { qaSets, deleteQASet, rateQuestion } = useApp();
  const [searchParams] = useSearchParams();
  const paramSetId = searchParams.get("setId");

  const sorted = useMemo(
    () =>
      [...qaSets].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    [qaSets]
  );

  const [activeId, setActiveId] = useState(paramSetId || sorted[0]?.id || null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (paramSetId) {
      setActiveId(paramSetId);
    } else if (!activeId && sorted.length > 0) {
      setActiveId(sorted[0].id);
    }
  }, [paramSetId, sorted, activeId]);

  const active =
    sorted.find((s) => s.id === activeId) || sorted[0] || null;

  async function handleDelete(setId) {
    if (!window.confirm("Delete this candidate assessment set? This cannot be undone.")) return;
    await deleteQASet(setId);
    if (activeId === setId) {
      const remaining = sorted.filter((s) => s.id !== setId);
      setActiveId(remaining[0]?.id || null);
    }
  }

  const filteredQuestions = useMemo(() => {
    if (!active) return [];
    return active.questions.filter((q) => {
      const matchFilter =
        filter === "all"
          ? true
          : filter === "unanswerable"
          ? !q.answerable
          : q.type === filter;
      const matchQuery =
        !query.trim() ||
        q.question.toLowerCase().includes(query.toLowerCase()) ||
        q.answer.toLowerCase().includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [active, filter, query]);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No candidate assessments generated yet"
        action={
          <Link to="/generate">
            <Button>
              <Sparkles size={16} /> Generate Q&A
            </Button>
          </Link>
        }
      >
        Generated question sets for candidates will appear here for review, cognitive
        filtering, and export.
      </EmptyState>
    );
  }

  const knCount = active ? active.questions.filter((q) => q.type === "knowledge").length : 0;
  const skCount = active ? active.questions.filter((q) => q.type === "skill").length : 0;
  const oosCount = active ? active.questions.filter((q) => !q.answerable).length : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-in-up">
      {/* Candidate Question Sets List (4 Cols) */}
      <div className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-brand-600" />
            Candidate Question Sets
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">
              {sorted.length}
            </span>
          </h3>
          <Link
            to="/generate"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <Sparkles size={12} /> New Set
          </Link>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto scroll-thin pr-1">
          {sorted.map((set) => {
            const isActive = set.id === active?.id;
            const displayName = set.candidateName || set.jobRole;
            const displayRole = set.candidateRole || set.jobRole;
            const qCount = set.questions?.length || 0;

            return (
              <button
                key={set.id}
                onClick={() => setActiveId(set.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "border-brand-500 bg-brand-50/70 shadow-xs ring-1 ring-brand-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {displayName}
                    </div>

                    <div className="truncate text-xs font-medium text-brand-700 mt-0.5">
                      {displayRole}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span className="rounded bg-white px-1.5 py-0.2 border border-slate-200 text-slate-600 font-semibold">
                        {qCount} questions
                      </span>
                      <span>{formatDateTime(set.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Assessment Detail View (8 Cols) */}
      <div className="lg:col-span-8 space-y-4">
        {active && (
          <>
            {/* Set Header Card */}
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 text-base font-bold border border-brand-200">
                    {(active.candidateName || active.jobRole).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {active.candidateName || active.jobRole}
                      </h2>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
                        Candidate Assessment
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Target Role: <span className="text-brand-700">{active.candidateRole || active.jobRole}</span>
                    </p>

                    {active.prompt && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{active.prompt}"
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock size={13} className="text-brand-600" /> {formatDateTime(active.createdAt)}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Layers size={13} className="text-brand-600" /> {active.documentIds?.length || 0} source documents
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportJSON(active)}
                    title="Export as JSON"
                  >
                    <FileJson size={14} /> JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportCSV(active)}
                    title="Export as CSV"
                  >
                    <Sheet size={14} /> CSV
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(active.id)}
                    title="Delete this candidate set"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Cognitive Summary Metrics */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3.5 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <TypeBadge type="knowledge" size="sm" /> {knCount} Questions
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <TypeBadge type="skill" size="sm" /> {skCount} Questions
                </span>
                {oosCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <UnanswerablePill /> {oosCount} Out of scope
                  </span>
                )}
              </div>
            </Card>

            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap rounded-lg border border-slate-200 bg-white p-1">
                {FILTERS.map((f) => {
                  const count =
                    f.key === "all"
                      ? active.questions.length
                      : f.key === "unanswerable"
                      ? active.questions.filter((q) => !q.answerable).length
                      : active.questions.filter((q) => q.type === f.key).length;
                  const isSel = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isSel
                          ? "bg-brand-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                          isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions & answers…"
                  className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white py-1.5 pl-8.5 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
                  No questions match your filter or search query.
                </div>
              ) : (
                filteredQuestions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    onRate={(qid, rating) => rateQuestion(active.id, qid, rating)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
