import { useState } from "react";
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold">
            A
          </div>
          <h1 className="mt-3 text-2xl font-bold">AssessIQ</h1>
          <p className="text-sm text-brand-100">Job-Specific QA Generation</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${
                  mode === m ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
                }`}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <Button type="submit" disabled={busy} size="lg" className="w-full">
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn size={16} /> Sign in
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Create account
                </>
              )}
            </Button>
          </form>

          {apiMode === "mock" && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-center text-xs text-slate-400">Demo quick login</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => quick("recruiter", "demo123")}
                  disabled={busy}
                >
                  Recruiter
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => quick("admin", "admin123")}
                  disabled={busy}
                >
                  Admin
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-brand-100">
          <ShieldCheck size={13} /> Closed-domain · processing stays on your infrastructure
        </p>
      </div>
    </div>
  );
}
