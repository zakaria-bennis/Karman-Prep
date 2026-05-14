// Unit tests for /api/auth schemas.

import { describe, expect, it } from "vitest";
import { syncUserBodySchema } from "./schemas";

describe("syncUserBodySchema", () => {
  it("accepts an empty body (role is optional)", () => {
    expect(syncUserBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts role=student", () => {
    expect(syncUserBodySchema.safeParse({ role: "student" }).success).toBe(true);
  });

  it("accepts role=tutor", () => {
    expect(syncUserBodySchema.safeParse({ role: "tutor" }).success).toBe(true);
  });

  it("rejects role=admin (admin is set out-of-band)", () => {
    expect(syncUserBodySchema.safeParse({ role: "admin" }).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(syncUserBodySchema.safeParse({ role: "ghost" }).success).toBe(false);
  });
});
