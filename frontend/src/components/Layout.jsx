import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  ClipboardList,
  ShieldCheck,
  Database,
  Shield,
  LogOut,
  MapPin,
  Users,
  Compass,
} from "lucide-react";
import { apiMode } from "../api/client.js";
import { useApp } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTour } from "../context/TourContext.jsx";
import Tour from "./Tour.jsx";

const baseNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/documents", label: "Documents & Candidates", icon: FileText },
  { to: "/generate", label: "Generate Q&A", icon: Sparkles },
  { to: "/results", label: "Results & Export", icon: ClipboardList },
];

const titles = {
  "/": "Dashboard Overview",
  "/documents": "Enterprise Documents & Candidate Hub",
  "/generate": "Candidate Assessment Generator",
  "/results": "Assessment Results & Export",
  "/admin": "Admin Settings",
};

const subtitles = {
  "/": "Automated, grounded interview question generation for enterprise hiring",
  "/documents": "Manage internal knowledge documents and candidate profiles with resumes",
  "/generate": "Synthesize grounded Knowledge-Based and Skill-Based questions for candidates",
  "/results": "Review, filter, rate, and export candidate-grounded question sets",
  "/admin": "Manage users, access permissions, and RAG hyperparameters",
};

export default function Layout() {
  const { pathname } = useLocation();
  const { documents, candidates } = useApp();
  const { user, logout } = useAuth();
  const { restart } = useTour();
  const indexed = documents.filter((d) => d.status === "indexed").length;
  const nav =
    user?.role === "admin"
      ? [...baseNav, { to: "/admin", label: "Admin Settings", icon: Shield }]
      : baseNav;

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-6 py-5.5 border-b border-slate-100/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 text-white shadow-glow">
            <span className="text-lg font-black font-display tracking-wider">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-1.5">
              AssessIQ
              <span className="rounded-md bg-brand-50 px-1.5 py-0.2 text-[9px] font-black text-brand-600 border border-brand-200">
                PRO
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Intelligent QA System
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 px-3.5 py-4">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </div>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-150 ${isActive
                  ? "bg-gradient-to-r from-brand-50 to-indigo-50/60 text-brand-700 shadow-xs border border-brand-200/80"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={`transition-colors ${isActive
                        ? "text-brand-600"
                        : "text-slate-400 group-hover:text-slate-600"
                      }`}
                  />
                  <span>{label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600 shadow-glow" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Widget */}
        <div className="space-y-3 px-4 pb-5">
          {/* Status summary pill */}
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-brand-50/30 p-3 text-xs text-slate-600 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Database size={13} className="text-brand-600" />
                {indexed} Docs
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-indigo-600">
                <Users size={13} />
                {candidates.length} Candidates
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Strictly closed-domain · Zero hallucination
            </p>
          </div>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-700 text-xs font-extrabold uppercase text-white shadow-xs">
                {user.username.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-bold text-slate-900">
                  {user.username}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                  {user.role}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}

          {/* Interactive Tour Button */}
          <button
            onClick={restart}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 shadow-xs"
          >
            <Compass size={14} className="text-brand-600" /> Take Guided Tour
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <ShieldCheck size={12} className="text-emerald-500" />
            {apiMode === "real" ? "Connected to Live Backend" : "Demo Simulation Mode"}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ml-64 flex w-full flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-8 py-4 backdrop-blur-md shadow-xs">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 font-display">
              {titles[pathname] || "AssessIQ"}
            </h1>
            <p className="text-xs font-medium text-slate-500">{subtitles[pathname] || ""}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              RAG Engine Ready
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 py-7 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>

      <Tour />
    </div>
  );
}
