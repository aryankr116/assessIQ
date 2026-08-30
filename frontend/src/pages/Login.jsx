import { useState } from "react";
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Loader2, Sparkles, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiMode } from "../api/client.js";
import { Button } from "../components/ui.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function quick(u, p) {
    setError("");
    setBusy(true);
    try {
      await login(u, p);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-brand-950 to-indigo-950 px-4 overflow-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-pulse-glow" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Brand Header */}
        <div className="mb-7 flex flex-col items-center text-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 text-2xl font-black shadow-glow border border-white/20">
            A
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight font-display">AssessIQ</h1>
          <p className="mt-1 text-xs font-semibold text-brand-200">
            Closed-Domain QA Assessment Platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-xl p-7 shadow-2xl border border-white/40">
          {/* Segmented Mode Switcher */}
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`flex-1 rounded-lg py-2 font-bold capitalize transition-all cursor-pointer ${mode === m
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">Username</label>
              <div className="relative mt-1.5">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  placeholder="Enter username"
                  className="w-full rounded-xl border border-slate-300/80 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-xs font-medium outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <div className="relative mt-1.5">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300/80 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-xs font-medium outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                <AlertCircle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              size="lg"
              variant="gradient"
              className="mt-2 w-full !py-2.5 shadow-md"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn size={16} /> Sign In
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Register Account
                </>
              )}
            </Button>
          </form>

          {apiMode === "mock" && (
            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Demo Access
              </span>
              <div className="mt-2.5 flex gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 !py-2 !text-xs !font-bold hover:!bg-brand-50 hover:!border-brand-300"
                  onClick={() => quick("recruiter", "demo123")}
                  disabled={busy}
                >
                  Recruiter Demo
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 !py-2 !text-xs !font-bold hover:!bg-brand-50 hover:!border-brand-300"
                  onClick={() => quick("admin", "admin123")}
                  disabled={busy}
                >
                  Admin Demo
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-brand-200 font-semibold">
          <ShieldCheck size={14} className="text-emerald-400" /> All data stays on your local host infrastructure
        </p>
      </div>
    </div>
  );
}
