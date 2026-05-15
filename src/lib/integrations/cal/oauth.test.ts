// Unit tests for the pure helpers in oauth.ts. Network-bound
// helpers (exchangeCodeForTokens, refreshAccessToken, listEventTypes)
// require fetch mocking and are exercised via integration tests
// against a Cal sandbox, not here.

import { describe, expect, it } from "vitest";
import { pickEventTypeByKeyword, type CalEventType } from "./oauth";

const ev = (title: string, slug = title.toLowerCase().replace(/\s+/g, "-")): CalEventType => ({
  id: Math.floor(Math.random() * 1_000_000),
  title,
  slug,
  lengthInMinutes: 60,
});

describe("pickEventTypeByKeyword", () => {
  it("returns the single match when exactly one title contains 'karman'", () => {
    const list = [ev("Quick chat"), ev("Karman SAT session"), ev("Office hours")];
    const picked = pickEventTypeByKeyword(list);
    expect(picked).not.toBeNull();
    expect(picked?.title).toBe("Karman SAT session");
  });

  it("returns the single match when exactly one slug contains 'sat'", () => {
    const list = [ev("Free intro", "free-intro"), ev("Tutoring", "sat-prep")];
    const picked = pickEventTypeByKeyword(list);
    expect(picked).not.toBeNull();
    expect(picked?.slug).toBe("sat-prep");
  });

  it("returns null when nothing matches (caller falls back to dropdown)", () => {
    const list = [ev("Quick chat"), ev("Office hours"), ev("Consulting call")];
    expect(pickEventTypeByKeyword(list)).toBeNull();
  });

  it("returns null when multiple options match (ambiguous)", () => {
    const list = [ev("Karman intro"), ev("Karman SAT 60-min"), ev("Other")];
    expect(pickEventTypeByKeyword(list)).toBeNull();
  });

  it("is case-insensitive", () => {
    const list = [ev("KARMAN PREP"), ev("Other")];
    expect(pickEventTypeByKeyword(list)?.title).toBe("KARMAN PREP");
  });

  it("matches title OR slug, not just title", () => {
    const list = [ev("Generic tutoring", "karman-private-session"), ev("Other free call", "intro")];
    expect(pickEventTypeByKeyword(list)?.slug).toBe("karman-private-session");
  });

  it("handles an empty list (no events)", () => {
    expect(pickEventTypeByKeyword([])).toBeNull();
  });
});
