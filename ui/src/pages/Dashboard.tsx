import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  Activity, ShieldCheck, CheckCircle, AlertTriangle,
  TrendingUp, BarChart3, Clock, RefreshCw, Info,
} from "lucide-react";
import {
  fetchFromMongoDB,
  CATEGORY_LABELS, CHECK_LABELS,
} from "../services/testData";
import type { TestEntry, DatasetMeta } from "../services/testData";
import { MetricCard, RiskBadge, ScoreBar, Spinner, EmptyState } from "../components/ui";

const RISK_COLORS: Record<string, string> = {
  LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444", UNKNOWN: "#6b7280",
};
const CHECK_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

const catLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ");
const checkLabel = (name: string) => CHECK_LABELS[name] ?? name.replace(/_/g, " ");

type Tab = "overview" | "categories" | "checks" | "timeline";

export default function DashboardPage() {
  const [entries, setEntries] = useState<TestEntry[]>([]);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchFromMongoDB();
      const m: DatasetMeta = {
        filename: "MongoDB – instest.results",
        loadedAt: new Date().toISOString(),
        count: fetched.length,
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

  const total = entries.length;
  const passed = entries.filter(e => e.overall_score >= 70).length;
  const avgScore = total ? entries.reduce((s, e) => s + e.overall_score, 0) / total : 0;
  const totalFindings = entries.reduce((s, e) => s + e.findings.length, 0);

  const riskDist = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.overall_risk] = (acc[e.overall_risk] ?? 0) + 1;
    return acc;
  }, {});

  const catMap = entries.reduce<Record<string, number[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e.overall_score);
    return acc;
  }, {});

  const categoryData = Object.entries(catMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, scores]) => ({
      name: catLabel(cat)
        .replace("Out of Scope \u2013 ", "OOS \u2013 ")
        .replace("Sensitive Info \u2013 ", "SensInfo \u2013 "),
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
      count: scores.length,
    }));

  const checkMap: Record<string, number[]> = {};
  entries.forEach(e => e.check_results.forEach(cr => {
    (checkMap[cr.check_name] ??= []).push(cr.score);
  }));
  const checkAvgs = Object.entries(checkMap).map(([name, scores], i) => ({
    name: checkLabel(name),
    key: name,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
    fill: CHECK_COLORS[i % CHECK_COLORS.length],
    fullMark: 100,
  }));

  const histBuckets = [
    { range: "<70",   count: entries.filter(e => e.overall_score < 70).length },
    { range: "70-80", count: entries.filter(e => e.overall_score >= 70 && e.overall_score < 80).length },
    { range: "80-90", count: entries.filter(e => e.overall_score >= 80 && e.overall_score < 90).length },
    { range: "90-100", count: entries.filter(e => e.overall_score >= 90 && e.overall_score < 100).length },
    { range: "100",   count: entries.filter(e => e.overall_score === 100).length },
  ];

  const trendData = entries.map(e => ({ num: e.question_number, score: e.overall_score }));

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",   label: "Overview" },
    { id: "categories", label: "Category Performance" },
    { id: "checks",     label: "5-Step Checks" },
    { id: "timeline",   label: "Score Timeline" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-gray-400">
        <Spinner />
        <span>Loading evaluation data&hellip;</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">MongoDB Connection Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Make sure the MongoDB API server is running:<br />
            <code className="bg-gray-100 px-2 py-1 rounded">npm run dev:mongo</code>
          </p>
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-8 h-8" />}
        title="No evaluation data"
        description="Upload a selenium evaluation JSONL file using the sidebar button."
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-800 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">InsureMatrixAI Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            AI Agent Evaluation &middot; {total} test interactions &middot; 5-step evaluation pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          {meta && (
            <div className="text-right">
              <div className="text-xs text-gray-400">{meta.filename}</div>
              <div className="text-xs text-gray-600">
                Loaded {new Date(meta.loadedAt).toLocaleDateString()}
              </div>
            </div>
          )}
          <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-4 grid grid-cols-5 gap-4 border-b border-gray-800">
        <MetricCard label="Test Questions" value={total} subtext="evaluated" icon={<Activity className="w-4 h-4" />} />
        <MetricCard label="Average Score" value={`${avgScore.toFixed(1)}/100`} icon={<TrendingUp className="w-4 h-4" />} />
        <div className="card-sm flex flex-col gap-2">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Overall Risk
          </div>
          <RiskBadge risk={entries[entries.length - 1]?.overall_risk ?? "UNKNOWN"} />
          <div className="text-xs text-gray-500">latest entry</div>
        </div>
        <MetricCard
          label="Pass Rate"
          value={`${Math.round((passed / total) * 100)}%`}
          subtext={`${passed} / ${total} passed`}
          deltaPositive={passed / total >= 0.9}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <MetricCard
          label="Findings"
          value={totalFindings}
          subtext="issues detected"
          deltaPositive={totalFindings === 0}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      <div className="px-8 flex gap-2 border-b border-gray-800 pt-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 rounded-none border-b-2 px-1 text-sm transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">

        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={Object.entries(riskDist).map(([name, value]) => ({ name, value }))}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                  >
                    {Object.entries(riskDist).map(([name]) => (
                      <Cell key={name} fill={RISK_COLORS[name] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} itemStyle={{ color: "#f9fafb" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(riskDist).map(([risk, count]) => (
                  <div key={risk} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[risk] }} />
                    <span className="text-gray-400">{risk}</span>
                    <span className="ml-auto font-semibold text-white">{count}</span>
                    <span className="text-gray-600">({Math.round(count / total * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={histBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="range" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} itemStyle={{ color: "#f9fafb" }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} fill="#3b82f6" name="Questions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="col-span-2 grid grid-cols-4 gap-4">
              {[
                { label: "Avg Score", value: avgScore.toFixed(1), sub: "/ 100", color: avgScore >= 90 ? "text-emerald-400" : avgScore >= 75 ? "text-yellow-400" : "text-red-400" },
                { label: "Pass Rate", value: `${Math.round(passed/total*100)}%`, sub: `${passed} passed`, color: "text-blue-400" },
                { label: "Min Score", value: Math.min(...entries.map(e => e.overall_score)).toFixed(1), sub: "lowest", color: "text-orange-400" },
                { label: "Findings", value: String(totalFindings), sub: "total issues", color: totalFindings === 0 ? "text-emerald-400" : "text-red-400" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="card-sm text-center space-y-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Average Score by Test Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" domain={[85, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} width={190} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                    itemStyle={{ color: "#f9fafb" }}
                    formatter={(v) => [`${v}/100`, "Avg Score"]}
                  />
                  <Bar dataKey="avg" radius={[0,4,4,0]}>
                    {categoryData.map(entry => (
                      <Cell key={entry.name} fill={entry.avg >= 98 ? "#10b981" : entry.avg >= 95 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {categoryData.map(cat => (
                <div key={cat.name} className="card-sm space-y-3">
                  <div className="text-sm font-semibold text-gray-200 leading-tight">{cat.name}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${cat.avg >= 98 ? "text-emerald-400" : cat.avg >= 95 ? "text-yellow-400" : "text-red-400"}`}>
                      {cat.avg}
                    </span>
                    <span className="text-xs text-gray-500">/ 100 &middot; {cat.count} tests</span>
                  </div>
                  <ScoreBar score={cat.avg} showValue={false} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "checks" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Check Performance Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={checkAvgs}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Radar name="Avg Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} itemStyle={{ color: "#60a5fa" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="card space-y-5">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Average Scores per Check</h3>
              {checkAvgs.map((c, i) => (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{c.name}</span>
                    <span className="font-mono font-semibold" style={{ color: CHECK_COLORS[i % CHECK_COLORS.length] }}>
                      {c.score}/100
                    </span>
                  </div>
                  <ScoreBar score={c.score} showValue={false} />
                </div>
              ))}
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Scores are averaged across all {total} test interactions. Below 70 is a failed check.</span>
                </div>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-5 gap-3">
              {checkAvgs.map((c, i) => {
                const failing = entries.filter(e =>
                  e.check_results.some(cr => cr.check_name === c.key && !cr.passed)
                ).length;
                return (
                  <div key={c.name} className="card-sm space-y-3 text-center">
                    <div style={{ color: CHECK_COLORS[i % CHECK_COLORS.length] }} className="text-2xl font-bold">{c.score}</div>
                    <div className="text-xs text-gray-400 leading-tight">{c.name}</div>
                    <ScoreBar score={c.score} showValue={false} />
                    {failing > 0 && <div className="text-xs text-red-400">{failing} failed</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Score by Question Number
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="num" tick={{ fill: "#6b7280", fontSize: 11 }} label={{ value: "Question #", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 11 }} />
                  <YAxis domain={[85, 101]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                    itemStyle={{ color: "#60a5fa" }}
                    formatter={(v) => [`${v}/100`, "Score"]}
                    labelFormatter={(l) => `Q${l}`}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} name="Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Category Boundaries</h3>
              <div className="space-y-2">
                {Object.entries(catMap)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cat, scores]) => {
                    const indices = entries.filter(e => e.category === cat).map(e => e.question_number);
                    const qMin = Math.min(...indices);
                    const qMax = Math.max(...indices);
                    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
                    return (
                      <div key={cat} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500 w-12 text-right font-mono text-xs">Q{qMin}&ndash;{qMax}</span>
                        <span className="text-gray-300 flex-1">{catLabel(cat)}</span>
                        <span className={`font-semibold font-mono ${avg >= 98 ? "text-emerald-400" : avg >= 95 ? "text-yellow-400" : "text-red-400"}`}>{avg}</span>
                        <span className="text-gray-600 text-xs">{scores.length} tests</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
