import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck, LogIn, AlertCircle, Loader2,
  Lock, User, Eye, EyeOff, TrendingUp, Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api, { apiMode } from "../api/client.js";
import { LogoMark, FullLogo } from "../components/Logo.jsx";

const GOOGLE_CLIENT_ID = "438380772420-ogp6gn91h64ruvvlit0h8guo3vfve9ee.apps.googleusercontent.com";

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl bg-white/60 backdrop-blur-sm p-4 border border-white/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=done
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const googleBtnRef = useRef(null);

  // Initialize Google Identity Services
  useEffect(() => {
    if (typeof window.google === "undefined") return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "signin_with",
        shape: "rectangular",
      });
    }
  }, []);

  async function handleGoogleCredential(response) {
    setError("");
    setGoogleBusy(true);
    try {
      await googleLogin(response.credential);
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password, email.trim());
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
    <div className="flex min-h-screen font-sans">
      {/* ── Left branding panel ── */}
      <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50/30 px-12 py-10 lg:flex xl:px-16">
        {/* Decorative wave SVGs */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 600">
          <defs>
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#99f6e4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d="M-50 600 Q200 500 300 350 Q400 200 500 280 Q600 360 750 200 L850 0 L850 600 Z" fill="url(#waveGrad1)" />
          <path d="M-50 600 Q100 480 250 400 Q400 320 550 350 Q700 380 850 250 L850 600 Z" fill="url(#waveGrad2)" />
          <path d="M600 600 Q650 500 700 420 Q750 340 800 300 L850 280 L850 600 Z" fill="#ccfbf1" fillOpacity="0.10" />
        </svg>

        <div className="relative z-10">
          <FullLogo />
        </div>

        <div className="relative z-10 max-w-lg space-y-10">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-900 font-display xl:text-5xl">
              Smarter Interviews.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">
                Better Hires.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              Generate grounded, role-specific interview questions from your company's technical documentation. No hallucinations — every answer is verifiable.
            </p>
          </div>

          <div className="space-y-3">
            <FeatureCard
              icon={ShieldCheck}
              title="Grounded in Your Docs"
              description="Questions are generated from your actual handbooks, manuals, and technical guides — not generic templates."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Role-Tailored Kits"
              description="Specify a job role and get knowledge + skill questions calibrated to the position, not the candidate."
            />
            <FeatureCard
              icon={Users}
              title="Closed-Domain Accuracy"
              description="Strictly grounded retrieval with zero hallucination. Every answer can be traced back to its source document."
            />
          </div>
        </div>

        <div className="relative z-10" />
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex w-full flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-teal-900 px-6 py-10 lg:w-[45%] xl:px-12">
        {/* Decorative wave SVGs */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 500 800">
          <defs>
            <linearGradient id="rWaveGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#99f6e4" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d="M-50 0 Q100 200 50 400 Q0 600 150 800 L-50 800 Z" fill="url(#rWaveGrad1)" />
          <path d="M50 0 Q150 150 100 350 Q50 550 200 800 L500 800 L500 0 Z" fill="#134e4a" fillOpacity="0.12" />
          <path d="M250 0 Q350 200 300 400 Q250 600 400 800 L500 800 L500 0 Z" fill="#115e59" fillOpacity="0.08" />
        </svg>

        {/* Mobile brand header (hidden on desktop) */}
        <div className="relative z-10 mb-8 flex flex-col items-center text-center text-white lg:hidden">
          <LogoMark className="h-20 w-20 mix-blend-screen" />
          <h1 className="mt-4 text-3xl font-black tracking-tight font-display">
            assess<span className="text-teal-300">IQ</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-brand-200">Interview Intelligence</p>
        </div>

        {/* Form Card */}
        <div className="relative z-10 w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-8 shadow-elevated lg:p-9">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 -mb-[2px] ${
                  mode === m
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  placeholder="Enter username"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Email (register only) */}
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Email</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-teal-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-brand-700 hover:to-teal-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  {mode === "login" ? "Sign In" : "Create Account"}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Google Sign In */}
          {googleBusy ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Signing in with Google...
            </div>
          ) : (
            <div ref={googleBtnRef} className="w-full" />
          )}

          {/* Quick Demo Access */}
          {apiMode === "mock" && (
            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Demo Access
              </span>
              <div className="mt-2.5 flex gap-2.5">
                <button
                  onClick={() => quick("recruiter", "demo123")}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-all hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 cursor-pointer disabled:opacity-50"
                >
                  Recruiter Demo
                </button>
                <button
                  onClick={() => quick("admin", "admin123")}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-all hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 cursor-pointer disabled:opacity-50"
                >
                  Admin Demo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="relative z-10 mt-6 flex items-center gap-1.5 text-xs text-brand-200/80 font-semibold">
          <ShieldCheck size={14} className="text-brand-300" /> All data stays on your local host infrastructure
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated animate-fade-in-up">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {forgotStep === 1 ? "Reset Password" : "Check Your Email"}
              </h3>
              <button
                onClick={() => { setShowForgot(false); setForgotStep(1); setForgotEmail(""); setForgotError(""); }}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Step 1: Enter email */}
            {forgotStep === 1 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setForgotBusy(true);
                setForgotError("");
                try {
                  await api.forgotPassword(forgotEmail.trim());
                  setForgotStep(2);
                } catch (err) {
                  setForgotError(err.message || "Something went wrong");
                } finally {
                  setForgotBusy(false);
                }
              }}>
                <p className="text-xs text-slate-500 mb-4">
                  Enter the email address associated with your account and we'll send you a new password.
                </p>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Email</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                {forgotError && (
                  <div className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                    {forgotError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={forgotBusy}
                  className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {forgotBusy ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Send New Password"}
                </button>
              </form>
            )}

            {/* Step 2: Success */}
            {forgotStep === 2 && (
              <div className="text-center py-2">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-800">Check your inbox</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  If an account exists for <span className="font-medium text-slate-700">{forgotEmail}</span>, a new password has been sent.
                </p>
                <button
                  onClick={() => { setShowForgot(false); setForgotStep(1); setForgotEmail(""); }}
                  className="mt-5 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
