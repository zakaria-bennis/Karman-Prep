// Unit tests for nameMatchOrNull — the fuzzy name fallback used by
// findBookingForParticipant when a Zoom participant joins a cohort
// meeting with an email that doesn't match the roster. Audit #11.

import { describe, expect, it } from "vitest";
import { nameMatchOrNull } from "./attendance";

const roster = [
  { id: "u1", first_name: "Alice", last_name: "Smith" },
  { id: "u2", first_name: "Bob", last_name: "Jones" },
  { id: "u3", first_name: "Charlie", last_name: "Brown" },
];

describe("nameMatchOrNull", () => {
  it("matches 'First Last' exactly", () => {
    expect(nameMatchOrNull("Alice Smith", roster)?.id).toBe("u1");
  });

  it("matches 'Last First' (reversed order)", () => {
    expect(nameMatchOrNull("Smith Alice", roster)?.id).toBe("u1");
  });

  it("is case-insensitive", () => {
    expect(nameMatchOrNull("ALICE SMITH", roster)?.id).toBe("u1");
    expect(nameMatchOrNull("alice smith", roster)?.id).toBe("u1");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(nameMatchOrNull("Alice  Smith.", roster)?.id).toBe("u1");
    expect(nameMatchOrNull("Smith, Alice", roster)?.id).toBe("u1");
  });

  it("returns null on no match", () => {
    expect(nameMatchOrNull("Dave Wilson", roster)).toBeNull();
  });

  it("returns null on partial match (first name only)", () => {
    expect(nameMatchOrNull("Alice", roster)).toBeNull();
  });

  it("returns null when more than one roster entry matches (ambiguous)", () => {
    const dupeRoster = [
      { id: "u1", first_name: "Alice", last_name: "Smith" },
      { id: "u2", first_name: "Alice", last_name: "Smith" }, // duplicate name
    ];
    expect(nameMatchOrNull("Alice Smith", dupeRoster)).toBeNull();
  });

  it("returns null on empty input", () => {
    expect(nameMatchOrNull("", roster)).toBeNull();
    expect(nameMatchOrNull("   ", roster)).toBeNull();
  });

  it("ignores roster entries with no name set", () => {
    const ros = [
      { id: "u1", first_name: null, last_name: null },
      { id: "u2", first_name: "Alice", last_name: "Smith" },
    ];
    expect(nameMatchOrNull("Alice Smith", ros)?.id).toBe("u2");
  });

  it("handles students with first name only (no last)", () => {
    const ros = [{ id: "u1", first_name: "Madonna", last_name: null }];
    expect(nameMatchOrNull("Madonna", ros)?.id).toBe("u1");
  });

  it("does not match by initials or substring", () => {
    expect(nameMatchOrNull("A Smith", roster)).toBeNull();
    expect(nameMatchOrNull("Smit", roster)).toBeNull();
  });
});
