// Unit tests for /api/cohorts schemas.

import { describe, expect, it } from "vitest";
import { provisionCohortBodySchema } from "./schemas";

describe("provisionCohortBodySchema", () => {
  it("accepts a non-empty cohortId", () => {
    expect(provisionCohortBodySchema.safeParse({ cohortId: "cohort-1" }).success).toBe(true);
  });

  it("rejects empty cohortId", () => {
    expect(provisionCohortBodySchema.safeParse({ cohortId: "" }).success).toBe(false);
  });

  it("rejects missing cohortId", () => {
    expect(provisionCohortBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a numeric cohortId", () => {
    expect(provisionCohortBodySchema.safeParse({ cohortId: 42 }).success).toBe(false);
  });
});
