// Unit tests for /api/webhooks schemas.

import { describe, expect, it } from "vitest";
import { seminarOverflowBodySchema } from "./schemas";

describe("seminarOverflowBodySchema", () => {
  const valid = {
    type: "INSERT",
    table: "cohort_members",
    schema: "public",
    record: { cohort_id: "cohort-1", left_at: null },
  };

  it("accepts a typical Supabase INSERT payload", () => {
    expect(seminarOverflowBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a payload with no record (the route ignores it)", () => {
    expect(
      seminarOverflowBodySchema.safeParse({
        type: "INSERT",
        table: "cohort_members",
        schema: "public",
      }).success
    ).toBe(true);
  });

  it("accepts a payload where left_at is a timestamp string", () => {
    expect(
      seminarOverflowBodySchema.safeParse({
        ...valid,
        record: { cohort_id: "cohort-1", left_at: "2026-04-01T00:00:00Z" },
      }).success
    ).toBe(true);
  });

  it("rejects an empty table", () => {
    expect(seminarOverflowBodySchema.safeParse({ ...valid, table: "" }).success).toBe(false);
  });

  it("rejects an empty type", () => {
    expect(seminarOverflowBodySchema.safeParse({ ...valid, type: "" }).success).toBe(false);
  });

  it("rejects a non-string cohort_id", () => {
    expect(
      seminarOverflowBodySchema.safeParse({ ...valid, record: { cohort_id: 123 } }).success
    ).toBe(false);
  });
});
