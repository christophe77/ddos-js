import attacks from './index';
import { LoadReport } from './types';

// IMPORTANT: only point this at infrastructure you own and are authorised to
// test. Targets are validated against config/safety.json and require consent.
const url = 'http://localhost:8080/';
const host = 'localhost';

// Consent for this run. You can also set "consent": true in config/safety.json
// or export LOADTEST_CONSENT=true instead of passing it here.
const consent = true;

const scenario = process.argv[2] || 'http';

function run(type: string): Promise<LoadReport> {
  switch (type) {
    case 'http':
      return attacks.httpFlood({
        url, threads: 4, concurrency: 25, durationMs: 5000, cacheBust: true, consent,
      });

    case 'slowloris':
      return attacks.slowloris({
        url, threads: 2, concurrency: 50, durationMs: 5000, consent,
      });

    case 'h2reset':
      return attacks.http2RapidReset({
        url: 'https://localhost:8443/', threads: 2, concurrency: 4, durationMs: 5000, consent,
      });

    case 'tcp':
      return attacks.tcpFlood({
        host, port: 8080, threads: 4, concurrency: 20, durationMs: 5000, consent,
      });

    case 'udp':
      return attacks.udpFlood({
        host, port: 8080, threads: 4, concurrency: 20, durationMs: 5000, consent,
      });

    case 'dns':
      return attacks.dnsFlood({
        host, threads: 4, concurrency: 10, durationMs: 5000, recordType: 'lookup', consent,
      });

    default:
      return Promise.reject(
        new Error(
          `Unknown scenario "${type}". Try: http | slowloris | h2reset | tcp | udp | dns`,
        ),
      );
  }
}

run(scenario).catch((error: Error) => {
  // eslint-disable-next-line no-console
  console.error(`[${scenario}] error:`, error.message);
  process.exitCode = 1;
});
