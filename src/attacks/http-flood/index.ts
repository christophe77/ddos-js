import { runLoad } from '../../core/runner';
import { HttpFloodPayload, LoadReport } from '../../types';

/**
 * HTTP load scenario (formerly "http flood").
 *
 * Drives a pool of workers, each keeping `concurrency` keep-alive requests in
 * flight against your own endpoint for `durationMs`, then returns a metrics
 * report (RPS, latency percentiles, status codes).
 */
export default function httpFlood(payload: HttpFloodPayload): Promise<LoadReport> {
  return runLoad({
    workerFile: 'http-load-worker.js',
    target: payload.url,
    threads: payload.threads,
    durationMs: payload.durationMs,
    concurrency: payload.concurrency,
    consent: payload.consent,
    label: 'HTTP load',
    workerData: {
      method: payload.method || 'GET',
      cacheBust: Boolean(payload.cacheBust),
      headers: payload.headers || {},
      body: payload.body || null,
      timeoutMs: payload.timeoutMs || 5000,
    },
  });
}
