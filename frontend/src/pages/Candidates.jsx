import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Eye,
  Search,
  RotateCw,
  UserPlus,
  FileText,
  Clock,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Card, Button } from "../components/ui.jsx";
import AddCandidateModal from "../components/AddCandidateModal.jsx";
import EditCandidateModal from "../components/EditCandidateModal.jsx";
import { formatDateTime } from "../lib/format.js";
import { exportPDF } from "../lib/export.js";

export default function Candidates() {
  const { candidates, qaSets, deleteCandidate, refreshCandidates } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [editCandidate, setEditCandidate] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const candidateKits = useMemo(() => {
    const grouped = candidates.map((cand) => ({
      ...cand,
      kits: qaSets
        .filter(
          (set) =>
            set.candidateId === cand.id ||
            (set.candidateName &&
              cand.name &&
              set.candidateName.trim().toLowerCase() ===
                cand.name.trim().toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    }));
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    return grouped.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.targetRole && c.targetRole.toLowerCase().includes(q))
    );
  }, [candidates, qaSets, searchQuery]);

  const formatRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getTopics = (kit) => {
    if (kit.questions && kit.questions.length > 0) {
      const topics = kit.questions.slice(0, 3).map((q) => {
        const text = q.question || "";
        const match = text.match(/(?:about|involving|using|for|of)\s+([^.?,]{3,40})/i);
        return match ? match[1].trim() : null;
      }).filter(Boolean);
      if (topics.length > 0) return topics.join(", ");
    }
    return kit.prompt || "General interview";
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
          />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border-0 bg-white text-xs outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
        <Button size="sm" onClick={() => setShowAddCandidate(true)}>
          <UserPlus size={14} /> Add Candidate
        </Button>
      </div>

      {/* Candidate List */}
      <div className="space-y-3">
        {candidateKits.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm font-medium text-slate-400">
              No matching candidates found
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Add a candidate or adjust your search filter
            </p>
          </Card>
        ) : (
          candidateKits.map((cand) => {
            const isExpanded = expandedId === cand.id;
            const lastKit = cand.kits[0];
            return (
              <Card key={cand.id} className="overflow-hidden transition-all">
                {/* Compact Profile Header */}
                <div
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : cand.id)
                  }
                >
                  {/* Avatar */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
                    {cand.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  {/* Name & Role */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      {cand.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-500">
                        {cand.targetRole || "Unspecified role"}
                      </span>
                      {cand.resumeName && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <FileText size={11} />
                            {cand.resumeName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-brand-400" />
                      <span className="font-semibold text-slate-600">
                        {cand.kits.length}
                      </span>
                      <span>Kit{cand.kits.length !== 1 ? "s" : ""}</span>
                    </div>
                    {lastKit && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{formatRelativeTime(lastKit.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCandidate(cand);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
                      title="Edit candidate"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete ${cand.name}? This cannot be undone.`)) {
                          deleteCandidate(cand.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-red-50 hover:text-red-600 hover:ring-red-200 cursor-pointer"
                      title="Delete candidate"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/generate?candidateId=${cand.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700 cursor-pointer"
                    >
                      <Sparkles size={12} /> Generate
                    </button>
                    {cand.kits.length > 0 && (
                      <Link
                        to={`/results?setId=${cand.kits[0].id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50"
                      >
                        <Eye size={12} /> View Latest
                      </Link>
                    )}
                  </div>
                </div>

                {/* Interview Kit Timeline (Expandable) */}
                {isExpanded && cand.kits.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/30">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">
                      Interview History
                    </h4>
                    <div className="space-y-1.5">
                      {cand.kits.map((kit, idx) => (
                        <div
                          key={kit.id}
                          className="flex items-center gap-3 rounded-lg bg-white px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 transition-all hover:ring-brand-200 hover:bg-brand-50/30 group"
                        >
                          {/* Round indicator */}
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-600">
                            R{cand.kits.length - idx}
                          </div>

                          {/* Kit info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">
                              {getTopics(kit)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400">
                                {kit.questions?.length || 0} questions
                              </span>
                              <span className="text-slate-200">·</span>
                              <span className="text-[11px] text-slate-400">
                                {kit.documentIds?.length || 0} doc
                                {(kit.documentIds?.length || 0) !== 1
                                  ? "s"
                                  : ""}
                              </span>
                              <span className="text-slate-200">·</span>
                              <span className="text-[11px] text-slate-400">
                                {formatRelativeTime(kit.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Kit actions */}
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/results?setId=${kit.id}`}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                              title="Open Kit"
                            >
                              <Eye size={14} />
                            </Link>
                            <button
                              onClick={() => exportPDF(kit)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </button>
                            {idx === 0 && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/generate?candidateId=${cand.id}`
                                  )
                                }
                                className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                                title="Regenerate"
                              >
                                <RotateCw size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {isExpanded && cand.kits.length === 0 && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/30">
                    <p className="text-xs text-slate-300 italic text-center">
                      No interview kits generated yet
                    </p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <AddCandidateModal
        open={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
        onCreated={() => setShowAddCandidate(false)}
      />

      <EditCandidateModal
        open={!!editCandidate}
        candidate={editCandidate}
        onClose={() => setEditCandidate(null)}
        onUpdated={() => setEditCandidate(null)}
      />
    </div>
  );
}
