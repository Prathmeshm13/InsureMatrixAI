import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, X, Shield, Search, Trash2,
  RefreshCw, CheckCircle, AlertTriangle, Eye, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { MetricCard, RiskBadge, ScoreBar, Spinner, EmptyState } from '../components/ui';
import type { EvaluationResult } from '../services/api';
import { saveHistory, loadHistory, clearHistory, generateId } from '../services/storage';
import type { HistoryEntry } from '../services/storage';

// ---- Mock analysis (replaces Streamlit agent.analyze_document) ----
async function mockAnalyzeDocument(
  file: File,
  question?: string
): Promise<{
  success: boolean;
  summary: string;
  sensitive_entities_count: number;
  entity_types: string[];
  execution_time_ms: number;
}> {
  // Simulate latency
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
  const text = await file.text().catch(() => '');
  const lower = text.toLowerCase();

  const entities: string[] = [];
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) entities.push('Social Security Number');
  if (/\b4[0-9]{15}\b|\b5[1-5][0-9]{14}\b/.test(text)) entities.push('Credit Card Number');
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) entities.push('Email Address');
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) entities.push('Phone Number');
  if (/api[_-]?key|secret[_-]?key|access[_-]?token/i.test(text)) entities.push('API Key / Secret');
  if (/\b(Mr|Mrs|Dr|Ms)\.?\s+[A-Z][a-z]+/.test(text)) entities.push('Person Name');
  if (/\d+\s+\w+\s+(Street|Ave|Road|Blvd|Lane)/i.test(text)) entities.push('Physical Address');

  const docType = lower.includes('invoice')
    ? 'Invoice'
    : lower.includes('contract')
    ? 'Contract'
    : lower.includes('medical') || lower.includes('patient')
    ? 'Medical Record'
    : file.type.includes('pdf')
    ? 'PDF Document'
    : 'Text Document';

  const base = question
    ? `**Response to "${question}"**\n\nBased on the ${docType}, `
    : `**Document Analysis: ${docType}**\n\n`;

  const summary =
    base +
    (entities.length > 0
      ? `The document contains **${entities.length} type(s)** of sensitive information: ${entities.join(', ')}. This content should be handled according to your organization's data protection policies.`
      : 'No sensitive PII patterns were detected in this document. The content appears safe for standard processing.');

  return {
    success: true,
    summary,
    sensitive_entities_count: entities.length,
    entity_types: entities,
    execution_time_ms: Math.round(1200 + Math.random() * 800),
  };
}

// ---- Mock 5-step evaluation ----
async function mockRunEvaluation(
  _file: File,
  _question?: string
): Promise<EvaluationResult> {
  await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

  const scores = {
    check_1_sensitive_info: Math.round(70 + Math.random() * 30),
    check_2_alignment: Math.round(65 + Math.random() * 35),
    check_3_benchmarks: Math.round(60 + Math.random() * 40),
    check_4_adversarial: Math.round(75 + Math.random() * 25),
    check_5_algorithmic: Math.round(80 + Math.random() * 20),
  };

  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);
  const risk: EvaluationResult['overall_risk'] =
    overall >= 85 ? 'LOW' : overall >= 70 ? 'MEDIUM' : overall >= 55 ? 'HIGH' : 'CRITICAL';

  const findings: string[] = [];
  if (scores.check_1_sensitive_info < 80) findings.push('Potential PII detected in agent output');
  if (scores.check_2_alignment < 75) findings.push('Agent response may drift from declared purpose');
  if (scores.check_4_adversarial < 80) findings.push('Susceptibility to adversarial prompts detected');

  return {
    overall_score: overall,
    overall_risk: risk,
    findings,
    recommendations: ['Review redaction pipeline', 'Tighten output filters', 'Run adversarial test suite'],
    check_results: Object.entries(scores).map(([name, score]) => ({
      check_name: name,
      score,
      passed: score >= 70,
      findings: score < 70 ? [`${name} below threshold`] : [],
      recommendations: [],
    })),
    timestamp: new Date().toISOString(),
  };
}

