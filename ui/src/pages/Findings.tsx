import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Download, ChevronDown, ChevronRight, X } from "lucide-react";
import { fetchFromMongoDB, loadSavedEntries, saveEntries, CATEGORY_LABELS } from "../services/testData";
import type { TestEntry, DatasetMeta } from "../services/testData";
import { RiskBadge, Spinner, EmptyState } from "../components/ui";

const catLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ");

// Helper to convert finding to concise format
function findingToParagraph(finding: any): string {
  const type = finding.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
  const severity = finding.severity.toUpperCase();
  
  // Concise, professional format
  let paragraph = `[${severity}] ${type}: ${finding.explanation}`;
  
  if (finding.recommendation) {
    paragraph += ` — Fix: ${finding.recommendation}`;
  }
  
  return paragraph;
}

// Helper to generate findings summary
function generateFindingsSummary(findings: any[]): string {
  if (findings.length === 0) return '';
  
  const bySeverity = findings.reduce((acc, f) => {
    const sev = f.severity.toUpperCase();
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const summary: string[] = [];
  if (bySeverity['CRITICAL']) summary.push(`${bySeverity['CRITICAL']} Critical`);
  if (bySeverity['HIGH']) summary.push(`${bySeverity['HIGH']} High`);
  if (bySeverity['MEDIUM']) summary.push(`${bySeverity['MEDIUM']} Medium`);
  if (bySeverity['LOW']) summary.push(`${bySeverity['LOW']} Low`);
  
  return `${findings.length} issue${findings.length !== 1 ? 's' : ''}: ${summary.join(', ')}`;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-l-red-500",
  HIGH:     "border-l-orange-500",
  MEDIUM:   "border-l-yellow-500",
  LOW:      "border-l-blue-500",
};

interface FindingCardProps {
  entry: TestEntry;
  defaultOpen?: boolean;
}

function FindingCard({ entry, defaultOpen = false }: FindingCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card mb-4">
      {/* Card header */}
      <button
        className="w-full flex items-start justify-between gap-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-start gap-3 min-w-0">
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-gray-500">Q{entry.question_number}</span>
              <span className="text-xs text-gray-400">{catLabel(entry.category)}</span>
              <RiskBadge risk={entry.overall_risk} />
              <span className="text-xs text-gray-600">score: {entry.overall_score.toFixed(1)}</span>
              <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5">
                {entry.findings.length} finding{entry.findings.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{entry.question}</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-5">
          {/* Response */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Agent Response</div>
            <p className="text-sm text-gray-400 leading-relaxed max-h-32 overflow-y-auto">
              {entry.response || <span className="italic text-gray-600">No response recorded</span>}
            </p>
          </div>

          {/* Findings */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Security Issues
            </div>
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-400 mb-3">
                {generateFindingsSummary(entry.findings)}
              </div>
              <ul className="space-y-2 text-xs text-gray-300 leading-relaxed">
                {entry.findings.map((f, idx) => (
                  <li key={idx} className={`flex items-start gap-2 pl-3 border-l-2 ${SEVERITY_COLORS[f.severity]} py-1`}>
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>{findingToParagraph(f)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function exportCsv(entries: TestEntry[]) {
  const rows: string[] = [
    ["Q#", "Category", "Question", "Score", "Risk", "Finding Type", "Severity", "Confidence", "Explanation", "Recommendation"].join(","),
  ];
  entries.forEach(e => {
    e.findings.forEach(f => {
      rows.push([
        e.question_number,
        catLabel(e.category),
        `"${e.question.replace(/"/g, '""')}"`,
        e.overall_score.toFixed(1),
        e.overall_risk,
        f.type,
        f.severity,
        (f.confidence * 100).toFixed(0) + "%",
        `"${(f.explanation ?? "").replace(/"/g, '""')}"`,
        `"${(f.recommendation ?? "").replace(/"/g, '""')}"`,
      ].join(","));
    });
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "findings_export.csv";
  a.click();
}

export default function FindingsPage() {
  const [entries, setEntries] = useState<TestEntry[]>([]);
  const [_meta, _setMeta] = useState<DatasetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const saved = loadSavedEntries();
      if (saved.entries.length > 0) {
        setEntries(saved.entries.filter(e => e.findings.length > 0));
        _setMeta(saved.meta);
        setLoading(false);
      } else {
        try {
          const fetched = await fetchFromMongoDB();
          const m: DatasetMeta = { filename: "MongoDB - instest.results", loadedAt: new Date().toISOString(), count: fetched.length };
          saveEntries(fetched, m);
          setEntries(fetched.filter(e => e.findings.length > 0));
          _setMeta(m);
        } catch (e) {
          console.error("MongoDB fetch failed:", e);
          setError(e instanceof Error ? e.message : 'Failed to fetch data from MongoDB');
        }
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => [...new Set(entries.map(e => e.category))].sort(), [entries]);
  const severities = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => e.findings.forEach(f => s.add(f.severity)));
    return [...s].sort();
  }, [entries]);

  const filtered = useMemo(() => entries.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (filterSeverity && !e.findings.some(f => f.severity === filterSeverity)) return false;
    return true;
  }), [entries, filterCategory, filterSeverity]);

  const totalFindings = useMemo(() => filtered.reduce((s, e) => s + e.findings.length, 0), [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-gray-400">
        <Spinner />
        <span>Loading findings&hellip;</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<X className="w-8 h-8" />}
          title="Failed to Load Findings"
          description={error}
        />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-8 h-8 text-emerald-400" />}
        title="No findings detected"
        description="All test interactions passed without flagged findings."
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-800 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Findings</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalFindings} finding{totalFindings !== 1 ? "s" : ""} across {filtered.length} interaction{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="px-8 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
        <select
          className="input py-1.5 text-sm bg-gray-900"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>

        <select
          className="input py-1.5 text-sm bg-gray-900"
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
        >
          <option value="">All Severities</option>
          {severities.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {(filterCategory || filterSeverity) && (
          <button
            onClick={() => { setFilterCategory(""); setFilterSeverity(""); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            No findings match the current filters.
          </div>
        ) : (
          filtered.map((e, idx) => (
            <FindingCard key={e.log_id} entry={e} defaultOpen={idx === 0} />
          ))
        )}
      </div>
    </div>
  );
}
