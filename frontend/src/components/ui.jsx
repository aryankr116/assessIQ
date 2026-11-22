// Reusable UI primitives used across pages.
import { BrainCircuit, Wrench, AlertTriangle } from "lucide-react";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`ui-card rounded-2xl border border-slate-200/70 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover ${className}`}
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
      "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 shadow-sm hover:shadow-md",
    secondary:
      "bg-white text-slate-500 ring-1 ring-inset ring-sand-200 hover:bg-slate-50 hover:ring-sand-300 disabled:opacity-60",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger: "text-red-600 hover:bg-red-50 ring-1 ring-inset ring-transparent hover:ring-red-200",
    gradient:
      "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 shadow-sm hover:shadow-md",
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TypeBadge({ type, size = "md" }) {
  const isKnowledge = type === "knowledge";
  const Icon = isKnowledge ? BrainCircuit : Wrench;
  const cls = isKnowledge
    ? "bg-brand-50 text-brand-700 ring-brand-100"
    : "bg-sand-100 text-sand-700 ring-sand-200";
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
    indexed: "bg-sand-100 text-sand-700 ring-sand-200",
    chunking: "bg-[#F6EFDF] text-[#6E5424] ring-[#D8B36E]/40",
    extracting: "bg-brand-50 text-brand-700 ring-brand-100",
    uploading: "bg-sand-100 text-sand-700 ring-sand-200",
    embedding: "bg-brand-50 text-brand-700 ring-brand-100",
    indexing: "bg-[#F6EFDF] text-[#6E5424] ring-[#D8B36E]/40",
    processing: "bg-[#F6EFDF] text-[#6E5424] ring-[#D8B36E]/40",
    uploaded: "bg-sand-100 text-sand-700 ring-sand-200",
    failed: "bg-[#F8EAE4] text-[#893A2A] ring-[#E4B7A8]",
  };
  const label = {
    indexed: "Indexed",
    chunking: "Chunking",
    extracting: "Extracting",
    uploading: "Uploading",
    embedding: "Embedding",
    indexing: "Indexing",
    processing: "Processing",
    uploaded: "Uploaded",
    failed: "Failed",
  };
  const dotColor = {
    indexed: "bg-sand-600",
    failed: "bg-brand-600",
    uploading: "bg-sand-500",
    extracting: "bg-brand-500",
    embedding: "bg-brand-700",
    indexing: "bg-amber-600",
    chunking: "bg-amber-500",
    processing: "bg-amber-500",
  };
  const animate = status !== "indexed" && status !== "failed" && status !== "uploaded";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${map[status] || map.uploaded}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor[status] || "bg-amber-500"} ${animate ? "animate-pulse" : ""}`}
      />
      {label[status] || status}
    </span>
  );
}

export function ConfidenceBar({ value }) {
  return null;
}

export function UnanswerablePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-100">
      <AlertTriangle size={13} />
      Out of scope
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sand-200 bg-sand-50/50 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-2xl bg-brand-50 p-3 text-brand-500">
          <Icon size={26} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {children && (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{children}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
