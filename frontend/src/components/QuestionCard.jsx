import { useState } from "react";
import { ChevronDown, FileText, Quote, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, TypeBadge, ConfidenceBar, UnanswerablePill } from "./ui.jsx";

export default function QuestionCard({ question, index, onRate }) {
  const [open, setOpen] = useState(false);
  const q = question;
  const rating = q.rating ?? null;

  const rate = (e, value) => {
    e.stopPropagation();
    if (!onRate) return;
    onRate(q.id, rating === value ? null : value); // click again to clear
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex w-full items-start gap-3 px-5 py-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-slate-900">
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

        <div className="flex flex-shrink-0 items-center gap-1">
          {onRate && (
            <>
              <button
                onClick={(e) => rate(e, 1)}
                title="Good question"
                className={`rounded p-1.5 transition ${
                  rating === 1
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                }`}
              >
                <ThumbsUp size={15} />
              </button>
              <button
                onClick={(e) => rate(e, -1)}
                title="Poor question"
                className={`rounded p-1.5 transition ${
                  rating === -1
                    ? "bg-red-50 text-red-600"
                    : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                }`}
              >
                <ThumbsDown size={15} />
              </button>
            </>
          )}
          <button onClick={() => setOpen((v) => !v)} className="p-1">
            <ChevronDown
              size={18}
              className={`flex-shrink-0 text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in-up border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {q.answerable ? "Grounded answer" : "Answerability check"}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{q.answer}</p>

          {q.sources?.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sources
              </div>
              <div className="space-y-2">
                {q.sources.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <FileText size={13} className="text-brand-600" />
                      {s.docName}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">chunk #{s.chunkId}</span>
                    </div>
                    <div className="mt-1.5 flex gap-1.5 text-xs italic text-slate-500">
                      <Quote size={12} className="mt-0.5 flex-shrink-0 text-slate-300" />
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
