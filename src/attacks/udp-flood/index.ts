import { runLoad } from '../../core/runner';
import { UdpFloodPayload, LoadReport } from '../../types';

/** UDP datagram load scenario. */
export default function udpFlood(payload: UdpFloodPayload): Promise<LoadReport> {
  return runLoad({
    workerFile: 'udp-load-worker.js',
    target: payload.host,
    threads: payload.threads,
    durationMs: payload.durationMs,
    concurrency: payload.concurrency,
    consent: payload.consent,
    label: 'UDP load',
    workerData: {
      port: payload.port,
      payloadBytes: payload.payloadBytes || 64,
    },
  });
}
