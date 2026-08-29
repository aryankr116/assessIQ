import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  FileJson,
  Sheet,
  Sparkles,
  Search,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, EmptyState } from "../components/ui.jsx";
import QuestionCard from "../components/QuestionCard.jsx";
import { formatDateTime } from "../lib/format.js";
import { exportJSON, exportCSV } from "../lib/export.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "knowledge", label: "Knowledge" },
  { key: "skill", label: "Skill" },
  { key: "unanswerable", label: "Out of scope" },
];

export default function Results() {
  const { qaSets, deleteQASet, rateQuestion } = useApp();

  async function handleDelete(setId) {
    if (!window.confirm("Delete this question set? This cannot be undone.")) return;
    await deleteQASet(setId);
    setActiveId(null);
  }

  const sorted = useMemo(
    () =>
      [...qaSets].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    [qaSets]
  );

  const [activeId, setActiveId] = useState(sorted[0]?.id || null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const active =
    sorted.find((s) => s.id === activeId) || sorted[0] || null;

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
        title="No question sets yet"
        action={
          <Link to="/generate">
            <Button>
              <Sparkles size={16} /> Generate Q&A
            </Button>
          </Link>
        }
      >
        Generated question sets will be collected here for review, filtering, and
        export.
      </EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Set list */}
      <div className="lg:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Question sets{" "}
          <span className="text-slate-400">({sorted.length})</span>
        </h3>
        <div className="space-y-2">
          {sorted.map((set) => {
            const isActive = set.id === active?.id;
            return (
              <button
                key={set.id}
                onClick={() => setActiveId(set.id)}
                className={`w-full rounded-lg border px-3.5 py-3 text-left transition ${
                  isActive
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="truncate text-sm font-medium text-slate-800">
                  {set.jobRole}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {set.questions.length} questions ·{" "}
                  {formatDateTime(set.createdAt)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:col-span-3">
        {active && (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">
                    {active.jobRole}
                  </h3>
                  <p className="mt-1 line-clamp-2 max-w-xl text-sm text-slate-500">
                    {active.prompt}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    top-k {active.topK} · {active.documentIds.length} source
                    documents · {formatDateTime(active.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportJSON(active)}
                  >
                    <FileJson size={15} /> JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportCSV(active)}
                  >
                    <Sheet size={15} /> CSV
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(active.id)}
                    title="Delete this question set"
                  >
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              </div>
            </Card>

            {/* Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                {FILTERS.map((f) => {
                  const count =
                    f.key === "all"
                      ? active.questions.length
                      : f.key === "unanswerable"
                      ? active.questions.filter((q) => !q.answerable).length
                      : active.questions.filter((q) => q.type === f.key).length;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        filter === f.key
                          ? "bg-brand-600 text-white"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-1.5 ${
                          filter === f.key ? "text-brand-100" : "text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative ml-auto">
                <Search
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions…"
                  className="w-56 rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Questions */}
            <div className="mt-4 space-y-3">
              {filteredQuestions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-400">
                  No questions match this filter.
                </p>
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
