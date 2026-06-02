// Shared types for the load/resilience testing toolkit.

export interface SafetyCaps {
  maxThreads: number;
  maxDurationMs: number;
  maxConcurrencyPerThread: number;
}

export interface SafetyConfig {
  consent: boolean;
  allowlist: string[];
  caps: SafetyCaps;
}

export interface MetricsSnapshot {
  requests: number;
  errors: number;
  bytes: number;
  latencies: number[];
  statusCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

export interface LatencySummary {
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

export interface LoadReport {
  durationMs: number;
  requests: number;
  errors: number;
  successRate: number;
  requestsPerSecond: number;
  bytes: number;
  latencyMs: LatencySummary;
  statusCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

// Messages exchanged with workers across the thread boundary.
export type StopMessage = { type: 'stop' };
export type ReportMessage = { type: 'report'; snapshot: MetricsSnapshot };
export type WorkerMessage = StopMessage | ReportMessage;

// ---- Public scenario payloads ----

export interface BasePayload {
  threads: number;
  durationMs: number;
  concurrency?: number;
  consent?: boolean;
}

export interface HttpFloodPayload extends BasePayload {
  url: string;
  method?: string;
  cacheBust?: boolean;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
}

export interface SlowlorisPayload extends BasePayload {
  url: string;
  headerIntervalMs?: number;
  timeoutMs?: number;
}

export interface Http2RapidResetPayload extends BasePayload {
  url: string;
  path?: string | null;
}

export interface TcpFloodPayload extends BasePayload {
  host: string;
  port: number;
  payloadBytes?: number;
  timeoutMs?: number;
}

export interface UdpFloodPayload extends BasePayload {
  host: string;
  port: number;
  payloadBytes?: number;
}

export interface DnsFloodPayload extends BasePayload {
  host: string;
  recordType?: string;
}

// ---- Internal runner / worker plumbing ----

export interface RunLoadOptions {
  workerFile: string;
  target: string;
  threads: number;
  durationMs: number;
  concurrency?: number;
  consent?: boolean;
  label?: string;
  workerData?: Record<string, unknown>;
}

export interface BaseWorkerData {
  target: string;
  concurrency: number;
  workerId: number;
}

export interface HttpWorkerData extends BaseWorkerData {
  method: string;
  timeoutMs: number;
  cacheBust: boolean;
  headers: Record<string, string>;
  body: string | null;
}

export interface SlowlorisWorkerData extends BaseWorkerData {
  headerIntervalMs: number;
  timeoutMs: number;
}

export interface Http2WorkerData extends BaseWorkerData {
  path: string | null;
}

export interface TcpWorkerData extends BaseWorkerData {
  port: number;
  payloadBytes: number;
  timeoutMs: number;
}

export interface UdpWorkerData extends BaseWorkerData {
  port: number;
  payloadBytes: number;
}

export interface DnsWorkerData extends BaseWorkerData {
  recordType: string;
}
