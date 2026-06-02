import { LoadReport, MetricsSnapshot } from '../types';

/**
 * Lightweight metrics collector for load scenarios.
 *
 * Each worker keeps its own Metrics instance and reports a plain serializable
 * snapshot back to the main thread, which merges them with Metrics.merge().
 */
export default class Metrics {
  requests = 0;

  errors = 0;

  bytes = 0;

  latencies: number[] = [];

  statusCounts: Record<string, number> = {};

  errorCounts: Record<string, number> = {};

  recordSuccess(latencyMs: number, statusCode: string | number, bytes = 0): void {
    this.requests += 1;
    this.bytes += bytes;
    this.latencies.push(latencyMs);
    const key = String(statusCode);
    this.statusCounts[key] = (this.statusCounts[key] || 0) + 1;
  }

  recordError(errorMessage: string): void {
    this.requests += 1;
    this.errors += 1;
    const key = errorMessage || 'unknown';
    this.errorCounts[key] = (this.errorCounts[key] || 0) + 1;
  }

  // Serializable form sent across the worker boundary.
  toSnapshot(): MetricsSnapshot {
    return {
      requests: this.requests,
      errors: this.errors,
      bytes: this.bytes,
      latencies: this.latencies,
      statusCounts: this.statusCounts,
      errorCounts: this.errorCounts,
    };
  }

  static percentile(sortedLatencies: number[], p: number): number {
    if (sortedLatencies.length === 0) return 0;
    const index = Math.min(
      sortedLatencies.length - 1,
      Math.ceil((p / 100) * sortedLatencies.length) - 1,
    );
    return sortedLatencies[Math.max(0, index)];
  }

  // Merge an array of worker snapshots into a final report.
  static merge(snapshots: Array<MetricsSnapshot | undefined>, durationMs: number): LoadReport {
    const merged: MetricsSnapshot = {
      requests: 0,
      errors: 0,
      bytes: 0,
      latencies: [],
      statusCounts: {},
      errorCounts: {},
    };

    snapshots.forEach((snap) => {
      if (!snap) return;
      merged.requests += snap.requests || 0;
      merged.errors += snap.errors || 0;
      merged.bytes += snap.bytes || 0;
      merged.latencies.push(...(snap.latencies || []));
      Object.entries(snap.statusCounts || {}).forEach(([code, count]) => {
        merged.statusCounts[code] = (merged.statusCounts[code] || 0) + count;
      });
      Object.entries(snap.errorCounts || {}).forEach(([msg, count]) => {
        merged.errorCounts[msg] = (merged.errorCounts[msg] || 0) + count;
      });
    });

    const sorted = merged.latencies.sort((a, b) => a - b);
    const seconds = durationMs / 1000;

    return {
      durationMs,
      requests: merged.requests,
      errors: merged.errors,
      successRate: merged.requests
        ? Number((((merged.requests - merged.errors) / merged.requests) * 100).toFixed(2))
        : 0,
      requestsPerSecond: seconds ? Number((merged.requests / seconds).toFixed(2)) : 0,
      bytes: merged.bytes,
      latencyMs: {
        min: sorted.length ? sorted[0] : 0,
        p50: Metrics.percentile(sorted, 50),
        p95: Metrics.percentile(sorted, 95),
        p99: Metrics.percentile(sorted, 99),
        max: sorted.length ? sorted[sorted.length - 1] : 0,
      },
      statusCounts: merged.statusCounts,
      errorCounts: merged.errorCounts,
    };
  }

  // Pretty console report.
  static printReport(report: LoadReport, label = 'Load test'): void {
    /* eslint-disable no-console */
    console.log(`\n=== ${label} report ===`);
    console.log(`Duration         : ${report.durationMs} ms`);
    console.log(`Requests         : ${report.requests}`);
    console.log(`Errors           : ${report.errors}`);
    console.log(`Success rate     : ${report.successRate} %`);
    console.log(`Throughput       : ${report.requestsPerSecond} req/s`);
    console.log(
      `Latency (ms)     : min=${report.latencyMs.min} p50=${report.latencyMs.p50} `
      + `p95=${report.latencyMs.p95} p99=${report.latencyMs.p99} max=${report.latencyMs.max}`,
    );
    if (Object.keys(report.statusCounts).length) {
      console.log(`Status codes     : ${JSON.stringify(report.statusCounts)}`);
    }
    if (Object.keys(report.errorCounts).length) {
      console.log(`Errors           : ${JSON.stringify(report.errorCounts)}`);
    }
    console.log('========================\n');
    /* eslint-enable no-console */
  }
}
