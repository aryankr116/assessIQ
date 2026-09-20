import { useState } from "react";
import {
  ChevronDown,
  FileText,
  Quote,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  CheckCircle2,
  BookOpen,
  Clock,
  Zap,
  Brain,
  Lightbulb,
} from "lucide-react";
import { Card, TypeBadge, ConfidenceBar, UnanswerablePill } from "./ui.jsx";

const SUB_TYPE_CONFIG = {
  fundamentals: { label: "Fundamentals", icon: BookOpen, color: "text-sky-600 bg-sky-50 border-sky-200", timeColor: "text-sky-600" },
  understanding: { label: "Understanding", icon: Brain, color: "text-indigo-600 bg-indigo-50 border-indigo-200", timeColor: "text-indigo-600" },
  apply: { label: "Apply", icon: Zap, color: "text-purple-600 bg-purple-50 border-purple-200", timeColor: "text-purple-600" },
  analyse: { label: "Analyse", icon: Lightbulb, color: "text-amber-600 bg-amber-50 border-amber-200", timeColor: "text-amber-600" },
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function QuestionCard({ question, index, onRate }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const q = question;
  const rating = q.rating ?? null;
  const subType = q.subType || q.sub_type || "direct";
  const stConfig = SUB_TYPE_CONFIG[subType] || SUB_TYPE_CONFIG.direct;
  const StIcon = stConfig.icon;
  const options = q.options || [];
  const correctIdx = q.correctOption ?? q.correct_option ?? 0;
  const expectedTime = q.expectedTimeSeconds || q.expected_time_seconds || 60;

  const rate = (e, value) => {
    e.stopPropagation();
    if (!onRate) return;
    onRate(q.id, rating === value ? null : value);
  };

  const copyContent = (e) => {
    e.stopPropagation();
    const text = `Q: ${q.question}\n${options.map((o, i) => `  ${OPTION_LETTERS[i]}. ${o}${i === correctIdx ? " ✓" : ""}`).join("\n")}\n\nExplanation: ${q.explanation || q.answer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  function formatTime(sec) {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  return (
    <Card className="overflow-hidden border-slate-200 transition-all duration-150 hover:border-slate-300 hover:shadow-sm">
      <div className="flex w-full items-start gap-3.5 px-5 py-4">
        {/* Clickable Header */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left group cursor-pointer"
        >
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand-700 transition-colors">
              {q.question}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TypeBadge type={q.type} size="sm" />
              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${stConfig.color}`}>
                <StIcon size={10} /> {stConfig.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${stConfig.timeColor}`}>
                <Clock size={10} /> {formatTime(expectedTime)}
              </span>
              {q.answerable ? (
                <ConfidenceBar value={q.confidence} />
              ) : (
                <UnanswerablePill />
              )}
            </div>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={copyContent}
            title={copied ? "Copied!" : "Copy question"}
            className={`rounded-lg p-1.5 transition ${
              copied ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          {onRate && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 p-0.5">
              <button
                onClick={(e) => rate(e, 1)}
                title="Good question"
                className={`rounded p-1 transition ${rating === 1 ? "bg-emerald-500 text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              >
                <ThumbsUp size={13} />
              </button>
              <button
                onClick={(e) => rate(e, -1)}
                title="Poor question"
                className={`rounded p-1 transition ${rating === -1 ? "bg-rose-500 text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              >
                <ThumbsDown size={13} />
              </button>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 transition"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${open ? "rotate-180 text-brand-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {open && (
        <div className="animate-fade-in-up border-t border-slate-100 bg-slate-50/70 px-5 py-4 space-y-4">
          {/* MCQ Options */}
          {options.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Options
              </div>
              <div className="space-y-1.5">
                {options.map((opt, i) => {
                  const isCorrect = i === correctIdx;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/80 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${
                          isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {OPTION_LETTERS[i]}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isCorrect && (
                        <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-500 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation */}
          {q.explanation && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Lightbulb size={12} className="text-amber-500" />
                Explanation
              </div>
              <div className="whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-sm leading-relaxed text-slate-800">
                {q.explanation}
              </div>
            </div>
          )}

          {/* Source Evidence */}
          {q.sources?.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <BookOpen size={12} className="text-brand-600" />
                Source Evidence
              </div>
              <div className="space-y-2">
                {q.sources.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                    <div className="flex items-center gap-2 font-medium text-slate-700">
                      <FileText size={13} className="text-brand-600 flex-shrink-0" />
                      <span className="truncate">{s.docName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400 font-mono text-[11px]">chunk #{s.chunkId}</span>
                    </div>
                    <div className="mt-1.5 flex gap-1.5 rounded bg-slate-50 p-2 italic text-slate-600 border border-slate-100">
                      <Quote size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
                      <span>{s.snippet}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
