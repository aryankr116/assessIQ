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
} from "lucide-react";
import { Card, TypeBadge, ConfidenceBar, UnanswerablePill } from "./ui.jsx";

export default function QuestionCard({ question, index, onRate }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const q = question;
  const rating = q.rating ?? null;

  const rate = (e, value) => {
    e.stopPropagation();
    if (!onRate) return;
    onRate(q.id, rating === value ? null : value);
  };

  const copyContent = (e) => {
    e.stopPropagation();
    const text = `Q: ${q.question}\n\nA: ${q.answer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card className="overflow-hidden border-slate-200 transition-all duration-150 hover:border-slate-300 hover:shadow-sm">
      <div className="flex w-full items-start gap-3.5 px-5 py-4">
        {/* Clickable Header for Accordion */}
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
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <TypeBadge type={q.type} size="sm" />
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
          {/* Copy Button */}
          <button
            onClick={copyContent}
            title={copied ? "Copied to clipboard!" : "Copy question and answer"}
            className={`rounded-lg p-1.5 transition ${
              copied
                ? "bg-emerald-50 text-emerald-600"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          {/* Rating Buttons */}
          {onRate && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 p-0.5">
              <button
                onClick={(e) => rate(e, 1)}
                title="Good question"
                className={`rounded p-1 transition ${
                  rating === 1
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <ThumbsUp size={13} />
              </button>
              <button
                onClick={(e) => rate(e, -1)}
                title="Poor question"
                className={`rounded p-1 transition ${
                  rating === -1
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <ThumbsDown size={13} />
              </button>
            </div>
          )}

          {/* Expand Chevron */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 transition"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                open ? "rotate-180 text-brand-600" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {open && (
        <div className="animate-fade-in-up border-t border-slate-100 bg-slate-50/70 px-5 py-4 space-y-3.5">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <CheckCircle2 size={12} className="text-emerald-600" />
              {q.answerable ? "Grounded Model Answer" : "Answerability Assessment"}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800">
              {q.answer}
            </div>
          </div>

          {q.sources?.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <BookOpen size={12} className="text-brand-600" />
                Source Chunk Evidence
              </div>
              <div className="space-y-2">
                {q.sources.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
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
