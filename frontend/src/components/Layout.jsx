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
  AlertCircle,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import api, { apiMode } from "../api/client.js";
import { useApp } from "../context/AppContext.jsx";
import { LogoMark } from "./Logo.jsx";
import PageDoodle from "./PageDoodle.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTour } from "../context/TourContext.jsx";
import Tour from "./Tour.jsx";

const baseNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/job-profiles", label: "Job Profiles", icon: Briefcase },
  { to: "/generate", label: "Generate Q&A", icon: Sparkles },
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
  "/": "Role-specific interview preparation from your company documents.",
  "/job-profiles": "Manage job role templates and documents for interview assessments.",
  "/generate": "Set a role, select company evidence, and shape the question set.",
  "/results": "Review, rate, and export generated question sets",
  "/admin": "Manage users, access permissions, and RAG hyperparameters",
};

export default function Layout() {
  const { pathname } = useLocation();
  const {
    jobProfiles,
    loadError,
    loading: workspaceLoading,
    retryWorkspaceLoad,
  } = useApp();
  const { user, setUser, logout } = useAuth();
  const { restart } = useTour();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const nav =
    user?.role === "admin"
      ? [...baseNav, { to: "/admin", label: "Admin Settings", icon: Shield }]
      : baseNav;
  const artwork =
    pathname === "/job-profiles"
      ? "profiles"
      : pathname.startsWith("/job-profiles/")
      ? "documents"
      : pathname === "/generate"
      ? "questions"
      : pathname === "/results"
      ? "results"
      : pathname === "/admin"
      ? "people"
      : null;
  const isProfileDocumentsPage = pathname.startsWith("/job-profiles/");
  const pageTitle = isProfileDocumentsPage
    ? "Profile Sources"
    : titles[pathname] || "AssessIQ";
  const pageSubtitle = isProfileDocumentsPage
    ? "Add job descriptions and reference documents; track source indexing."
    : subtitles[pathname] || "";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
    <div className="fieldbook-workspace flex min-h-screen bg-page-bg font-sans">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col border-r border-white/[0.08] bg-[#171411] shadow-2xl shadow-black/20 transition-[transform,width] duration-300 ease-out lg:translate-x-0 ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand Logo Header */}
        <div className={`flex items-center border-b border-white/[0.08] py-5 ${sidebarCollapsed ? "justify-between px-4 lg:flex-col lg:justify-center lg:gap-3 lg:px-3" : "justify-between px-4"}`}>
          <Link to="/" className={`flex items-center gap-3 transition-opacity hover:opacity-80 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
            <LogoMark className={`shrink-0 ${sidebarCollapsed ? "h-8 w-8" : "h-9 w-9"}`} />
            <div className={`leading-tight ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <div className="flex items-center font-display text-sm font-bold tracking-tight text-[#FBF8F1]">
                assess<span className="text-[#D8B36E]">IQ</span>
                <span className="ml-1.5 rounded-md bg-[#D8B36E]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#D8B36E]">
                  PRO
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#A99A86]">
                Interview Intelligence
              </div>
            </div>
          </Link>
          <div className={`flex items-center gap-1 ${sidebarCollapsed ? "lg:flex-col" : ""}`}>
            <button
              type="button"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={sidebarCollapsed}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden rounded-lg p-2 text-[#A99A86] transition hover:bg-white/10 hover:text-[#FBF8F1] lg:inline-flex"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg p-2 text-[#A99A86] transition hover:bg-white/10 hover:text-[#FBF8F1] lg:hidden"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Navigation links */}
        <nav className={`flex-1 space-y-1 py-6 ${sidebarCollapsed ? "px-2 lg:px-3" : "px-4"}`}>
          <div className={`px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A99A86] ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            Workspace
          </div>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={sidebarCollapsed ? label : undefined}
              aria-label={sidebarCollapsed ? label : undefined}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : ""} ${
                  isActive
                    ? "bg-[#C45B3D]/15 text-[#FBF8F1] shadow-inner"
                    : "text-[#B9AA98] hover:bg-white/[0.06] hover:text-[#FBF8F1]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[#D8B36E]" />
                  )}
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={`transition-colors ${
                      isActive
                        ? "text-[#D8B36E]"
                        : "text-[#8E8171] group-hover:text-[#D9CCBA]"
                    }`}
                  />
                  <span className={sidebarCollapsed ? "lg:hidden" : ""}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Widget */}
        <div className={`space-y-3 pb-5 ${sidebarCollapsed ? "px-2 lg:px-2" : "px-4"}`}>
          {/* Status summary */}
          <div
            title={sidebarCollapsed ? `${jobProfiles.length} Profiles` : undefined}
            className={`space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs ${sidebarCollapsed ? "lg:flex lg:justify-center lg:p-3" : ""}`}
          >
            <div className="flex items-center justify-between font-semibold text-[#F0E7D7]">
              <span className="flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#D8B36E]" />
                <span className={sidebarCollapsed ? "lg:hidden" : ""}>{jobProfiles.length} Profiles</span>
              </span>
            </div>
            <p className={`text-[10px] leading-relaxed text-[#A99A86] ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              Strictly closed-domain &middot; Zero hallucination
            </p>
          </div>

          {/* User Profile */}
          {user && (
            <div className={`flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 ${sidebarCollapsed ? "lg:flex-col lg:gap-2 lg:p-2" : ""}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8B36E] text-[11px] font-bold uppercase text-[#211B17]">
                {user.username.slice(0, 2)}
              </div>
              <div className={`min-w-0 flex-1 leading-tight ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                <div className="truncate text-xs font-semibold text-[#FBF8F1]">
                  {user.username}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#D8B36E]">
                  {user.role}
                </div>
              </div>
              <div className={`flex items-center gap-0.5 ${sidebarCollapsed ? "lg:flex-col" : ""}`}>
                <button
                  title="Settings"
                  aria-label="Settings"
                  onClick={() => { setShowSettings(true); setTab("profile"); setPwError(""); setPwSuccess(false); setUsername(user?.username || ""); setEmail(user?.email || ""); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                  className="rounded-lg p-2 text-[#A99A86] transition-colors hover:bg-white/10 hover:text-[#FBF8F1]"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={logout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-lg p-2 text-[#A99A86] transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Tour Button */}
          <button
            onClick={restart}
            title={sidebarCollapsed ? "Take Guided Tour" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#B9AA98] transition-colors hover:border-[#D8B36E]/30 hover:bg-[#D8B36E]/10 hover:text-[#F0E7D7] ${sidebarCollapsed ? "lg:px-0" : ""}`}
          >
            <Compass size={14} /> <span className={sidebarCollapsed ? "lg:hidden" : ""}>Take Guided Tour</span>
          </button>

          <div
            title={sidebarCollapsed ? (apiMode === "real" ? "Connected to Live Backend" : "Demo Simulation Mode") : undefined}
            className={`flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#A99A86] ${sidebarCollapsed ? "lg:gap-0" : ""}`}
          >
            <ShieldCheck size={12} className="text-[#D8B36E]" />
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>
              {apiMode === "real" ? "Connected to Live Backend" : "Demo Simulation Mode"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`ml-0 flex min-h-screen w-full min-w-0 flex-col transition-[margin,width] duration-300 ease-out ${sidebarCollapsed ? "sidebar-main-collapsed" : "lg:ml-[272px]"}`}>
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#171411] px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#F0E7D7] shadow-sm transition hover:bg-white/[0.12] hover:text-white lg:hidden"
            >
              {mobileNavOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-semibold tracking-tight text-[#FBF8F1] sm:text-lg">
                {pageTitle}
              </h1>
              <p className="mt-0.5 hidden truncate text-xs text-[#B9AA98] sm:block">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => { setShowSettings(true); setTab("profile"); setPwError(""); setPwSuccess(false); setUsername(user?.username || ""); setEmail(user?.email || ""); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
              aria-label="Settings"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-2.5 py-2 text-xs font-semibold text-white shadow-sm shadow-black/20 transition hover:bg-brand-500 sm:px-3.5"
            >
              <Settings size={14} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 text-xs font-semibold text-[#D9CCBA] shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white sm:px-3.5"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
          <PageDoodle variant={artwork} />
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {loadError && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
            >
              <span className="flex items-center gap-2">
                <AlertCircle size={16} />
                {loadError}
              </span>
              <button
                type="button"
                disabled={workspaceLoading}
                onClick={retryWorkspaceLoad}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={13} className={workspaceLoading ? "animate-spin" : ""} />
                Try again
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171411]/70 p-4">
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 text-sand-700">
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
