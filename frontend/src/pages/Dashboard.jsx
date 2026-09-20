import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ClipboardList,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { computeStats } from "../api/mockData.js";
import { Card, Button } from "../components/ui.jsx";

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
  };
  const s = map[status] || map.done;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function KitRow({ set }) {
  const role = set.jobRole || "General Role";
  const roleBadge = role?.includes("Dev") ? "Engineering" : role?.includes("SDET") ? "QA" : "General";
  return (
    <Link
      to={`/results?setId=${set.id}`}
      className="group flex items-center gap-4 rounded-xl px-4 py-3.5 hover:bg-slate-50/80 transition-all duration-150 hover:shadow-sm border border-transparent hover:border-slate-100"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-teal-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100/50">
        <Briefcase size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 truncate">
          {role}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400 truncate">{set.questions?.length || 0} questions</span>
          <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {roleBadge}
          </span>
        </div>
      </div>
      <StatusPill status="ready" />
      <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
    </Link>
  );
}

export default function Dashboard() {
  const { jobProfiles, qaSets, loading } = useApp();

  const stats = useMemo(
    () => computeStats(qaSets, jobProfiles),
    [qaSets, jobProfiles]
  );

  const recentSets = [...qaSets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return <div className="text-sm font-medium text-slate-300">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-7">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-teal-700 p-8 lg:p-10 shadow-elevated">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-300/5 blur-3xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-100 ring-1 ring-inset ring-white/15">
            <Sparkles size={12} /> AI-Powered Generation
          </span>
          <h2 className="mt-4 text-3xl font-black text-white font-display tracking-tight leading-tight lg:text-4xl">
            Prepare Custom Interview Questions
          </h2>
          <p className="mt-3 text-sm text-brand-100/70 max-w-lg leading-relaxed">
            AI-powered interview intelligence for every role.
            Create a job profile, upload documents, and generate grounded questions.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/generate">
              <Button className="bg-brand-950 text-white hover:bg-black/40 shadow-lg hover:shadow-xl ring-1 ring-inset ring-white/10 font-bold px-6 py-3 text-sm">
                <Sparkles size={16} /> Generate Assessment
              </Button>
            </Link>
            <Link to="/job-profiles">
              <Button className="bg-white/10 text-white hover:bg-white/20 ring-1 ring-inset ring-white/20 backdrop-blur-sm px-5 py-3 text-sm font-semibold">
                <Briefcase size={16} /> Job Profiles
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="Interview Kits" value={qaSets.length} accent="brand" />
        <StatCard icon={Briefcase} label="Job Profiles" value={jobProfiles.length} accent="slate" />
        <StatCard icon={Zap} label="Questions Generated" value={qaSets.reduce((acc, s) => acc + (s.questions?.length || 0), 0)} accent="amber" />
      </div>

      {/* Recent Kits */}
      <Card className="p-0 overflow-hidden">
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
            <Link to="/job-profiles">
              <Button size="sm" className="mt-4">
                <Briefcase size={14} /> Create Job Profile
              </Button>
            </Link>
          </div>
        ) : (
          <div className="px-2 pb-2">
            {recentSets.map((set, idx) => (
              <KitRow key={set.id} set={set} idx={idx} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
