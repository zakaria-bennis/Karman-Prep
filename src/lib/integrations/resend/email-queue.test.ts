// Unit tests for the pure helpers in email-queue.ts.
// The Supabase-touching helpers (enqueueFailedEmail / listPending /
// markFailedEmailSucceeded / recordFailedEmailRetryOutcome) need DB
// integration to exercise meaningfully and are covered by the cron's
// own test path; here we lock the schedule + (de)serialize logic.

import { describe, expect, it } from "vitest";
import {
  MAX_ATTEMPTS,
  backoffDelayMs,
  deserializeEmailArgs,
  serializeEmailArgs,
} from "./email-queue";

describe("backoffDelayMs", () => {
  it("returns the first slot for the initial failure (attempts=0)", () => {
    expect(backoffDelayMs(0)).toBe(60_000); // 1 min
  });

  it("increases for each prior attempt", () => {
    expect(backoffDelayMs(1)).toBeGreaterThan(backoffDelayMs(0));
    expect(backoffDelayMs(2)).toBeGreaterThan(backoffDelayMs(1));
    expect(backoffDelayMs(3)).toBeGreaterThan(backoffDelayMs(2));
    expect(backoffDelayMs(4)).toBeGreaterThan(backoffDelayMs(3));
  });

  it("caps at the last schedule slot for over-the-cap attempts (defensive)", () => {
    // Past MAX_ATTEMPTS the cron has already marked the row given_up_at,
    // so this branch shouldn't fire — but if it does, don't return NaN.
    expect(backoffDelayMs(MAX_ATTEMPTS + 5)).toBe(backoffDelayMs(MAX_ATTEMPTS - 1));
  });

  it("never returns a delay shorter than 1 minute", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(backoffDelayMs(i)).toBeGreaterThanOrEqual(60_000);
    }
  });

  it("clamps negative attempts to the first slot (defensive)", () => {
    expect(backoffDelayMs(-1)).toBe(backoffDelayMs(0));
  });
});

describe("serializeEmailArgs", () => {
  it("turns Date instances into ISO strings", () => {
    const start = new Date("2026-05-15T18:00:00.000Z");
    const out = serializeEmailArgs({ start, name: "Alice", count: 3 });
    expect(out.start).toBe("2026-05-15T18:00:00.000Z");
    expect(out.name).toBe("Alice");
    expect(out.count).toBe(3);
  });

  it("leaves non-Date values untouched (strings, numbers, arrays, null)", () => {
    const out = serializeEmailArgs({
      str: "hello",
      n: 42,
      arr: ["a", "b"],
      nullish: null,
      bool: true,
    });
    expect(out).toEqual({
      str: "hello",
      n: 42,
      arr: ["a", "b"],
      nullish: null,
      bool: true,
    });
  });

  it("is a no-op on an empty object", () => {
    expect(serializeEmailArgs({})).toEqual({});
  });
});

describe("deserializeEmailArgs", () => {
  it("turns the named ISO strings back into Date instances", () => {
    const out = deserializeEmailArgs(
      { start: "2026-05-15T18:00:00.000Z", end: "2026-05-15T19:00:00.000Z", name: "Alice" },
      ["start", "end"]
    );
    expect(out.start).toBeInstanceOf(Date);
    expect(out.end).toBeInstanceOf(Date);
    expect((out.start as Date).toISOString()).toBe("2026-05-15T18:00:00.000Z");
    expect(out.name).toBe("Alice"); // unchanged
  });

  it("leaves a missing field undefined (no synthetic Date)", () => {
    const out = deserializeEmailArgs({ name: "Alice" }, ["start"]);
    expect(out.start).toBeUndefined();
  });

  it("round-trips with serializeEmailArgs", () => {
    const original = {
      start: new Date("2026-05-15T18:00:00.000Z"),
      end: new Date("2026-05-15T19:00:00.000Z"),
      tutorName: "Tutor X",
      parentEmails: ["a@x.com", "b@x.com"],
    };
    const serialized = serializeEmailArgs(original);
    const deserialized = deserializeEmailArgs(serialized, ["start", "end"]);
    expect((deserialized.start as Date).toISOString()).toBe(original.start.toISOString());
    expect((deserialized.end as Date).toISOString()).toBe(original.end.toISOString());
    expect(deserialized.tutorName).toBe("Tutor X");
    expect(deserialized.parentEmails).toEqual(["a@x.com", "b@x.com"]);
  });
});
