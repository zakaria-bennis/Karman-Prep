// Unit tests for deriveClientMsgId — pure-function so testable
// without any mocks.

import { describe, expect, it } from "vitest";
import { deriveClientMsgId } from "./idempotency";

const FIXED_NOW = 1_700_000_000_000;

const baseCtx = {
  senderUuid: "uuid-sender",
  channelId: "channel-1",
  content: "hello there",
  mediaUrls: [],
  now: () => FIXED_NOW,
};

describe("deriveClientMsgId", () => {
  it("returns a UUID-shaped string", () => {
    const id = deriveClientMsgId(baseCtx);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("is deterministic for identical inputs", () => {
    const a = deriveClientMsgId(baseCtx);
    const b = deriveClientMsgId(baseCtx);
    expect(a).toBe(b);
  });

  it("changes when content changes", () => {
    const a = deriveClientMsgId(baseCtx);
    const b = deriveClientMsgId({ ...baseCtx, content: "different" });
    expect(a).not.toBe(b);
  });

  it("changes when channel changes", () => {
    const a = deriveClientMsgId(baseCtx);
    const b = deriveClientMsgId({ ...baseCtx, channelId: "channel-2" });
    expect(a).not.toBe(b);
  });

  it("changes when sender changes", () => {
    const a = deriveClientMsgId(baseCtx);
    const b = deriveClientMsgId({ ...baseCtx, senderUuid: "uuid-other" });
    expect(a).not.toBe(b);
  });

  it("changes when media URLs change", () => {
    const a = deriveClientMsgId(baseCtx);
    const b = deriveClientMsgId({
      ...baseCtx,
      mediaUrls: ["https://cdn.example.com/a.jpg"],
    });
    expect(a).not.toBe(b);
  });

  it("treats media URL ORDER as significant", () => {
    const a = deriveClientMsgId({ ...baseCtx, mediaUrls: ["a.jpg", "b.jpg"] });
    const b = deriveClientMsgId({ ...baseCtx, mediaUrls: ["b.jpg", "a.jpg"] });
    expect(a).not.toBe(b);
  });

  it("collapses to the same id within a 60-second window", () => {
    const t0 = deriveClientMsgId({ ...baseCtx, now: () => FIXED_NOW });
    const t30s = deriveClientMsgId({ ...baseCtx, now: () => FIXED_NOW + 30_000 });
    // Same minute bucket → same id (dedupe collapses double-clicks).
    // Note: this is bucket-aligned, so 60s away from a bucket edge
    // shares; 60s spanning a boundary won't. We just assert the same
    // bucket case here.
    expect(t0).toBe(t30s);
  });

  it("rotates to a new id across a minute-bucket boundary", () => {
    // Force the bucket boundary: 1_700_000_000_000 is divisible by 60_000,
    // so a step of 60_001 ms crosses into the next bucket.
    const a = deriveClientMsgId({ ...baseCtx, now: () => FIXED_NOW });
    const b = deriveClientMsgId({ ...baseCtx, now: () => FIXED_NOW + 60_001 });
    expect(a).not.toBe(b);
  });

  it("distinguishes channel send (channelId set) from DM (recipientUuid set)", () => {
    const channel = deriveClientMsgId({ ...baseCtx, channelId: "c1", recipientUuid: null });
    const dm = deriveClientMsgId({ ...baseCtx, channelId: null, recipientUuid: "r1" });
    expect(channel).not.toBe(dm);
  });
});
