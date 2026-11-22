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
  Zap,
  Brain,
  Lightbulb,
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

function ResultsHero({ count }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#3A332D] bg-[#25201B] px-5 py-6 text-[#FBF8F1] shadow-[0_14px_34px_rgba(37,32,27,0.16)] sm:px-7 sm:py-7">
      <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-9 select-none font-display text-[150px] leading-none text-white/[0.035] sm:right-8 sm:text-[180px]">
        03
      </span>
      <div className="relative z-[1] flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8B36E]">
            The Interview Fieldbook <span className="mx-1 text-white/30">/</span> Review &amp; export
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Keep every answer tied to its source.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#D9CCBA]">
            Review generated kits, filter the question set, and export the material your team needs.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 border-t border-white/10 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div>
            <p className="font-display text-3xl font-semibold leading-none text-[#D8B36E]">
              {count == null ? "—" : count}
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#D9CCBA]">Saved kits</p>
          </div>
          <Link
            to="/generate"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#A84431] px-3.5 text-xs font-semibold text-[#FBF8F1] transition hover:bg-[#873727]"
          >
            <Sparkles size={14} aria-hidden="true" />
            New interview kit
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Results() {
  const { qaSets, loading, deleteQASet, rateQuestion } = useApp();
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
    if (!window.confirm("Delete this interview kit? This cannot be undone.")) return;
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

  if (loading) {
    return (
      <div className="space-y-5">
        <ResultsHero count={null} />
        <div role="status" aria-label="Loading interview kits" className="grid gap-5 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.8fr)]">
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <Card key={item} className="border-[#D3C0A8] !bg-[#F1E7D8] p-5" aria-hidden="true">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-2/3 rounded bg-[#D8CCB9]" />
                  <div className="h-3 w-1/2 rounded bg-[#E8DECF]" />
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden border-[#D3C0A8] !bg-[#F1E7D8] p-6 lg:block" aria-hidden="true">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-1/2 rounded bg-[#D8CCB9]" />
              <div className="h-3 w-full rounded bg-[#E8DECF]" />
              <div className="h-3 w-5/6 rounded bg-[#E8DECF]" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="space-y-5">
        <ResultsHero count={0} />
        <Card className="border-[#D3C0A8] !bg-[#F1E7D8] p-4 sm:p-6">
          <EmptyState icon={ClipboardList} title="No interview kits generated yet">
            Generated question sets will appear here for review, filtering, and export.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const knCount = active ? (active.questions || []).filter((q) => q.type === "knowledge").length : 0;
  const skCount = active ? (active.questions || []).filter((q) => q.type === "skill").length : 0;
  const oosCount = active ? (active.questions || []).filter((q) => !q.answerable).length : 0;
  const fundamentalsCount = active ? (active.questions || []).filter((q) => (q.subType || q.sub_type) === "fundamentals").length : 0;
  const understandingCount = active ? (active.questions || []).filter((q) => (q.subType || q.sub_type) === "understanding").length : 0;
  const applyCount = active ? (active.questions || []).filter((q) => (q.subType || q.sub_type) === "apply").length : 0;
  const analyseCount = active ? (active.questions || []).filter((q) => (q.subType || q.sub_type) === "analyse").length : 0;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <ResultsHero count={sorted.length} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.8fr)]">
      {/* Interview Kits List */}
      <Card className="overflow-hidden border-[#D3C0A8] !bg-[#F1E7D8] p-0">
        <div className="border-b border-[#D8CCB9] bg-[#F7F1E8] px-4 py-4 text-[#25201B]">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} aria-hidden="true" className="text-[#A84431]" />
            <h3 className="text-xs font-bold">Interview kits</h3>
            <span className="ml-auto rounded-full border border-[#D8CCB9] bg-[#FBF8F1] px-2 py-0.5 text-[10px] font-semibold text-[#62574B]">
              {sorted.length}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-[#62574B]">Select a kit to inspect and export.</p>
        </div>

        <div className="max-h-[calc(100vh-20rem)] space-y-2 overflow-y-auto scroll-thin p-3">
          {sorted.map((set) => {
            const isActive = set.id === active?.id;
            const jobRole = set.jobRole || "General Role";
            const qCount = (set.questions || []).length;

            return (
              <button
                key={set.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveId(set.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-all duration-150 ${
                  isActive
                    ? "border-[#C45B3D] bg-[#EAD8C9] shadow-sm"
                    : "border-[#D8CCB9] bg-[#F9F4EB] hover:border-[#B9A78F] hover:bg-[#FBF8F1]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-[#A84431] text-[#FBF8F1]"
                        : "border border-[#D8CCB9] bg-[#F0E7D7] text-[#6E5424]"
                    }`}
                  >
                    {jobRole.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-[#25201B]">
                      {jobRole}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="rounded-full border border-[#D8CCB9] bg-white px-2 py-0.5 text-[#4F4337] font-semibold">
                        {qCount} questions
                      </span>
                      <span className="text-right">{formatDateTime(set.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Kit Detail View */}
      <div className="min-w-0 space-y-4">
        {active && (
          <>
            {/* Set Header Card */}
            <Card className="overflow-hidden border-[#D3C0A8] !bg-[#F1E7D8] p-0">
              <div className="flex flex-col gap-4 border-b border-[#D8CCB9] bg-[#F7F1E8] px-5 py-5 text-[#25201B] sm:px-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#D8B36E]/50 bg-[#E9DECE] font-display text-lg font-semibold text-[#6E5424]">
                    {(active.jobRole || "QR").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display text-xl font-semibold text-[#25201B]">
                        {active.jobRole}
                      </h2>
                      <span className="rounded-full border border-[#D8CCB9] bg-[#FBF8F1] px-2.5 py-0.5 text-[10px] font-semibold text-[#62574B]">
                        Saved kit
                      </span>
                    </div>

                    {active.prompt && (
                      <p className="mt-2 line-clamp-2 rounded-lg border border-[#D8CCB9] bg-[#FBF8F1] p-2 text-xs italic text-[#62574B]">
                        &ldquo;{active.prompt}&rdquo;
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#62574B]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={13} className="text-[#D8B36E]" /> {formatDateTime(active.createdAt)}
                      </span>
                      <span aria-hidden="true" className="text-[#B9A78F]">&middot;</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={13} className="text-[#D8B36E]" /> {active.documentIds?.length || 0} source documents
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportJSON(active)}
                    title="Export as JSON"
                    className="!bg-[#FBF8F1] !text-[#4F4337] ring-1 ring-inset ring-[#D8CCB9] hover:!bg-[#F0E7D7]"
                  >
                    <FileJson size={14} aria-hidden="true" /> JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportCSV(active)}
                    title="Export as CSV"
                    className="!bg-[#FBF8F1] !text-[#4F4337] ring-1 ring-inset ring-[#D8CCB9] hover:!bg-[#F0E7D7]"
                  >
                    <Sheet size={14} aria-hidden="true" /> CSV
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(active.id)}
                    title="Delete this kit"
                    aria-label="Delete this interview kit"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Cognitive Summary Metrics */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#D8CCB9] bg-[#E9DECE] px-5 py-3.5 text-xs font-semibold sm:px-6">
                <span className="inline-flex items-center gap-1.5 text-[#4F4337]">
                  <TypeBadge type="knowledge" size="sm" /> {knCount} Knowledge
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#4F4337]">
                  <TypeBadge type="skill" size="sm" /> {skCount} Skill
                </span>
                <span className="text-[#B9A78F]">|</span>
                <span className="inline-flex items-center gap-1 text-[#893A2A]">
                  <BookOpen size={12} /> {fundamentalsCount} Fundamentals
                </span>
                <span className="inline-flex items-center gap-1 text-[#6E5424]">
                  <Brain size={12} /> {understandingCount} Understanding
                </span>
                <span className="inline-flex items-center gap-1 text-brand-700">
                  <Zap size={12} /> {applyCount} Apply
                </span>
                <span className="inline-flex items-center gap-1 text-[#6E5424]">
                  <Lightbulb size={12} /> {analyseCount} Analyse
                </span>
                {oosCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[#4F4337]">
                    <UnanswerablePill /> {oosCount} Out of scope
                  </span>
                )}
              </div>
            </Card>

            {/* Filter and Search Bar */}
            <Card className="flex flex-col gap-3 border-[#D3C0A8] !bg-[#F1E7D8] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1 rounded-xl border border-[#D8CCB9] bg-[#E9DECE] p-1">
                {FILTERS.map((f) => {
                  const count =
                    f.key === "all"
                      ? (active.questions || []).length
                      : f.key === "unanswerable"
                      ? (active.questions || []).filter((q) => !q.answerable).length
                      : (active.questions || []).filter((q) => q.type === f.key).length;
                  const isSel = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition-all ${
                        isSel
                          ? "bg-[#25201B] text-[#FBF8F1] shadow-sm"
                          : "text-[#62574B] hover:bg-[#FBF8F1] hover:text-[#25201B]"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                          isSel ? "bg-white/15 text-[#F0E7D7]" : "bg-[#F7F1E8] text-[#62574B]"
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
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search questions and answers"
                  placeholder="Search questions & answers..."
                  className="w-full rounded-xl border border-[#D8CCB9] bg-[#FBF8F1] py-2.5 pl-9 pr-3 text-xs text-[#25201B] outline-none transition focus:border-[#A84431]/60 focus:ring-2 focus:ring-[#A84431]/15 placeholder:text-[#817464] sm:w-64"
                />
              </div>
            </Card>

            {/* Questions List */}
            <div className="space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#BDAA91] bg-[#F9F4EB] p-10 text-center text-xs text-[#62574B]">
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
    </div>
  );
}
