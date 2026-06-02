import path from 'path';
import { Worker } from 'worker_threads';
import Metrics from './metrics';
import { assertTargetAllowed, clampParams } from './safety';
import {
  LoadReport, MetricsSnapshot, RunLoadOptions, WorkerMessage,
} from '../types';

/**
 * Generic load runner.
 *
 * Spawns a fixed pool of long-lived workers that loop internally for the whole
 * test `durationMs`, then are asked to stop and report a metrics snapshot. The
 * snapshots are merged into a single report.
 */
export function runLoad(opts: RunLoadOptions): Promise<LoadReport> {
  return new Promise<LoadReport>((resolve, reject) => {
    // Validate inside the promise so safety violations reject (rather than
    // throw synchronously and bypass the caller's .catch()).
    let threads: number;
    let durationMs: number;
    let concurrency: number;
    try {
      const caps = assertTargetAllowed(opts.target, { consent: opts.consent });
      ({ threads, durationMs, concurrency } = clampParams(opts, caps));
    } catch (err) {
      reject(err as Error);
      return;
    }

    const workerPath = path.join(__dirname, '..', 'workers', opts.workerFile);
    const startedAt = Date.now();
    const workers: Worker[] = [];
    const snapshots: MetricsSnapshot[] = [];
    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      const report = Metrics.merge(snapshots, Date.now() - startedAt);
      Metrics.printReport(report, opts.label || opts.workerFile);
      resolve(report);
    };

    const onMessage = (worker: Worker, msg: WorkerMessage): void => {
      if (msg && msg.type === 'report') {
        snapshots.push(msg.snapshot);
        worker.terminate();
        if (snapshots.length === workers.length) finish();
      }
    };

    const onError = (err: Error): void => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const spawnWorker = (workerId: number): void => {
      const worker = new Worker(workerPath, {
        workerData: {
          ...opts.workerData,
          target: opts.target,
          concurrency,
          workerId,
        },
      });
      worker.on('message', (msg: WorkerMessage) => onMessage(worker, msg));
      worker.on('error', onError);
      workers.push(worker);
    };

    for (let i = 0; i < threads; i += 1) {
      spawnWorker(i);
    }

    // Tell every worker to stop, then give them a grace window to drain
    // in-flight work and report before we force completion.
    setTimeout(() => {
      const stop: WorkerMessage = { type: 'stop' };
      workers.forEach((w) => w.postMessage(stop));
      setTimeout(finish, 2000);
    }, durationMs);
  });
}
