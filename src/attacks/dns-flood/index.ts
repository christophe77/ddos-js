import { runLoad } from '../../core/runner';
import { DnsFloodPayload, LoadReport } from '../../types';

/** DNS resolution load scenario. */
export default function dnsFlood(payload: DnsFloodPayload): Promise<LoadReport> {
  return runLoad({
    workerFile: 'dns-load-worker.js',
    target: payload.host,
    threads: payload.threads,
    durationMs: payload.durationMs,
    concurrency: payload.concurrency,
    consent: payload.consent,
    label: 'DNS load',
    workerData: {
      recordType: payload.recordType || 'A',
    },
  });
}
