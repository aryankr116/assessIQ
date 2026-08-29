import { useEffect, useState } from "react";
import { Users, SlidersHorizontal, ShieldCheck, Save, Loader2, AlertCircle } from "lucide-react";
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
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Users */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users size={16} className="text-brand-600" /> User accounts
          <span className="ml-1 text-slate-400">({users.length})</span>
        </h3>
        <div className="mt-4 divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.username} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-500">
                  {u.username.slice(0, 2)}
                </div>
                <span className="text-sm font-medium text-slate-800">
                  {u.username}
                  {u.username === user?.username && (
                    <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                  )}
                </span>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                  u.role === "admin"
                    ? "bg-purple-50 text-purple-700 ring-purple-200"
                    : "bg-blue-50 text-blue-700 ring-blue-200"
                }`}
              >
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* System params */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <SlidersHorizontal size={16} className="text-brand-600" /> System parameters
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Defaults applied to new generations across all recruiters.
        </p>

        {params && (
          <div className="mt-5 space-y-4">
            <Field
              label="Default retrieval depth (top-k)"
              value={params.defaultTopK}
              min={1}
              max={20}
              onChange={(v) => setParams({ ...params, defaultTopK: v })}
            />
            <Field
              label="Questions per set"
              value={params.questionsPerSet}
              min={2}
              max={20}
              onChange={(v) => setParams({ ...params, questionsPerSet: v })}
            />
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">
                  Answerability threshold
                </label>
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
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
                Minimum retrieval similarity before a prompt is treated as out-of-scope.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save parameters
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <ShieldCheck size={13} /> Saved
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
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
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
