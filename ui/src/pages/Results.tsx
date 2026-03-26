import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Filter, X } from "lucide-react";
import { fetchFromMongoDB, loadSavedEntries, saveEntries, CATEGORY_LABELS, CHECK_LABELS } from "../services/testData";
import type { TestEntry, DatasetMeta } from "../services/testData";
import { RiskBadge, ScoreBar, Spinner, EmptyState } from "../components/ui";
import { TableProperties } from "lucide-react";

const catLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ");
const checkLabel = (name: string) => CHECK_LABELS[name] ?? name.replace(/_/g, " ");

const RISK_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Helper to convert finding to readable paragraph
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
  
  return `Found ${findings.length} issue${findings.length !== 1 ? 's' : ''}: ${summary.join(', ')}`;
}

interface RowProps {
  entry: TestEntry;
}

function ResultRow({ entry }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor =
    entry.overall_score >= 98 ? "text-emerald-400" :
    entry.overall_score >= 90 ? "text-yellow-400" :
    entry.overall_score >= 75 ? "text-orange-400" : "text-red-400";

  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3 text-gray-500 font-mono text-xs w-10">
          {entry.question_number}
        </td>
        <td className="px-4 py-3 w-48">
          <span className="text-xs text-gray-400 leading-tight">{catLabel(entry.category)}</span>
        </td>
        <td className="px-4 py-3 text-gray-300 text-sm max-w-xs">
          <span className="line-clamp-2">{entry.question}</span>
        </td>
        <td className="px-4 py-3 w-28">
          <div className="flex items-center gap-2">
            <span className={`font-mono font-semibold text-sm ${scoreColor}`}>
              {entry.overall_score.toFixed(1)}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 w-28">
          <RiskBadge risk={entry.overall_risk} />
        </td>
        <td className="px-4 py-3 w-20 text-center">
          {entry.findings.length > 0 ? (
            <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5">
              {entry.findings.length}
            </span>
          ) : (
            <span className="text-xs text-gray-600">—</span>
          )}
        </td>
        <td className="px-4 py-3 w-10 text-gray-500">
          {expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-900/60 border-b border-gray-800">
          <td colSpan={7} className="px-6 py-5">
            <div className="grid grid-cols-2 gap-6">
              {/* Question & Response */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Question</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{entry.question}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Response
                    <span className="ml-2 text-gray-600 normal-case font-normal">
                      ({entry.response_word_count} words · {entry.total_processing_time_ms}ms)
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed max-h-40 overflow-y-auto pr-1">
                    {entry.response || <span className="italic text-gray-600">No response recorded</span>}
                  </p>
                </div>
              </div>

              {/* Check scores */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    5-Step Check Results
                  </div>
                  <div className="space-y-2">
                    {entry.check_results.map(cr => (
                      <div key={cr.check_name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{checkLabel(cr.check_name)}</span>
                          <div className="flex items-center gap-2">
                            {cr.finding_count > 0 && (
                              <span className="text-red-400 text-xs">{cr.finding_count} finding{cr.finding_count !== 1 ? "s" : ""}</span>
                            )}
                            <span className={`font-mono font-semibold ${cr.passed ? "text-emerald-400" : "text-red-400"}`}>
                              {cr.score.toFixed(1)}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${cr.passed ? "bg-emerald-400" : "bg-red-400"}`} />
                          </div>
                        </div>
                        <ScoreBar score={cr.score} showValue={false} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Findings summary */}
                {entry.findings.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Security Issues
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-400 mb-3">
                        {generateFindingsSummary(entry.findings)}
                      </div>
                      <ul className="space-y-2 text-xs text-gray-300 leading-relaxed">
                        {entry.findings.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-gray-600 mt-0.5">•</span>
                            <span>{findingToParagraph(f)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ResultsPage() {
  const [entries, setEntries] = useState<TestEntry[]>([]);
  const [_meta, _setMeta] = useState<DatasetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterRisk, setFilterRisk] = useState<string>("");
  const [findingsOnly, setFindingsOnly] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const saved = loadSavedEntries();
      if (saved.entries.length > 0) {
        setEntries(saved.entries);
        _setMeta(saved.meta);
        setLoading(false);
      } else {
        try {
          const fetched = await fetchFromMongoDB();
          const m: DatasetMeta = { filename: "MongoDB - instest.results", loadedAt: new Date().toISOString(), count: fetched.length };
          saveEntries(fetched, m);
          setEntries(fetched);
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

  const filtered = useMemo(() => entries.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (filterRisk && e.overall_risk !== filterRisk) return false;
    if (findingsOnly && e.findings.length === 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.question.toLowerCase().includes(q) || e.response.toLowerCase().includes(q);
    }
    return true;
  }), [entries, filterCategory, filterRisk, findingsOnly, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setFilterRisk("");
    setFindingsOnly(false);
  };

  const hasFilters = !!(searchQuery || filterCategory || filterRisk || findingsOnly);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-gray-400">
        <Spinner />
        <span>Loading test results&hellip;</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<X className="w-8 h-8" />}
          title="Failed to Load Results"
          description={error}
        />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<TableProperties className="w-8 h-8" />}
        title="No test results"
        description="Upload a selenium evaluation JSONL file using the sidebar button."
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Test Results</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {filtered.length} of {entries.length} interactions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="px-8 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            className="input pl-8 pr-3 py-1.5 w-full text-sm"
            placeholder="Search questions / responses…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="flex items-center gap-1 text-gray-400">
          <Filter className="w-3.5 h-3.5" />
          <select
            className="input py-1.5 text-sm bg-gray-900"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{catLabel(c)}</option>
            ))}
          </select>
        </div>

        {/* Risk */}
        <select
          className="input py-1.5 text-sm bg-gray-900"
          value={filterRisk}
          onChange={e => setFilterRisk(e.target.value)}
        >
          <option value="">All Risk Levels</option>
          {RISK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Findings toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={findingsOnly}
            onChange={e => setFindingsOnly(e.target.checked)}
            className="accent-blue-500 w-3.5 h-3.5"
          />
          With findings only
        </label>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            No results match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-950 z-10">
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Risk</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Findings</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => <ResultRow key={e.log_id} entry={e} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
