import type { EvaluationResult } from './api';

export interface HistoryEntry {
  id: string;
  filename: string;
  question?: string;
  analysisResult: {
    success: boolean;
    summary: string;
    sensitive_entities_count: number;
    entity_types: string[];
    execution_time_ms: number;
    error?: string;
  };
  evaluation?: EvaluationResult;
  timestamp: string;
}

// In-memory storage - no persistence across page reloads
let memoryHistory: HistoryEntry[] = [];

export const saveHistory = (entry: HistoryEntry): void => {
  memoryHistory.unshift(entry);
  // Keep last 100
  memoryHistory = memoryHistory.slice(0, 100);
};

export const loadHistory = (): HistoryEntry[] => {
  return memoryHistory;
};

export const clearHistory = (): void => {
  memoryHistory = [];
};

export const generateId = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);
