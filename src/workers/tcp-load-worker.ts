import net from 'net';
import crypto from 'crypto';
import { workerData, parentPort } from 'worker_threads';
import Metrics from '../core/metrics';
import { TcpWorkerData, ReportMessage, WorkerMessage } from '../types';

if (!parentPort) throw new Error('tcp-load-worker must run as a worker thread');
const port = parentPort;

const data = workerData as TcpWorkerData;
const {
  target, port: targetPort, concurrency, timeoutMs, payloadBytes,
} = data;

const host = target;
const metrics = new Metrics();
let running = true;
let activeLoops = 0;

function fireOnce(): Promise<void> {
  return new Promise<void>((resolve) => {
    const start = process.hrtime.bigint();
    let settled = false;
    const socket = net.connect({ host, port: targetPort });
    socket.setTimeout(timeoutMs);

    const done = (ok: boolean, reason?: string): void => {
      if (settled) return;
      settled = true;
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      if (ok) metrics.recordSuccess(ms, 'connected', payloadBytes);
      else metrics.recordError(reason ?? 'error');
      if (!socket.destroyed) socket.destroy();
      resolve();
    };

    socket.on('connect', () => {
      socket.write(crypto.randomBytes(payloadBytes));
      done(true);
    });
    socket.on('timeout', () => done(false, 'timeout'));
    socket.on('error', (err: NodeJS.ErrnoException) => done(false, err.code || err.message));
  });
}

async function loop(): Promise<void> {
  activeLoops += 1;
  while (running) {
    // eslint-disable-next-line no-await-in-loop
    await fireOnce();
  }
  activeLoops -= 1;
  if (activeLoops === 0) {
    const msg: ReportMessage = { type: 'report', snapshot: metrics.toSnapshot() };
    port.postMessage(msg);
  }
}

port.on('message', (msg: WorkerMessage) => {
  if (msg && msg.type === 'stop') running = false;
});

for (let i = 0; i < concurrency; i += 1) {
  void loop();
}
