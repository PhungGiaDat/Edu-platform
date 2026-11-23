// frontend-web/src/services/monitoringApi.ts
/**
 * Ops Monitoring Dashboard API client (dev-facing, teacher-auth).
 *
 * Mirrors backend/api/admin_monitoring.py P1 contracts exactly:
 *   GET  /api/v1/admin/monitoring/overview
 *   POST /api/v1/admin/monitoring/probe
 *   GET  /api/v1/admin/monitoring/rag/stats?hours=
 *   GET  /api/v1/admin/monitoring/rag/traces?...
 *   GET  /api/v1/admin/monitoring/rag/traces/{id}
 */
import { apiClient } from './apiClient';

const MON_BASE_URL = '/api/v1/admin/monitoring';

// ────────────────────────────── overview ──────────────────────────────

export interface ComponentStatus {
  /** true = up, false = down, null = not configured / unknown */
  up: boolean | null;
  latency_ms: number | null;
  note: string | null;
}

export interface AppInfo {
  name?: string;
  environment?: string;
  started_at?: string;
  uptime_s?: number;
}

export interface ProcessInfo {
  source?: string; // "psutil" | "unavailable"
  uptime_s?: number;
  rss_mb?: number;
  cpu_pct_since_last_call?: number;
  threads?: number;
  cgroup?: {
    used_mb: number;
    limit_mb: number;
    mem_pct: number;
    runtime_source: string;
  };
  error?: string;
}

export interface HostInfo {
  source?: string; // "host" | "unavailable" | "error"
  mem_total_mb?: number;
  mem_used_mb?: number;
  mem_pct?: number;
  cpu_count?: number;
  load_avg_1m?: number;
  error?: string;
}

export interface LlmProviderStatus {
  provider?: string;
  status?: string; // "healthy" | "unhealthy" | "idle" | "probe_failed" | ...
  latency_ms?: number | null;
  preferred?: boolean;
  consecutive_failures?: number;
  default_model?: string;
  fresh?: boolean;
  note?: string;
}

export interface RagWindowSummary {
  available: boolean;
  note?: string;
  window_hours?: number;
  total?: number;
  cache_hits?: number;
  cache_hit_rate?: number | null;
  errors?: number;
  error_rate?: number | null;
  refusals?: number;
  refusal_rate?: number | null;
  fallbacks?: number;
  tokens_total?: number;
  e2e_p50_ms?: number | null;
  e2e_p95_ms?: number | null;
}

export interface MonitoringFlags {
  enabled?: boolean;
  store_questions?: boolean;
  retention_days?: number;
  api_metrics?: boolean;
}

export interface OverviewResponse {
  status: 'ok' | 'degraded' | 'error' | string;
  as_of: string;
  app: AppInfo;
  process: ProcessInfo;
  host: HostInfo;
  components: Record<string, ComponentStatus>;
  llm: LlmProviderStatus[];
  rag_24h: RagWindowSummary;
  monitoring: MonitoringFlags;
}

// ────────────────────────────── rag stats ──────────────────────────────

export interface ModelStat {
  model: string;
  n: number;
  p50_ms: number | null;
  p95_ms: number | null;
  max_ms: number | null;
  tokens: number;
  tokens_avg: number | null;
  tok_per_sec: number | null;
  error_rate: number;
  fallback_rate: number;
}

export interface TimelineBucket {
  bucket: string; // ISO
  n: number;
  p50_ms: number | null;
  p95_ms: number | null;
}

export interface RagTotals {
  total: number;
  llm_calls: number;
  cache_hits: number;
  errors: number;
  refusals: number;
  fallbacks: number;
  avg_ms: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  max_ms: number | null;
}

export interface RagStatsResponse {
  window_hours: number;
  as_of: string;
  totals: RagTotals;
  by_model: ModelStat[];
  /** keys: planner_p50 | planner_p95 | retrieval_p50 | ... (ms) */
  stages: Record<string, number | null>;
  verdicts: Record<string, number>;
  timeline: TimelineBucket[];
}

// ────────────────────────────── traces ──────────────────────────────

export interface TraceListItem {
  id: number;
  created_at: string;
  session_id: string;
  language: string | null;
  model_requested: string | null;
  model_used: string | null;
  fallback: boolean;
  cache_hit: boolean;
  total_ms: number | null;
  stage_planner_ms: number | null;
  stage_retrieval_ms: number | null;
  stage_generator_ms: number | null;
  stage_validator_ms: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  sources_count: number | null;
  validator_verdict: string | null;
  refusal: boolean;
  has_error: boolean;
  error: string | null;
  question_preview: string | null;
}

export interface TraceListParams {
  hours?: number;
  limit?: number;
  offset?: number;
  only_errors?: boolean;
  only_refusals?: boolean;
  model?: string;
  language?: string;
}

export interface TraceListResponse {
  total: number;
  limit: number;
  offset: number;
  items: TraceListItem[];
}

export interface TraceDetail {
  id: number;
  request_id: string;
  created_at: string;
  user_hash: string | null;
  session_id: string;
  language: string | null;
  question: string | null;
  model_requested: string | null;
  model_used: string | null;
  fallback: boolean;
  cache_hit: boolean;
  stage_planner_ms: number | null;
  stage_retrieval_ms: number | null;
  stage_generator_ms: number | null;
  stage_validator_ms: number | null;
  total_ms: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  token_calls: number | null;
  tokens_by_model: Record<string, { p: number; c: number }> | null;
  sources_count: number | null;
  source_ids: string[] | null;
  validator_verdict: string | null;
  refusal: boolean;
  error: string | null;
  trace_segments: string[] | null;
}

// ────────────────────────────── endpoints ──────────────────────────────

const cleanParams = (params: TraceListParams): Record<string, string | number | boolean | undefined> => ({
  hours: params.hours,
  limit: params.limit,
  offset: params.offset,
  only_errors: params.only_errors || undefined,
  only_refusals: params.only_refusals || undefined,
  model: params.model || undefined,
  language: params.language || undefined,
});

export const monitoringApi = {
  /** Component health + process/host + 24h RAG summary (cheap LLM snapshot). */
  async getOverview(): Promise<OverviewResponse> {
    const response = await apiClient.get(`${MON_BASE_URL}/overview`);
    return response as OverviewResponse;
  },

  /** Same as overview but forces fresh LLM provider pings (slower, on-demand). */
  async probe(): Promise<OverviewResponse> {
    const response = await apiClient.post(`${MON_BASE_URL}/probe`);
    return response as OverviewResponse;
  },

  async getRagStats(hours = 24): Promise<RagStatsResponse> {
    const response = await apiClient.get(`${MON_BASE_URL}/rag/stats`, {
      params: { hours },
    });
    return response as RagStatsResponse;
  },

  async listTraces(params: TraceListParams = {}): Promise<TraceListResponse> {
    const response = await apiClient.get(`${MON_BASE_URL}/rag/traces`, {
      params: cleanParams(params),
    });
    return response as TraceListResponse;
  },

  async getTrace(traceId: number): Promise<TraceDetail> {
    const response = await apiClient.get(`${MON_BASE_URL}/rag/traces/${traceId}`);
    return response as TraceDetail;
  },
};