// ============================
//  MAIN COMPONENT
// ============================
export default function AnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [evaluationEnabled, setEvaluationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [activeEntry, setActiveEntry] = useState<HistoryEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'results' | 'history'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- drag & drop ----
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f && /\.(pdf|docx?|txt)$/i.test(f.name)) setFile(f);
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  // ---- Analyze ----
  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setEvalLoading(false);

    try {
      const analysisResult = await mockAnalyzeDocument(file, question || undefined);

      let evaluation: EvaluationResult | undefined;
      if (evaluationEnabled) {
        setEvalLoading(true);
        evaluation = await mockRunEvaluation(file, question || undefined);
        setEvalLoading(false);
      }

      const entry: HistoryEntry = {
        id: generateId(),
        filename: file.name,
        question: question || undefined,
        analysisResult,
        evaluation,
        timestamp: new Date().toISOString(),
      };

      saveHistory(entry);
      const updated = loadHistory();
      setHistory(updated);
      setActiveEntry(entry);
      setActiveTab('results');
    } finally {
      setLoading(false);
      setEvalLoading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setActiveEntry(null);
  };

  // ---- Formatters ----
  const checkLabel = (name: string) =>
    name.replace(/^check_\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return `${Math.round(diff / 86400000)}d ago`;
  };

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Sensitive Document Analyzer
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Upload and analyze documents. All PII is detected and redacted locally.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-gray-200">
            <div
              onClick={() => setEvaluationEnabled(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${evaluationEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${evaluationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
            5-Step Evaluation
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 flex gap-2 border-b border-gray-800 pb-0">
        {(['upload', 'results', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn pb-3 rounded-none border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'upload' ? '📤 Upload & Analyze' : tab === 'results' ? '📊 Results' : '📋 History'}
            {tab === 'history' && history.length > 0 && (
              <span className="ml-1.5 bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* ============ UPLOAD TAB ============ */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl space-y-6">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                      <FileText className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{file.name}</div>
                    <div className="text-sm text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); resetFile(); }}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" /> Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 bg-gray-800 rounded-xl">
                      <Upload className="w-8 h-8 text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-300">Drop a document here or click to browse</div>
                    <div className="text-sm text-gray-500 mt-1">PDF, DOCX, DOC, TXT supported</div>
                  </div>
                </div>
              )}
            </div>

            {/* Optional question */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Optional: Ask a question about the document
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder='e.g. "Summarize this document" or "What PII is present?"'
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Capabilities */}
            {!file && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: '🔍', title: 'PII Detection', items: ['Names, emails, phones', 'SSNs, credit cards', 'Addresses & dates'] },
                  { icon: '📊', title: 'Document Analysis', items: ['Structure analysis', 'Key term extraction', 'Sentiment detection'] },
                  { icon: '🔒', title: 'Secure Processing', items: ['Local processing only', 'Auto-redacts PII', 'No external calls'] },
                ].map(({ icon, title, items }) => (
                  <div key={title} className="card-sm space-y-2">
                    <div className="text-xl">{icon}</div>
                    <div className="text-sm font-semibold text-gray-200">{title}</div>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {items.map(i => <li key={i}>· {i}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  {evalLoading ? 'Running evaluation…' : 'Analyzing document…'}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Document
                </>
              )}
            </button>
          </div>
        )}

        {/* ============ RESULTS TAB ============ */}
        {activeTab === 'results' && (
          <div className="max-w-3xl space-y-6">
            {activeEntry ? (
              <>
                {/* File info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{activeEntry.filename}</div>
                      <div className="text-xs text-gray-500">
                        Analyzed {timeAgo(activeEntry.timestamp)}
                        {activeEntry.question && ` · Q: "${activeEntry.question}"`}
                      </div>
                    </div>
                  </div>
                  {activeEntry.analysisResult.success ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Analysis complete · {activeEntry.analysisResult.execution_time_ms}ms
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Analysis failed
                    </span>
                  )}
                </div>

                {/* Eval metrics row */}
                {activeEntry.evaluation && (
                  <div className="grid grid-cols-3 gap-4">
                    <MetricCard
                      label="Health Score"
                      value={`${activeEntry.evaluation.overall_score}/100`}
                      subtext="5-step evaluation"
                    />
                    <div className="card-sm flex flex-col gap-2">
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Risk Level</div>
                      <div className="mt-1">
                        <RiskBadge risk={activeEntry.evaluation.overall_risk} />
                      </div>
                    </div>
                    <MetricCard
                      label="Findings"
                      value={activeEntry.evaluation.findings.length}
                      subtext="security issues"
                    />
                  </div>
                )}

                {/* Summary */}
                <div className="card space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Summary</h3>
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                    {activeEntry.analysisResult.summary}
                  </div>
                </div>

                {/* Sensitive data */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="card space-y-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Sensitive Data Detected
                    </h3>
                    <div className="text-3xl font-bold text-white">
                      {activeEntry.analysisResult.sensitive_entities_count}
                      <span className="text-base font-normal text-gray-400 ml-2">types</span>
                    </div>
                    {activeEntry.analysisResult.entity_types.length > 0 ? (
                      <div className="space-y-1.5">
                        {activeEntry.analysisResult.entity_types.map(et => (
                          <div key={et} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-gray-300">{et}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        No sensitive entities detected
                      </div>
                    )}
                  </div>

                  {/* Eval findings */}
                  {activeEntry.evaluation && (
                    <div className="card space-y-3">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Evaluation Findings
                      </h3>
                      {activeEntry.evaluation.findings.length > 0 ? (
                        <div className="space-y-2">
                          {activeEntry.evaluation.findings.map((f, i) => (
                            <div key={i} className="text-sm text-orange-300 flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          No critical findings
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Check scores */}
                {activeEntry.evaluation?.check_results && (
                  <div className="card space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        5-Step Check Scores
                      </h3>
                      <button
                        onClick={() => setExpandedChecks(v => !v)}
                        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                      >
                        {expandedChecks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedChecks ? 'Collapse' : 'Details'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {activeEntry.evaluation.check_results.map(cr => (
                        <div key={cr.check_name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              {cr.passed ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span className="text-gray-300">{checkLabel(cr.check_name)}</span>
                            </div>
                            <span className={`font-mono font-semibold ${cr.score >= 80 ? 'text-emerald-400' : cr.score >= 65 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {cr.score}/100
                            </span>
                          </div>
                          <ScoreBar score={cr.score} showValue={false} />
                          {expandedChecks && cr.findings.length > 0 && (
                            <div className="pl-5 space-y-0.5">
                              {cr.findings.map((f, i) => (
                                <div key={i} className="text-xs text-gray-500">· {f}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {activeEntry.evaluation?.recommendations && activeEntry.evaluation.recommendations.length > 0 && (
                  <div className="card space-y-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {activeEntry.evaluation.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-blue-400 font-bold">{i + 1}.</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<Eye className="w-8 h-8" />}
                title="No results yet"
                description="Upload and analyze a document to see results here."
              />
            )}
          </div>
        )}

        {/* ============ HISTORY TAB ============ */}
        {activeTab === 'history' && (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Analysis History</h2>
              {history.length > 0 && (
                <button onClick={handleClearHistory} className="btn-danger flex items-center gap-1.5 text-sm">
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <EmptyState
                icon={<RefreshCw className="w-8 h-8" />}
                title="No history yet"
                description="Analyzed documents will appear here."
              />
            ) : (
              <div className="space-y-3">
                {history.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => { setActiveEntry(entry); setActiveTab('results'); }}
                    className="w-full card-sm text-left hover:border-gray-600 hover:bg-gray-800/80 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-1.5 bg-gray-800 rounded-lg mt-0.5 group-hover:bg-gray-700">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-200 truncate">{entry.filename}</div>
                          {entry.question && (
                            <div className="text-xs text-gray-500 truncate">Q: {entry.question}</div>
                          )}
                          <div className="text-xs text-gray-600 mt-0.5">{timeAgo(entry.timestamp)}</div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        {entry.evaluation ? (
                          <>
                            <span className={`text-xs font-semibold ${
                              entry.evaluation.overall_score >= 85 ? 'text-emerald-400' :
                              entry.evaluation.overall_score >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {entry.evaluation.overall_score}/100
                            </span>
                            <RiskBadge risk={entry.evaluation.overall_risk} />
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">No eval</span>
                        )}
                        <span className={`text-xs ${entry.analysisResult.sensitive_entities_count > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                          {entry.analysisResult.sensitive_entities_count} PII types
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
