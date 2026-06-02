import dns from 'dns';
import { workerData, parentPort } from 'worker_threads';
import Metrics from '../core/metrics';
import { DnsWorkerData, ReportMessage, WorkerMessage } from '../types';

if (!parentPort) throw new Error('dns-load-worker must run as a worker thread');
const port = parentPort;

const data = workerData as DnsWorkerData;
const { target, concurrency, recordType } = data;

const host = target;
const metrics = new Metrics();
let running = true;
let activeLoops = 0;

const resolve = recordType === 'lookup'
  ? (name: string): Promise<unknown> => dns.promises.lookup(name)
  : (name: string): Promise<unknown> => dns.promises.resolve(name, recordType);

async function fireOnce(): Promise<void> {
  const start = process.hrtime.bigint();
  try {
    await resolve(host);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    metrics.recordSuccess(ms, recordType);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    metrics.recordError(e.code || e.message);
  }
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
