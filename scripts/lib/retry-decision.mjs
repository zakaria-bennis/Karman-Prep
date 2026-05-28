// ============================================================
// retry-decision — pure helper that decides whether a sub-process
// failure was transient (worth retrying) or terminal (give up).
//
// Lives in its own module so vitest can exercise the decision
// logic without spawning real child processes.
//
// "Transient" patterns we'll retry on:
//   · Network: "fetch failed", "ECONNRESET", "ETIMEDOUT",
//     "socket hang up", "connection reset", "EAI_AGAIN"
//   · Upstream 5xx: "HTTP 502", "HTTP 503", "HTTP 504"
//   · Provider-specific transient: "UNAVAILABLE", "Service Unavailable"
//
// "Terminal" patterns we'll NOT retry on (even if exit was non-zero):
//   · Quota: "quota", "credit", "balance"  (would just burn more)
//   · Auth: "401", "403", "Unauthorized", "Forbidden"
//   · Logic: "PDF too large", "schema validation failed", "ENOENT"
//   · Missing env: "API key not set", "MISSING ENV"
//
// When neither pattern matches: defaults to NO retry (conservative
// — better to surface unknown errors than waste compute on a real
// bug looking like a network issue).
// ============================================================

export const TRANSIENT_PATTERNS = [
  /fetch failed/i,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /socket hang up/i,
  /connection reset/i,
  /EAI_AGAIN/,
  /HTTP 502/,
  /HTTP 503/,
  /HTTP 504/,
  /\bUNAVAILABLE\b/,
  /Service Unavailable/i,
  /Bad Gateway/i,
  /Gateway Timeout/i,
  /\bENOTFOUND\b/, // DNS hiccup
  /AbortError/,
];

export const TERMINAL_PATTERNS = [
  /\bquota\b/i,
  /\bcredit\b/i,
  /\bbalance\b/i,
  /\bdeplet/i,
  /\b401\b/,
  /\b403\b/,
  /Unauthorized/i,
  /Forbidden/i,
  /API key not set/i,
  /MISSING ENV/i,
  /not set\.?$/im, // matches lines like "ANTHROPIC_API_KEY not set"
  /PDF too large/i,
  /schema validation failed/i,
  /ENOENT/,
  /Migration not applied/i,
];

/**
 * Decide whether a non-zero exit should be retried.
 *
 * @param {object} input
 * @param {number|null} input.exitCode - process exit code (null if killed by signal)
 * @param {string|null} input.signal - signal name if killed (e.g. "SIGKILL" → OOM)
 * @param {string} input.stderr - captured stderr (last ~4000 chars is fine)
 * @param {number} input.attemptNumber - 1-based attempt count so far
 * @param {number} [input.maxAttempts=3] - hard cap on retries
 * @returns {{ retry: boolean, reason: string, delayMs?: number }}
 */
export function decideRetry({ exitCode, signal, stderr, attemptNumber, maxAttempts = 3 }) {
  if (attemptNumber >= maxAttempts) {
    return { retry: false, reason: `max_attempts_reached (${attemptNumber}/${maxAttempts})` };
  }

  // SIGKILL (137 / 'SIGKILL') is often OOM. Retry once on the
  // chance it was a memory spike rather than a true OOM-loop, but
  // don't retry more aggressively than that.
  if (signal === "SIGKILL" || exitCode === 137) {
    if (attemptNumber >= 2) {
      return { retry: false, reason: "sigkill_repeat_likely_oom" };
    }
    return { retry: true, reason: "sigkill_first_attempt", delayMs: 5000 };
  }

  const haystack = stderr ?? "";

  // Terminal patterns take precedence — even if a network error
  // string is present, if there's also a "quota" or "API key not
  // set" signal, the underlying problem won't be fixed by retrying.
  for (const pat of TERMINAL_PATTERNS) {
    if (pat.test(haystack)) {
      return { retry: false, reason: `terminal_signature: ${pat.source}` };
    }
  }

  for (const pat of TRANSIENT_PATTERNS) {
    if (pat.test(haystack)) {
      // Exponential backoff: 5s, 15s, 45s
      const delayMs = 5000 * Math.pow(3, attemptNumber - 1);
      return { retry: true, reason: `transient_signature: ${pat.source}`, delayMs };
    }
  }

  // Default: do NOT retry on unknown failure shapes. Better to
  // surface a new failure pattern than waste compute on what might
  // be a real bug.
  return { retry: false, reason: `unknown_failure_shape (exit=${exitCode})` };
}
