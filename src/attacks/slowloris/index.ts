import { runLoad } from '../../core/runner';
import { SlowlorisPayload, LoadReport } from '../../types';

/**
 * Slowloris (slow-headers) scenario.
 *
 * Holds many half-open HTTP connections to probe how your own server copes
 * with slow clients (header read timeouts, max concurrent connections).
 */
export default function slowloris(payload: SlowlorisPayload): Promise<LoadReport> {
  return runLoad({
    workerFile: 'slowloris-worker.js',
    target: payload.url,
    threads: payload.threads,
    durationMs: payload.durationMs,
    concurrency: payload.concurrency,
    consent: payload.consent,
    label: 'Slowloris (slow headers)',
    workerData: {
      headerIntervalMs: payload.headerIntervalMs || 10000,
      timeoutMs: payload.timeoutMs || 5000,
    },
  });
}
