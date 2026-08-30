// Export helpers for generated Q&A sets (JSON / CSV).

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const slug = (s) =>
  (s || "qa-set").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function exportJSON(set) {
  const filename = set.candidateName
    ? `${slug(set.candidateName)}-${slug(set.jobRole)}.json`
    : `${slug(set.jobRole)}.json`;
  download(filename, JSON.stringify(set, null, 2), "application/json");
}

function csvCell(v) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportCSV(set) {
  const header = [
    "candidate_name",
    "candidate_role",
    "job_role",
    "question",
    "answer",
    "type",
    "answerable",
    "confidence",
    "sources",
  ];
  const rows = set.questions.map((q) =>
    [
      set.candidateName || "",
      set.candidateRole || set.jobRole || "",
      set.jobRole || "",
      q.question,
      q.answer,
      q.type,
      q.answerable,
      q.confidence,
      (q.sources || [])
        .map((s) => `${s.docName}#${s.chunkId}`)
        .join("; "),
    ]
      .map(csvCell)
      .join(",")
  );
  const filename = set.candidateName
    ? `${slug(set.candidateName)}-${slug(set.jobRole)}.csv`
    : `${slug(set.jobRole)}.csv`;
  download(filename, [header.join(","), ...rows].join("\n"), "text/csv");
}

