import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import Metrics from '../core/metrics';
import utils from '../utils';
import { HttpWorkerData, ReportMessage, WorkerMessage } from '../types';

if (!parentPort) throw new Error('http-load-worker must run as a worker thread');
const port = parentPort;

const data = workerData as HttpWorkerData;
const {
  target,
  method,
  concurrency,
  timeoutMs,
  cacheBust,
  headers,
  body,
} = data;

const baseUrl = new URL(target);
const agentLib = baseUrl.protocol === 'https:' ? https : http;

// Reuse sockets so we measure server capacity, not connection setup churn.
const agent = new agentLib.Agent({ keepAlive: true, maxSockets: concurrency });

const metrics = new Metrics();
let running = true;
let activeLoops = 0;

function buildUrl(): URL {
  if (!cacheBust) return baseUrl;
  // Append a unique query param to defeat caches/CDNs and hit the origin.
  const url = new URL(baseUrl.toString());
  url.searchParams.set('_cb', crypto.randomBytes(8).toString('hex'));
  return url;
}

function fireOnce(): Promise<void> {
  return new Promise<void>((resolve) => {
    const url = buildUrl();
    const start = process.hrtime.bigint();
    const options: https.RequestOptions = {
      method,
      agent,
      timeout: timeoutMs,
      headers: { 'User-Agent': utils.randomUserAgent, ...headers },
    };

    const req = agentLib.request(url, options, (res) => {
      let bytes = 0;
      res.on('data', (chunk: Buffer) => { bytes += chunk.length; });
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        metrics.recordSuccess(ms, res.statusCode ?? 0, bytes);
        resolve();
      });
    });

    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (err: Error) => {
      metrics.recordError(err.message);
      resolve();
    });

    if (body) req.write(body);
    req.end();
  });
}

// One closed-loop driver: keeps a single request in flight, then immediately
// starts the next, until asked to stop.
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
