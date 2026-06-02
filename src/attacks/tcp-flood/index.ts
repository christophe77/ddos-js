import { runLoad } from '../../core/runner';
import { TcpFloodPayload, LoadReport } from '../../types';

/** TCP connection load scenario. */
export default function tcpFlood(payload: TcpFloodPayload): Promise<LoadReport> {
  return runLoad({
    workerFile: 'tcp-load-worker.js',
    target: payload.host,
    threads: payload.threads,
    durationMs: payload.durationMs,
    concurrency: payload.concurrency,
    consent: payload.consent,
    label: 'TCP load',
    workerData: {
      port: payload.port,
      payloadBytes: payload.payloadBytes || 64,
      timeoutMs: payload.timeoutMs || 5000,
    },
  });
}
