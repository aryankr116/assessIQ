import { useState, useEffect } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  ShieldCheck,
  Database,
  Shield,
  LogOut,
  Briefcase,
  Compass,
  Settings,
  Loader2,
} from "lucide-react";
import api, { apiMode } from "../api/client.js";
import { useApp } from "../context/AppContext.jsx";
import { LogoMark } from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTour } from "../context/TourContext.jsx";
import Tour from "./Tour.jsx";

const baseNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/generate", label: "Generate Q&A", icon: Sparkles },
  { to: "/job-profiles", label: "Job Profiles", icon: Briefcase },
  { to: "/results", label: "Results & Export", icon: ClipboardList },
];

const titles = {
  "/": "Dashboard Overview",
  "/job-profiles": "Job Profiles",
  "/generate": "Generate Q&A",
  "/results": "Results & Export",
  "/admin": "Admin Settings",
};

const subtitles = {
  "/": "AI-powered interview intelligence for every role",
  "/job-profiles": "Manage job role templates and documents for interview assessments.",
  "/generate": "Create custom interview kits by selecting a job role and enterprise docs",
  "/results": "Review, rate, and export generated question sets",
  "/admin": "Manage users, access permissions, and RAG hyperparameters",
};

export default function Layout() {
  const { pathname } = useLocation();
  const { jobProfiles } = useApp();
  const { user, setUser, logout } = useAuth();
  const { restart } = useTour();
  const nav =
    user?.role === "admin"
      ? [...baseNav, { to: "/admin", label: "Admin Settings", icon: Shield }]
      : baseNav;

  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState("profile"); // profile | password
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    const handler = () => {
      setShowSettings(true);
      setTab("profile");
      setPwError("");
      setPwSuccess(false);
      setUsername(user?.username || "");
      setEmail(user?.email || "");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    };
    window.addEventListener("open-settings", handler);
    return () => window.removeEventListener("open-settings", handler);
  }, [user]);

  return (
    <div className="flex min-h-screen bg-page-bg font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#fafbfc] border-r border-slate-100">
        {/* Brand Logo Header */}
        <Link to="/" className="flex items-center gap-3 px-5 py-5 hover:opacity-80 transition-opacity">
          <LogoMark className="h-9 w-9 shrink-0" />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-slate-900 font-display flex items-center">
              assess<span className="text-brand-600">IQ</span>
              <span className="ml-1.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-600">
                PRO
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Interview Intelligence
            </div>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          <div className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            Workspace
          </div>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-50/70 text-emerald-900"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-full bg-emerald-500" />
                  )}
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={`transition-colors ${
                      isActive
                        ? "text-emerald-600"
                        : "text-slate-300 group-hover:text-slate-400"
                    }`}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Widget */}
        <div className="space-y-2 px-3.5 pb-5">
          {/* Status summary */}
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Briefcase size={12} className="text-emerald-500" />
                {jobProfiles.length} Profiles
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Strictly closed-domain &middot; Zero hallucination
            </p>
          </div>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-2.5 rounded-lg bg-white p-2.5 shadow-sm border border-slate-100/80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold uppercase text-white">
                {user.username.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-semibold text-slate-800">
                  {user.username}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                  {user.role}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  title="Settings"
                  onClick={() => { setShowSettings(true); setTab("profile"); setPwError(""); setPwSuccess(false); setUsername(user?.username || ""); setEmail(user?.email || ""); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                  className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Tour Button */}
          <button
            onClick={restart}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-400 shadow-sm border border-slate-100/80 transition-colors hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100"
          >
            <Compass size={14} /> Take Guided Tour
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-300">
            <ShieldCheck size={12} className="text-emerald-500" />
            {apiMode === "real" ? "Connected to Live Backend" : "Demo Simulation Mode"}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ml-64 flex w-full flex-col min-h-screen">
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-8 py-4 backdrop-blur-md border-b border-slate-200/50">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 font-display">
              {titles[pathname] || "AssessIQ"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {subtitles[pathname] || ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSettings(true); setTab("profile"); setPwError(""); setPwSuccess(false); setUsername(user?.username || ""); setEmail(user?.email || ""); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 cursor-pointer"
            >
              <Settings size={14} /> Settings
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 py-7 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated animate-fade-in-up">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-base font-bold text-slate-900 font-display">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 mb-4">
              {["profile", "password"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setPwError(""); setPwSuccess(false); }}
                  className={`flex-1 pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 -mb-[2px] capitalize ${
                    tab === t
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t === "profile" ? "Profile" : "Password"}
                </button>
              ))}
            </div>

            {pwSuccess ? (
              <div className="text-center py-2">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {tab === "profile" ? "Profile updated" : "Password updated"}
                </p>
                <button
                  onClick={() => setShowSettings(false)}
                  className="mt-5 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : tab === "profile" ? (
              /* Profile Tab */
              <form onSubmit={async (e) => {
                e.preventDefault();
                setPwError("");
                setPwBusy(true);
                try {
                  const res = await api.updateProfile(username.trim(), email.trim());
                  if (res.user) setUser(res.user);
                  if (res.token) {
                    const { tokenStore } = await import("../api/client.js");
                    tokenStore.set(res.token);
                  }
                  setPwSuccess(true);
                } catch (err) {
                  setPwError(err.message || "Failed to update profile");
                } finally {
                  setPwBusy(false);
                }
              }}>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                {pwError && (
                  <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                    {pwError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {pwBusy ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Save Changes"}
                </button>
              </form>
            ) : (
              /* Password Tab */
              <form onSubmit={async (e) => {
                e.preventDefault();
                setPwError("");
                if (newPw !== confirmPw) { setPwError("Passwords don't match"); return; }
                if (newPw.length < 4) { setPwError("Password must be at least 4 characters"); return; }
                setPwBusy(true);
                try {
                  await api.changePassword(currentPw, newPw);
                  setPwSuccess(true);
                } catch (err) {
                  setPwError(err.message || "Failed to change password");
                } finally {
                  setPwBusy(false);
                }
              }}>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Enter current password"
                      autoFocus
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                {pwError && (
                  <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                    {pwError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {pwBusy ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Tour />
    </div>
  );
}
