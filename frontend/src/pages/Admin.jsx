import { useEffect, useState } from "react";
import { Users, SlidersHorizontal, ShieldCheck, Save, Loader2, AlertCircle, Shield, Sliders, CheckCircle2 } from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Button } from "../components/ui.jsx";

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [params, setParams] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, p] = await Promise.all([api.listUsers(), api.getParams()]);
        setUsers(u);
        setParams(p);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const updated = await api.setParams(params);
      setParams(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 border border-rose-200">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up">
      {/* Users */}
      <Card className="p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 font-display">
            <Users size={18} className="text-brand-600" /> Authorized Accounts
          </h3>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
            {users.length} users
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100/80">
          {users.map((u) => (
            <div key={u.username} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-xs font-black uppercase text-white shadow-xs">
                  {u.username.slice(0, 2)}
                </div>
                <div className="leading-tight">
                  <span className="text-xs font-bold text-slate-900">
                    {u.username}
                  </span>
                  {u.username === user?.username && (
                    <span className="ml-1.5 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded">
                      YOU
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${u.role === "admin"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
              >
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* System params */}
      <Card className="p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-3.5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 font-display">
            <SlidersHorizontal size={18} className="text-brand-600" /> RAG System Hyperparameters
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Global pipeline defaults applied to new candidate assessment generations.
          </p>
        </div>

        {params && (
          <div className="mt-5 space-y-4">
            <Field
              label="Default Retrieval Depth (top-k passages)"
              value={params.defaultTopK}
              min={1}
              max={20}
              onChange={(v) => setParams({ ...params, defaultTopK: v })}
            />
            <Field
              label="Questions Per Generated Assessment"
              value={params.questionsPerSet}
              min={2}
              max={20}
              onChange={(v) => setParams({ ...params, questionsPerSet: v })}
            />
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Answerability Out-of-Scope Threshold
                </label>
                <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-700 border border-brand-200/60">
                  {Number(params.answerabilityThreshold).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.answerabilityThreshold}
                onChange={(e) =>
                  setParams({ ...params, answerabilityThreshold: Number(e.target.value) })
                }
                className="mt-2 w-full accent-brand-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Minimum cosine similarity required before a prompt is flagged as unsupported.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button onClick={save} disabled={saving} variant="gradient">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Hyperparameters
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> Saved successfully
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, min, max, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">{label}</label>
        <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-700 border border-brand-200/60">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand-600"
      />
    </div>
  );
}
