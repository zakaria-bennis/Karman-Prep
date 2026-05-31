// Resilient image-crop fetch, shared across the figure-reading pipeline
// stages (extract-figure-structure, check-figure-coherence,
// extract-table-data).
//
// Why this exists: every one of those stages had its own single-shot
// `fetch()` that collapsed EVERY failure — a transient network blip, a
// 503, a timeout, a real 404 — into the same `null`. So one momentary
// hiccup on a single image looked identical to a permanently-missing
// asset, and the row got silently skipped (a Phase 9A dry-run skipped a
// table whose crop was actually a healthy 200, just because one fetch
// blipped). The repo already retries transient infra failures at the
// stage level (lib/retry-decision.mjs, orchestrate runStage); the
// per-image fetch just never got the same treatment.
//
// fetchImageBuffer:
//   · retries TRANSIENT failures (network error, timeout, 429, 5xx) with
//     exponential backoff
//   · does NOT retry PERMANENT failures (404 / 403 / 410, bad scheme,
//     malformed data: URL) — retrying can't help
//   · times out each attempt via AbortController so a hung connection
//     fails fast into the retry instead of stalling the loop
//   · returns a typed OUTCOME so callers can act: PERMANENT → mark the
//     row done (don't re-attempt forever); TRANSIENT → leave it for the
//     next run to retry; OK → use the buffer.
//
// Pure + injectable (fetchImpl, sleep) so the retry/classification logic
// is unit-tested without real network or real delays (fetch-image.test.ts).

/** Per-attempt outcome classification. */
export const FETCH_OUTCOME = Object.freeze({
  OK: "ok",
  /** Object is genuinely gone / unreachable-by-design — retrying is futile. */
  PERMANENT: "permanent",
  /** Momentary failure that survived retries — safe (and worth) retrying later. */
  TRANSIENT: "transient",
});

// HTTP statuses worth retrying. Everything else non-2xx is permanent.
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const fail = (outcome, error, status = null, attempts = 0) => ({
  ok: false,
  buf: null,
  mime: null,
  status,
  outcome,
  attempts,
  error,
});

/**
 * Fetch an image URL into a Buffer, resilient to transient failures.
 *
 * @param {string} url  http(s) URL or a `data:image/...;base64,...` URL.
 * @param {{retries?: number, timeoutMs?: number, baseDelayMs?: number, fetchImpl?: Function, sleep?: Function}} [opts]
 * @returns {Promise<{ok: boolean, buf: Buffer|null, mime: string|null, status: number|null, outcome: string, attempts: number, error: string|null}>}
 */
export async function fetchImageBuffer(url, opts = {}) {
  const {
    retries = 3,
    timeoutMs = 15000,
    baseDelayMs = 500,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;

  if (!url || typeof url !== "string") {
    return fail(FETCH_OUTCOME.PERMANENT, "empty_url");
  }

  // data: URL — decode inline, no network, no retry.
  if (url.startsWith("data:")) {
    const m = url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!m) return fail(FETCH_OUTCOME.PERMANENT, "malformed_data_url", null, 1);
    return {
      ok: true,
      buf: Buffer.from(m[2], "base64"),
      mime: m[1],
      status: null,
      outcome: FETCH_OUTCOME.OK,
      attempts: 1,
      error: null,
    };
  }

  if (!/^https?:\/\//i.test(url)) {
    return fail(FETCH_OUTCOME.PERMANENT, "unsupported_scheme", null, 1);
  }

  const maxAttempts = Math.max(1, retries + 1);
  let lastError = null;
  let lastStatus = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal });
      clearTimeout(timer);
      lastStatus = res.status;

      if (res.ok) {
        const mime = res.headers?.get?.("content-type") ?? "image/png";
        const buf = Buffer.from(await res.arrayBuffer());
        return {
          ok: true,
          buf,
          mime,
          status: res.status,
          outcome: FETCH_OUTCOME.OK,
          attempts: attempt,
          error: null,
        };
      }

      // Non-2xx: permanent unless it's a known-transient status.
      if (!TRANSIENT_STATUS.has(res.status)) {
        return fail(FETCH_OUTCOME.PERMANENT, `http_${res.status}`, res.status, attempt);
      }
      lastError = `http_${res.status}`;
    } catch (err) {
      clearTimeout(timer);
      lastError =
        err?.name === "AbortError" ? `timeout_${timeoutMs}ms` : (err?.message ?? String(err));
      // Network errors + timeouts are transient → fall through to retry.
    }

    if (attempt < maxAttempts) {
      await sleep(baseDelayMs * 2 ** (attempt - 1)); // 500ms, 1s, 2s, …
    }
  }

  return fail(FETCH_OUTCOME.TRANSIENT, lastError, lastStatus, maxAttempts);
}
