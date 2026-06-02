import { runLoad } from '../../core/runner';
import { Http2RapidResetPayload, LoadReport } from '../../types';

/**
 * HTTP/2 Rapid Reset scenario (CVE-2023-44487).
 *
 * Opens HTTP/2 streams and immediately cancels them (RST_STREAM) in a loop to
 * verify your own server/proxy caps concurrent and reset streams. The report's
 * "requests" count = streams opened-then-reset.
 */
export default function http2RapidReset(payload: Http2RapidResetPayload): Promise<LoadReport> {
  return runLoad({
    workerFile: 'http2-rapid-reset-worker.js',
    target: payload.url,
    threads: payload.threads,
    durationMs: payload.durationMs,
    concurrency: payload.concurrency,
    consent: payload.consent,
    label: 'HTTP/2 Rapid Reset',
    workerData: {
      path: payload.path || null,
    },
  });
}
