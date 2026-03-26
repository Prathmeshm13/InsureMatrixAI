import { useState, useEffect, useMemo } from "react";
import { Lightbulb, AlertTriangle, CheckCircle, RefreshCw, Sparkles } from "lucide-react";
import { fetchFromMongoDB, generateComprehensiveInsight, CATEGORY_LABELS } from "../services/testData";
import type { TestEntry, DatasetMeta } from "../services/testData";
import { RiskBadge, Spinner, EmptyState } from "../components/ui";

const catLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ");

interface InsightCardProps {
  entry: TestEntry;
  rank: number;
}

function InsightCard({ entry, rank }: InsightCardProps) {
  const needsAttention = entry.overall_score < 70 || entry.findings.length > 0;
  
  return (
    <div className={`card ${needsAttention ? 'border-l-4 border-l-orange-500' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            {needsAttention ? (
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
            ) : (
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-gray-500">#{rank}</span>
              <span className="text-xs text-gray-400">Q{entry.question_number}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">{catLabel(entry.category)}</span>
            </div>
            <p className="text-sm font-medium text-gray-200 line-clamp-2">{entry.question}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <RiskBadge risk={entry.overall_risk} />
          <div className="text-right">
            <div className={`text-sm font-semibold ${
              entry.overall_score >= 85 ? 'text-emerald-400' :
              entry.overall_score >= 70 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {entry.overall_score.toFixed(1)}%
            </div>
            {entry.findings.length > 0 && (
              <div className="text-xs text-red-400">{entry.findings.length} issue{entry.findings.length !== 1 ? 's' : ''}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [entries, setEntries] = useState<TestEntry[]>([]);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'needs-attention'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchFromMongoDB();
      const comprehensiveInsight = generateComprehensiveInsight(fetched);
      const m: DatasetMeta = {
        filename: "MongoDB – instest.results",
        loadedAt: new Date().toISOString(),
        count: fetched.length,
        comprehensive_insight: comprehensiveInsight,
      };
      setEntries(fetched);
      setMeta(m);
    } catch (err) {
      console.error("MongoDB fetch failed:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data from MongoDB');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = entries;
    
    if (filterType === 'critical') {
      result = result.filter(e => e.overall_risk === 'CRITICAL' || e.overall_risk === 'HIGH');
    } else if (filterType === 'needs-attention') {
      result = result.filter(e => e.overall_score < 70 || e.findings.length > 0);
    }
    
    // Sort by score ascending (worst first) for better priority
    return result.sort((a, b) => a.overall_score - b.overall_score);
  }, [entries, filterType]);

  const stats = useMemo(() => {
    const total = entries.length;
    const critical = entries.filter(e => e.overall_risk === 'CRITICAL' || e.overall_risk === 'HIGH').length;
    const needsAttention = entries.filter(e => e.overall_score < 70 || e.findings.length > 0).length;
    
    return { total, critical, needsAttention };
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-gray-400">
        <Spinner />
        <span>Loading insights…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="Failed to Load Insights"
          description={error}
        />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb className="w-8 h-8 text-blue-400" />}
        title="No data available"
        description="Upload evaluation results to see AI-generated insights."
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-400" />
              AI Insights &amp; Comprehensive Analysis
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Step 5: Intelligent analysis and security recommendations
            </p>
          </div>
          <button
            onClick={load}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Comprehensive Insight - Prominent Display */}
        {meta?.comprehensive_insight && (
          <div className="bg-gradient-to-br from-blue-950/40 to-purple-950/40 border-2 border-blue-500/30 rounded-xl p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg flex-shrink-0">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
                  Comprehensive Security Analysis
                  <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    Step 5 - AI Generated
                  </span>
                </h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {meta.comprehensive_insight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Tests</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Score</div>
            <div className="text-2xl font-bold text-blue-400">
              {stats.total > 0 ? (entries.reduce((s, e) => s + e.overall_score, 0) / stats.total).toFixed(1) : '0'}%
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Critical/High Risk</div>
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Needs Attention</div>
            <div className="text-2xl font-bold text-orange-400">{stats.needsAttention}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-3 border-b border-gray-800 flex items-center gap-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Filter Issues:</span>
        {(['all', 'critical', 'needs-attention'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filterType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {type === 'all' ? 'All Tests' : 
             type === 'critical' ? 'Critical/High Risk' :
             'Needs Attention'}
          </button>
        ))}
        <span className="text-xs text-gray-600 ml-auto">
          Showing {filtered.length} of {entries.length}
        </span>
      </div>

      {/* Simple Test List */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-8 h-8 text-emerald-400" />}
            title="No results match filter"
            description="Try adjusting your filter criteria."
          />
        ) : (
          <div className="max-w-5xl space-y-3">
            {filtered.map((entry, idx) => (
              <InsightCard key={entry.log_id} entry={entry} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
