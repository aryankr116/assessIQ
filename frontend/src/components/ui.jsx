// Small set of reusable, dependency-light UI primitives used across pages.
import { BrainCircuit, Wrench, AlertTriangle } from "lucide-react";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 shadow-sm",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-60",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "text-red-600 hover:bg-red-50 border border-transparent",
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Knowledge vs Skill tag — the core classification output of the system.
export function TypeBadge({ type, size = "md" }) {
  const isKnowledge = type === "knowledge";
  const Icon = isKnowledge ? BrainCircuit : Wrench;
  const cls = isKnowledge
    ? "bg-blue-50 text-blue-700 ring-blue-200"
    : "bg-purple-50 text-purple-700 ring-purple-200";
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${cls} ${pad}`}
    >
      <Icon size={size === "sm" ? 12 : 13} />
      {isKnowledge ? "Knowledge" : "Skill"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    indexed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    chunking: "bg-amber-50 text-amber-700 ring-amber-200",
    extracting: "bg-amber-50 text-amber-700 ring-amber-200",
    uploaded: "bg-slate-100 text-slate-600 ring-slate-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
  };
  const label = {
    indexed: "Indexed",
    chunking: "Chunking",
    extracting: "Extracting",
    uploaded: "Uploaded",
    failed: "Failed",
  };
  const animate = status === "chunking" || status === "extracting";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${map[status] || map.uploaded}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "indexed"
            ? "bg-emerald-500"
            : status === "failed"
            ? "bg-red-500"
            : "bg-amber-500"
        } ${animate ? "animate-pulse" : ""}`}
      />
      {label[status] || status}
    </span>
  );
}

export function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2" title={`Grounding confidence ${pct}%`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
}

export function UnanswerablePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
      <AlertTriangle size={13} />
      Out of scope
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-brand-50 p-3 text-brand-600">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {children && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
