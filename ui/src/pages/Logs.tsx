import { useState } from 'react';
import { Activity, Download, Search, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { RiskBadge, EmptyState } from '../components/ui';
import { loadHistory } from '../services/storage';
import type { HistoryEntry } from '../services/storage';

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [entries] = useState<HistoryEntry[]>(() => loadHistory());

  const filtered = entries.filter(e => {
    const matchSearch =
      !search ||
      e.filename.toLowerCase().includes(search.toLowerCase()) ||
      (e.question || '').toLowerCase().includes(search.toLowerCase());
    const matchRisk =
      filterRisk === 'all' ||
      (e.evaluation?.overall_risk === filterRisk);
    return matchSearch && matchRisk;
  });

  const handleExport = () => {
    const lines = entries.map(e =>
      JSON.stringify({
        timestamp: e.timestamp,
        filename: e.filename,
        question: e.question,
        overall_score: e.evaluation?.overall_score,
        overall_risk: e.evaluation?.overall_risk,
        findings: e.evaluation?.findings,
      })
    );
    const blob = new Blob([lines.join('\n')], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_logs_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Agent Logs
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            All document analyses and evaluation results stored locally.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {entries.length > 0 && (
            <button
              onClick={handleExport}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSONL
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-3 border-b border-gray-800 flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename or question…"
            className="input pl-9 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filterRisk === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {filtered.length} / {entries.length} entries
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8" />}
            title="No log entries"
            description="Analyzed documents will appear here. Enable the 5-step evaluation to see full results."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => (
              <div key={entry.id} className="card-sm hover:border-gray-600 transition-all">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Time */}
                  <div className="text-xs text-gray-500 w-36 flex-shrink-0 pt-0.5">
                    <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                    <div className="font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-200 truncate max-w-xs">
                        {entry.filename}
                      </span>
                      {entry.analysisResult.entity_types.length > 0 && (
                        <span className="badge bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {entry.analysisResult.entity_types.length} PII types
                        </span>
                      )}
                    </div>
                    {entry.question && (
                      <div className="text-xs text-gray-400">Q: {entry.question}</div>
                    )}
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {entry.analysisResult.summary.replace(/\*\*/g, '').slice(0, 120)}…
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {entry.evaluation ? (
                      <>
                        <RiskBadge risk={entry.evaluation.overall_risk} />
                        <span className={`text-sm font-bold ${
                          entry.evaluation.overall_score >= 80 ? 'text-emerald-400' :
                          entry.evaluation.overall_score >= 65 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {entry.evaluation.overall_score}/100
                        </span>
                        <span className="text-xs text-gray-500">
                          {entry.evaluation.findings.length} finding{entry.evaluation.findings.length !== 1 ? 's' : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-600">No evaluation</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {entry.analysisResult.execution_time_ms}ms
                    </span>
                  </div>
                </div>

                {/* Check results mini row */}
                {entry.evaluation?.check_results && (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2 flex-wrap">
                    {entry.evaluation.check_results.map(cr => (
                      <div key={cr.check_name} className="flex items-center gap-1 text-xs">
                        {cr.passed
                          ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                          : <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-gray-500">
                          {cr.check_name.replace(/^check_\d+_/, '').replace(/_/g, ' ')}
                        </span>
                        <span className={`font-mono ${cr.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                          {cr.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
