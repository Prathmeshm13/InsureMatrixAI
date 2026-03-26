import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// ---- Types ----

export interface CheckResult {
  check_name: string;
  score: number;
  passed: boolean;
  findings: string[];
  recommendations: string[];
}

export interface EvaluationResult {
  overall_score: number;
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  check_results: CheckResult[];
  findings: string[];
  recommendations: string[];
  document_type?: string;
  timestamp?: string;
}

export interface AnalysisResult {
  success: boolean;
  summary: string;
  sensitive_entities_count: number;
  entity_types: string[];
  execution_time_ms: number;
  error?: string;
}

export interface LogEntry {
  agent_id: string;
  event_type: string;
  timestamp: string;
  payload: EvaluationResult;
}

export interface DashboardSummary {
  agent_id: string;
  time_range: string;
  current_health_score: number;
  health_trend: string;
  total_evaluations: number;
  evaluations_passed: number;
  evaluations_failed: number;
  total_findings: number;
  findings_by_severity: Record<string, number>;
  active_alerts: number;
  new_alerts_24h: number;
  check_scores: Record<string, number>;
  check_trends: Record<string, string>;
  risk_distribution: Record<string, number>;
}

// ---- Health ----
export const checkHealth = () => api.get('/health').then(r => r.data);

// ---- Dashboard ----
export const getDashboard = (agentId: string, timeRange = '24h') =>
  api.get<DashboardSummary>(`/api/v1/agents/${agentId}/dashboard`, {
    params: { time_range: timeRange },
  }).then(r => r.data);

export const getEvaluations = (agentId: string, page = 1, pageSize = 50) =>
  api.get(`/api/v1/agents/${agentId}/evaluations`, {
    params: { page, page_size: pageSize },
  }).then(r => r.data);

export const getFindings = (agentId: string, severity?: string) =>
  api.get(`/api/v1/agents/${agentId}/findings`, {
    params: { severity },
  }).then(r => r.data);

// ---- Logs (local) ----
// Reads the agent_logs.jsonl file from backend – we expose via a custom endpoint or mock here
export const getLogs = async (): Promise<LogEntry[]> => {
  try {
    const r = await api.get<LogEntry[]>('/api/v1/logs');
    return r.data;
  } catch {
    return [];
  }
};

// ---- Submit log ----
export const submitLog = (payload: Record<string, unknown>) =>
  api.post('/api/v1/logs', payload).then(r => r.data);
