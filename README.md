# ddos-js — load & resilience testing toolkit

> **Authorised testing only.** This tool exists to load/stress-test
> infrastructure **you own** (local apps, staging environments) and to learn how
> denial-of-service conditions arise so you can defend against them. Running it
> against systems you do not own or have explicit written permission to test is
> illegal in most jurisdictions. By using it you accept full responsibility.

Written in **TypeScript**. Build with `npm run build` (outputs `dist/`), or run
sources directly during development with `npm run dev`.

## Safety model

Every load scenario goes through `src/core/safety.ts` before doing anything:

1. **Consent** — required via one of:
   - `"consent": true` in `config/safety.json`,
   - `{ consent: true }` in the scenario payload,
   - `LOADTEST_CONSENT=true` environment variable.
2. **Allowlist** — the target host must match `config/safety.json` `allowlist`
   (defaults: `localhost`, `127.0.0.1`, `::1`, `*.test`, `*.local`,
   `*.localhost`). Patterns support `*` wildcards.
3. **Caps** — `maxThreads`, `maxDurationMs`, `maxConcurrencyPerThread` clamp
   every run so it cannot escalate beyond what you configured.

Edit `config/safety.json` to register your own staging hosts and limits.

## Architecture

```
config/safety.json     # allowlist, consent, caps (read at runtime, not compiled)
src/
  types.ts             # payloads, worker messages, report & caps types
  core/
    safety.ts          # guard: consent + allowlist + clamp params
    metrics.ts         # RPS, latency p50/p95/p99, status & error counts
    runner.ts          # pooled, long-lived workers + report aggregation
  attacks/<name>/      # scenario orchestrators (thin wrappers over runner)
  workers/<name>.ts    # the actual per-worker load loop
  index.ts             # public API (attacks + helpers + types)
dist/                  # compiled output (tsc) — what gets published/run
```

The engine spawns a **fixed pool of long-lived workers** that loop internally
for the whole duration (instead of one worker per request), so reports reflect
real server capacity rather than worker-spawn overhead. Every scenario is a
thin wrapper over `runLoad` (`src/core/runner.ts`), goes through the safety
guard, and returns the same typed `LoadReport`.

## Scenarios

| Scenario          | What it tests                                              |
| ----------------- | --------------------------------------------------------- |
| `httpFlood`       | L7 throughput, latency, status codes (optional cache-bust) |
| `slowloris`       | Slow-headers / half-open connection handling               |
| `http2RapidReset` | HTTP/2 stream reset flood mitigation (CVE-2023-44487)      |
| `tcpFlood`        | Raw TCP connection load                                    |
| `udpFlood`        | UDP datagram load                                          |
| `dnsFlood`        | DNS resolution load                                        |

## Install

Not published to npm by design. Install directly from GitHub — the `prepare`
hook compiles TypeScript to `dist/` automatically on install:

```bash
# latest on the default branch
npm install github:christophe77/ddos-js

# pin to a released tag (reproducible)
npm install github:christophe77/ddos-js#v2.0.0
```

## Scripts

```bash
npm run build      # compile src/ -> dist/ (also runs on install via "prepare")
npm run typecheck  # tsc --noEmit
npm run dev        # run src/example.ts directly via ts-node
npm run example    # run the compiled dist/example.js
```

## Usage

After building, run a scenario via the CLI example (first arg = scenario name):

```bash
# HTTP load test against a local app on :8080
LOADTEST_CONSENT=true node dist/example.js http

# Slow-headers (slowloris) resilience test
LOADTEST_CONSENT=true node dist/example.js slowloris

# HTTP/2 Rapid Reset (needs an HTTP/2 endpoint, e.g. https://localhost:8443)
LOADTEST_CONSENT=true node dist/example.js h2reset

# Transport-level scenarios
LOADTEST_CONSENT=true node dist/example.js tcp
LOADTEST_CONSENT=true node dist/example.js udp
LOADTEST_CONSENT=true node dist/example.js dns
```

All scenarios share a common payload shape: `threads` (pooled workers),
`concurrency` (in-flight work per worker), `durationMs`, and `consent`.

Programmatic (typed):

```ts
import attacks, { LoadReport } from 'ddos-js';

const report: LoadReport = await attacks.httpFlood({
  url: 'http://localhost:8080/',
  threads: 4,
  concurrency: 25,
  durationMs: 5000,
  cacheBust: true,
  consent: true,
});
// report.requestsPerSecond, report.latencyMs.p99, report.statusCounts, ...
```

## Ideas / roadmap

Further modern L7 scenarios you can add on top of `runLoad`:
HTTP/2 CONTINUATION flood, slow POST / slow read, keep-alive connection
exhaustion, WebSocket connection flood, and GraphQL query-complexity probing.
