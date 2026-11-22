import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  BookOpen,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button } from "../components/ui.jsx";
import { formatDate } from "../lib/format.js";

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2D6C4] bg-[#F0E7D7] text-brand-700">
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</dt>
        <dd className="mt-0.5 font-display text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {value}
        </dd>
      </div>
    </div>
  );
}

function SourceExample() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[228px] w-full max-w-[330px] md:block">
      <span className="absolute right-8 top-1 h-14 w-14 rounded-full border border-dashed border-[#A84431]/30" />
      <div className="animate-paper-note absolute left-1 top-2 z-10 w-[78%] -rotate-3 border border-[#D8CCB9] bg-[#FBF8F1] p-4 text-[#25201B] shadow-[0_14px_28px_rgba(37,32,27,0.14)]">
        <div className="flex items-center justify-between border-b border-[#E2D6C4] pb-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
            <FileText size={13} strokeWidth={1.8} className="text-[#A84431]" />
            Reference notes
          </div>
          <span className="h-2 w-2 rounded-full bg-[#D8B36E]" />
        </div>
        <div className="mt-3 max-w-[148px]">
          <p className="max-w-[96px] text-[9px] font-bold uppercase tracking-[0.14em] text-[#893A2A]">Incident response</p>
          <p className="mt-1 max-w-[96px] font-display text-sm font-semibold leading-5">Keep the handoff clear.</p>
          <p className="mt-1 max-w-[96px] text-[10px] leading-4 text-[#62574B]">
            Set an owner. Share the next step.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-[#6E5424]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D8B36E]" />
            On-call lead
          </div>
        </div>
      </div>

      <div className="animate-interview-kit absolute bottom-1 right-0 z-20 w-[58%] border border-[#3A332D] bg-[#25201B] p-4 text-[#F0E7D7] shadow-[0_14px_26px_rgba(37,32,27,0.2)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D8B36E]">
            <BookOpen size={12} /> Interview kit
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[#D9CCBA]">Source-led</span>
        </div>
        <div className="mt-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#D8B36E]">Prompt 01 / Scenario</p>
          <p className="mt-1 font-display text-xs font-medium leading-4 text-[#FBF8F1]">
            How would you handle a missed handoff?
          </p>
          <p className="mt-1.5 text-[9px] leading-4 text-[#B9AA98]">
            Listen for: ownership, next steps.
          </p>
        </div>
      </div>
    </div>
  );
}

function KitRow({ set }) {
  const role = set.jobRole;
  const questionCount = set.questions?.length || 0;

  return (
    <Link
      to={`/results?setId=${set.id}`}
      className="group flex items-center gap-4 border-t border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 sm:px-6"
    >
      <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2D6C4] bg-[#F0E7D7] text-brand-700">
        <FileText size={17} strokeWidth={1.8} />
        <span className="absolute bottom-2 right-2 h-px w-3 bg-[#D8B36E]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700">
          {role}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span>{questionCount} {questionCount === 1 ? "question" : "questions"}</span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} aria-hidden="true" />
            {formatDate(set.createdAt)}
          </span>
        </p>
      </div>
      <span className="hidden text-xs font-medium text-brand-700 transition-colors group-hover:text-brand-600 sm:block">
        View kit
      </span>
      <ChevronRight
        size={16}
        aria-hidden="true"
        className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
      />
    </Link>
  );
}

export default function Dashboard() {
  const { jobProfiles, qaSets, loading } = useApp();

  const recentSets = [...qaSets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const questionCount = qaSets.reduce(
    (total, set) => total + (set.questions?.length || 0),
    0
  );

  if (loading) {
    return (
      <div role="status" aria-label="Loading dashboard" className="space-y-5">
        <span className="sr-only">Loading dashboard</span>
        <div className="h-64 animate-pulse border border-slate-200 bg-slate-100" />
        <div className="h-24 animate-pulse border border-slate-200 bg-slate-100" />
        <div className="h-56 animate-pulse border border-slate-200 bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden border border-[#D8CCB9] bg-[#F7F1E8] p-6 sm:p-8 lg:p-9">
        <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(250px,0.9fr)]">
          <div className="max-w-2xl">
            <h2 className="max-w-[19ch] font-display text-3xl font-semibold leading-[1.08] tracking-[-0.025em] text-[#211B17] sm:text-4xl lg:text-[2.4rem]">
              Better interviews start with what your team already knows.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              Build a job profile, add reference documents, and prepare questions with answers your team can trace to the source.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/generate">
                <Button variant="primary" className="min-h-11 rounded-lg font-semibold">
                  Generate questions <ArrowRight size={15} />
                </Button>
              </Link>
              <Link to="/job-profiles">
                <Button variant="secondary" className="min-h-11 rounded-lg">
                  <Briefcase size={15} /> Job profiles
                </Button>
              </Link>
            </div>
          </div>
          <SourceExample />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden p-0 xl:col-span-8">
          <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-900">Recent interview kits</h3>
              <p className="mt-1 text-xs text-slate-500">
                {recentSets.length} of {qaSets.length} kits
              </p>
            </div>
            <Link
              to="/results"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
            >
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {recentSets.length === 0 ? (
            <div className="mx-5 mb-5 border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center sm:mx-6 sm:mb-6">
              <ClipboardList size={23} className="mx-auto text-slate-400" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-semibold text-slate-800">No interview kits yet</p>
              <p className="mt-1 text-sm text-slate-600">
                {jobProfiles.length > 0
                  ? "Generate questions from one of your job profiles."
                  : "Create a job profile to start preparing an assessment."}
              </p>
              <Link to={jobProfiles.length > 0 ? "/generate" : "/job-profiles"}>
                <Button size="sm" className="mt-4 min-h-10">
                  {jobProfiles.length > 0 ? "Generate questions" : "Create a job profile"}
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              {recentSets.map((set) => (
                <KitRow key={set.id} set={set} />
              ))}
            </div>
          )}
        </Card>

        <aside className="space-y-6 xl:col-span-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">Workspace index</h3>
                <p className="mt-0.5 text-xs text-slate-500">A live count of your interview materials.</p>
              </div>
              <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2D6C4] bg-[#F0E7D7] text-brand-700">
                <BookOpen size={17} strokeWidth={1.8} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D8B36E]" />
              </span>
            </div>
            <dl aria-label="Workspace totals" className="divide-y divide-[#E2D6C4] border-t border-[#E2D6C4]">
              <StatCard icon={ClipboardList} label="Interview kits" value={qaSets.length} />
              <StatCard icon={Briefcase} label="Job profiles" value={jobProfiles.length} />
              <StatCard icon={FileText} label="Questions prepared" value={questionCount} />
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="font-display text-xl font-semibold text-slate-900">A clear path to interview day</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Keep the role, supporting materials, and questions together.
            </p>
            <ol className="mt-5 divide-y divide-slate-200">
              {[
                { label: "Create a job profile", to: "/job-profiles" },
                { label: "Add source documents", to: "/job-profiles" },
                { label: "Generate and review questions", to: "/generate" },
              ].map((step, index) => (
                <li key={step.label}>
                  <Link
                    to={step.to}
                    className="group flex min-h-14 items-center gap-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D8B36E] font-display text-sm text-[#893A2A]">
                      {index + 1}
                    </span>
                    <span className="flex-1">{step.label}</span>
                    <ArrowRight size={15} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
