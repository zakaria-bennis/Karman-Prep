// @vitest-environment node
//
// Unit tests for the shared resilient image fetch
// (scripts/lib/fetch-image.mjs). The figure stages depend on these
// invariants — the whole point is that a transient blip is retried and
// classified differently from a permanent 404:
//
//   1. A transient failure (network error / timeout / 429 / 5xx) is
//      retried with backoff; if it then succeeds, outcome = OK.
//   2. A transient failure that survives all retries → outcome TRANSIENT
//      (caller leaves the row for the next run to retry).
//   3. A permanent failure (404/403/410, bad scheme, bad data: URL) is
//      NOT retried → outcome PERMANENT (caller marks the row done).
//   4. data: URLs decode inline with no network call.
//
// fetchImpl + sleep are injected so there's no real network or delay.

import { describe, it, expect, vi } from "vitest";
import { fetchImageBuffer, FETCH_OUTCOME } from "../../../scripts/lib/fetch-image.mjs";

/** Minimal Response-like stub. */
function res(status: number, { body = "PNGDATA", contentType = "image/png" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? contentType : null) },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

/** fetchImpl that yields the given responses/errors in order, one per call. */
function sequence(...steps: Array<{ res?: ReturnType<typeof res>; throw?: unknown }>) {
  let i = 0;
  const fn = vi.fn(async () => {
    const step = steps[Math.min(i, steps.length - 1)];
    i++;
    if (step.throw) throw step.throw;
    return step.res;
  });
  return fn;
}

const noSleep = vi.fn(async () => {});

describe("fetchImageBuffer — success", () => {
  it("returns the buffer + mime on a first-try 200 (no retry)", async () => {
    const fetchImpl = sequence({ res: res(200, { body: "HELLO", contentType: "image/jpeg" }) });
    const r = await fetchImageBuffer("https://r2.dev/a.png", { fetchImpl, sleep: noSleep });
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe(FETCH_OUTCOME.OK);
    expect(r.attempts).toBe(1);
    expect(r.mime).toBe("image/jpeg");
    expect(r.buf?.toString()).toBe("HELLO");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("fetchImageBuffer — transient retry", () => {
  it("retries a 503 with backoff, then succeeds", async () => {
    const fetchImpl = sequence({ res: res(503) }, { res: res(503) }, { res: res(200) });
    const sleep = vi.fn(async (_ms: number) => {});
    const r = await fetchImageBuffer("https://r2.dev/a.png", { fetchImpl, sleep });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(3);
    // backoff between the 3 attempts = 2 sleeps, exponential.
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([500, 1000]);
  });

  it("retries a thrown network error, then succeeds", async () => {
    const fetchImpl = sequence({ throw: new Error("ECONNRESET") }, { res: res(200) });
    const r = await fetchImageBuffer("https://r2.dev/a.png", {
      fetchImpl,
      sleep: noSleep,
      retries: 2,
    });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(2);
  });

  it("classifies a survived-all-retries failure as TRANSIENT", async () => {
    const fetchImpl = sequence({ res: res(503) });
    const r = await fetchImageBuffer("https://r2.dev/a.png", {
      fetchImpl,
      sleep: noSleep,
      retries: 2,
    });
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe(FETCH_OUTCOME.TRANSIENT);
    expect(r.attempts).toBe(3); // retries + 1
    expect(r.error).toBe("http_503");
  });

  it("labels an AbortError as a timeout", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetchImpl = sequence({ throw: abort });
    const r = await fetchImageBuffer("https://r2.dev/a.png", {
      fetchImpl,
      sleep: noSleep,
      retries: 1,
      timeoutMs: 9000,
    });
    expect(r.outcome).toBe(FETCH_OUTCOME.TRANSIENT);
    expect(r.error).toBe("timeout_9000ms");
  });
});

describe("fetchImageBuffer — permanent (no retry)", () => {
  it("does not retry a 404", async () => {
    const fetchImpl = sequence({ res: res(404) });
    const sleep = vi.fn(async () => {});
    const r = await fetchImageBuffer("https://r2.dev/gone.png", { fetchImpl, sleep });
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe(FETCH_OUTCOME.PERMANENT);
    expect(r.attempts).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("treats a 403 as permanent", async () => {
    const fetchImpl = sequence({ res: res(403) });
    const r = await fetchImageBuffer("https://r2.dev/x.png", { fetchImpl, sleep: noSleep });
    expect(r.outcome).toBe(FETCH_OUTCOME.PERMANENT);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty url and an unsupported scheme without fetching", async () => {
    const fetchImpl = vi.fn();
    const empty = await fetchImageBuffer("", { fetchImpl });
    const ftp = await fetchImageBuffer("ftp://host/x.png", { fetchImpl });
    expect(empty.outcome).toBe(FETCH_OUTCOME.PERMANENT);
    expect(ftp.outcome).toBe(FETCH_OUTCOME.PERMANENT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("fetchImageBuffer — data: URLs", () => {
  it("decodes a base64 data URL inline without any network call", async () => {
    const fetchImpl = vi.fn();
    const b64 = Buffer.from("hi-there").toString("base64");
    const r = await fetchImageBuffer(`data:image/png;base64,${b64}`, { fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.mime).toBe("image/png");
    expect(r.buf?.toString()).toBe("hi-there");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a malformed data URL as permanent", async () => {
    const r = await fetchImageBuffer("data:image/png;NOTbase64", {});
    expect(r.outcome).toBe(FETCH_OUTCOME.PERMANENT);
    expect(r.error).toBe("malformed_data_url");
  });
});
