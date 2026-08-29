import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  FileText,
  Check,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button, TypeBadge, ConfidenceBar, UnanswerablePill } from "../components/ui.jsx";
import QuestionCard from "../components/QuestionCard.jsx";

const ROLE_PRESETS = [
  "Senior Backend Engineer",
  "Data Engineer",
  "Security Analyst",
  "DevOps Engineer",
  "Frontend Engineer",
];

export default function Generate() {
  const { documents, generateQA } = useApp();
  const navigate = useNavigate();

  const indexedDocs = useMemo(
    () => documents.filter((d) => d.status === "indexed"),
    [documents]
  );

  const [jobRole, setJobRole] = useState("");
  const [prompt, setPrompt] = useState("");
  const [topK, setTopK] = useState(6);
  const [twoRound, setTwoRound] = useState(false);
  const [selected, setSelected] = useState(() => indexedDocs.map((d) => d.id));
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Keep selection in sync if docs load after first render.
  useMemo(() => {
    if (selected.length === 0 && indexedDocs.length > 0) {
      setSelected(indexedDocs.map((d) => d.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexedDocs.length]);

  function toggleDoc(id) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function onGenerate() {
    setError("");
    if (!jobRole.trim()) {
      setError("Enter a job role to target the questions.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one indexed document to ground answers.");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const set = await generateQA({
        jobRole: jobRole.trim(),
        prompt:
          prompt.trim() ||
          `Generate interview questions for a ${jobRole.trim()}.`,
        topK,
        documentIds: selected,
        twoRound,
      });
      setResult(set);
    } catch (e) {
      setError(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Config panel */}
      <div className="lg:col-span-2">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <SlidersHorizontal size={16} className="text-brand-600" />
            Generation setup
          </h3>

          {/* Job role */}
          <label className="mt-5 block text-xs font-medium text-slate-600">
            Job role
          </label>
          <input
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ROLE_PRESETS.map((r) => (
              <button
                key={r}
                onClick={() => setJobRole(r)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {r}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <label className="mt-5 block text-xs font-medium text-slate-600">
            Prompt <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Focus areas, e.g. deployment, reliability, and data security."
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          {/* top-k */}
          <div className="mt-5 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">
              Retrieval depth (top-k)
            </label>
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {topK}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="mt-2 w-full accent-brand-600"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            How many passages to retrieve per question. Higher = more context,
            but more noise.
          </p>

          {/* Two-round toggle */}
          <button
            type="button"
            onClick={() => setTwoRound((v) => !v)}
            className="mt-5 flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
          >
            <span
              className={`mt-0.5 flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition ${
                twoRound ? "bg-brand-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  twoRound ? "translate-x-4" : ""
                }`}
              />
            </span>
            <span>
              <span className="block text-xs font-medium text-slate-700">
                Two-round generation
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-400">
                Generate Knowledge-Based and Skill-Based questions in separate
                rounds, each with its own retrieval context.
              </span>
            </span>
          </button>

          {/* Documents */}
          <label className="mt-5 block text-xs font-medium text-slate-600">
            Grounding documents{" "}
            <span className="text-slate-400">({selected.length} selected)</span>
          </label>
          <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {indexedDocs.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No indexed documents yet. Upload and index documents first.
              </p>
            )}
            {indexedDocs.map((d) => {
              const isSel = selected.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDoc(d.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    isSel
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      isSel
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {isSel && <Check size={11} />}
                  </span>
                  <FileText size={15} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate text-slate-700">{d.name}</span>
                  <span className="ml-auto flex-shrink-0 text-[11px] text-slate-400">
                    {d.chunks} chunks
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <Button
            onClick={onGenerate}
            disabled={generating}
            size="lg"
            className="mt-5 w-full"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Q&A
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Output panel */}
      <div className="lg:col-span-3">
        {generating && <GeneratingState topK={topK} />}

        {!generating && !result && (
          <Card className="flex h-full min-h-[20rem] flex-col items-center justify-center p-10 text-center">
            <div className="rounded-full bg-brand-50 p-3 text-brand-600">
              <Sparkles size={26} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-800">
              Grounded questions appear here
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Configure a job role and grounding documents, then generate. Every
              answer is traceable to a source chunk, and out-of-scope prompts are
              flagged rather than hallucinated.
            </p>
          </Card>
        )}

        {!generating && result && (
          <ResultView result={result} onViewAll={() => navigate("/results")} />
        )}
      </div>
    </div>
  );
}

function GeneratingState({ topK }) {
  const steps = [
    "Embedding the job-role prompt",
    `Retrieving top-${topK} passages (FAISS)`,
    "Generating grounded answers",
    "Classifying Knowledge vs Skill",
  ];
  return (
    <Card className="p-8">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Loader2 size={16} className="animate-spin text-brand-600" /> Running RAG
        pipeline…
      </div>
      <div className="mt-5 space-y-3">
        {steps.map((s, i) => (
          <div
            key={s}
            className="flex items-center gap-3 text-sm text-slate-500"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
            {s}
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-slate-100"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </Card>
  );
}

function ResultView({ result, onViewAll }) {
  const kn = result.questions.filter((q) => q.type === "knowledge").length;
  const sk = result.questions.filter((q) => q.type === "skill").length;
  const oos = result.questions.filter((q) => !q.answerable).length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {result.jobRole}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {result.questions.length} questions · top-k {result.topK}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onViewAll}>
            Open in Results
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <TypeBadge type="knowledge" size="sm" /> {kn}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <TypeBadge type="skill" size="sm" /> {sk}
          </span>
          {oos > 0 && (
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <UnanswerablePill /> {oos}
            </span>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {result.questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i} />
        ))}
      </div>
    </div>
  );
}
