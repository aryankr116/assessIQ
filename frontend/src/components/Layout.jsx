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
} from "lucide-react";
import { apiMode } from "../api/client.js";
import { useApp } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTour } from "../context/TourContext.jsx";
import Tour from "./Tour.jsx";

const baseNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/generate", label: "Generate Q&A", icon: Sparkles },
  { to: "/results", label: "Results", icon: ClipboardList },
];

const titles = {
  "/": "Dashboard",
  "/documents": "Document Library",
  "/generate": "Generate Q&A",
  "/results": "Results & Export",
  "/admin": "Admin",
};

const subtitles = {
  "/": "Closed-domain RAG over your enterprise documents",
  "/documents": "Upload, ingest, and index source documents",
  "/generate": "Turn a job-role prompt into grounded, classified questions",
  "/results": "Review, filter, and export generated question sets",
  "/admin": "Manage users and system parameters",
};

export default function Layout() {
  const { pathname } = useLocation();
  const { documents } = useApp();
  const { user, logout } = useAuth();
  const { restart } = useTour();
  const indexed = documents.filter((d) => d.status === "indexed").length;
  const nav =
    user?.role === "admin"
      ? [...baseNav, { to: "/admin", label: "Admin", icon: Shield }]
      : baseNav;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <span className="text-base font-extrabold">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-slate-900">
              AssessIQ
            </div>
            <div className="text-[11px] text-slate-400">
              Job-Specific QA Generation
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 px-4 pb-5">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Database size={14} className="text-brand-600" />
              {indexed} indexed {indexed === 1 ? "document" : "documents"}
            </div>
            <p className="mt-1 leading-relaxed">
              Answers are grounded only in your uploaded files.
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold uppercase text-brand-700">
                {user.username.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-semibold text-slate-800">
                  {user.username}
                </div>
                <div className="text-[11px] capitalize text-slate-400">{user.role}</div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}

          <button
            onClick={restart}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <MapPin size={14} className="text-brand-600" /> Take a tour
          </button>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-500" />
            Closed-domain · {apiMode === "real" ? "Live API" : "Demo data"}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-64 flex w-full flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/80 px-8 py-4 backdrop-blur">
          <h1 className="text-lg font-semibold text-slate-900">
            {titles[pathname] || "AssessIQ"}
          </h1>
          <p className="text-sm text-slate-500">{subtitles[pathname] || ""}</p>
        </header>
        <main className="flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>

      <Tour />
    </div>
  );
}
