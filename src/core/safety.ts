import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { SafetyCaps, SafetyConfig } from '../types';

// config/ lives at the project root, two levels above this file in both
// src/core (dev) and dist/core (built) layouts.
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'safety.json');

const DEFAULT_CONFIG: SafetyConfig = {
  consent: false,
  allowlist: ['localhost', '127.0.0.1', '::1', '*.test', '*.local', '*.localhost'],
  caps: { maxThreads: 50, maxDurationMs: 60000, maxConcurrencyPerThread: 200 },
};

export function loadConfig(): SafetyConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<SafetyConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Extract a hostname from either a full URL or a bare host string.
export function extractHost(target: string): string {
  if (!target || typeof target !== 'string') {
    throw new Error('A target (url or host) is required.');
  }
  try {
    return new URL(target).hostname;
  } catch {
    // Not a full URL: assume it is already a bare host (optionally host:port).
    return target.split(':')[0];
  }
}

// Turn an allowlist pattern such as "*.test" into an anchored RegExp.
function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

export function isHostAllowed(host: string, allowlist: string[]): boolean {
  return allowlist.some((pattern) => patternToRegExp(pattern).test(host));
}

function hasConsent(config: SafetyConfig, explicitConsent?: boolean): boolean {
  return Boolean(config.consent)
    || explicitConsent === true
    || process.env.LOADTEST_CONSENT === 'true';
}

/**
 * Guard executed before any load scenario starts. Enforces explicit consent
 * and the target allowlist, then returns the safety caps for clamping.
 */
export function assertTargetAllowed(
  target: string,
  options: { consent?: boolean } = {},
): SafetyCaps {
  const config = loadConfig();

  if (!hasConsent(config, options.consent)) {
    throw new Error(
      'Consent required. Only run this against systems you own. '
      + 'Set "consent": true in config/safety.json, pass { consent: true }, '
      + 'or export LOADTEST_CONSENT=true.',
    );
  }

  const host = extractHost(target);
  if (!isHostAllowed(host, config.allowlist)) {
    throw new Error(
      `Target host "${host}" is not in the allowlist. `
      + `Add it to config/safety.json (current: ${config.allowlist.join(', ')}).`,
    );
  }

  return config.caps;
}

export interface ClampedParams {
  threads: number;
  durationMs: number;
  concurrency: number;
}

// Clamp user-supplied parameters to the configured safety caps.
export function clampParams(
  params: { threads?: number; durationMs?: number; concurrency?: number },
  caps: SafetyCaps,
): ClampedParams {
  return {
    threads: Math.min(Math.max(1, params.threads || 1), caps.maxThreads),
    durationMs: Math.min(Math.max(1, params.durationMs || 1000), caps.maxDurationMs),
    concurrency: Math.min(
      Math.max(1, params.concurrency || 1),
      caps.maxConcurrencyPerThread,
    ),
  };
}
