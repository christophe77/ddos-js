import dgram from 'dgram';
import crypto from 'crypto';
import { workerData, parentPort } from 'worker_threads';
import Metrics from '../core/metrics';
import { UdpWorkerData, ReportMessage, WorkerMessage } from '../types';

if (!parentPort) throw new Error('udp-load-worker must run as a worker thread');
const port = parentPort;

const data = workerData as UdpWorkerData;
const {
  target, port: targetPort, concurrency, payloadBytes,
} = data;

const host = target;
const metrics = new Metrics();
const socket = dgram.createSocket('udp4');
let running = true;
let activeLoops = 0;

function fireOnce(): Promise<void> {
  return new Promise<void>((resolve) => {
    const start = process.hrtime.bigint();
    const buf = crypto.randomBytes(payloadBytes);
    socket.send(buf, targetPort, host, (err) => {
      if (err) metrics.recordError(err.message);
      else {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        metrics.recordSuccess(ms, 'sent', payloadBytes);
      }
      resolve();
    });
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
    socket.close();
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
