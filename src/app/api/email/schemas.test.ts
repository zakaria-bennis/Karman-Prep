// Unit tests for /api/email schemas.

import { describe, expect, it } from "vitest";
import { emailSubscribeBodySchema } from "./schemas";

describe("emailSubscribeBodySchema", () => {
  it("accepts a typical email", () => {
    expect(emailSubscribeBodySchema.safeParse({ email: "student@example.com" }).success).toBe(true);
  });

  it("rejects a malformed email (no @)", () => {
    expect(emailSubscribeBodySchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(emailSubscribeBodySchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("rejects missing email", () => {
    expect(emailSubscribeBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string email", () => {
    expect(emailSubscribeBodySchema.safeParse({ email: 42 }).success).toBe(false);
  });
});
