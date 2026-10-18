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

  it("defaults source to newsletter for older clients", () => {
    const parsed = emailSubscribeBodySchema.safeParse({ email: "student@example.com" });
    expect(parsed.success && parsed.data.source).toBe("newsletter");
  });

  it("accepts a known lead source with name and role", () => {
    const parsed = emailSubscribeBodySchema.safeParse({
      email: "parent@example.com",
      source: "practice-test-2026-12-12",
      name: "Sam",
      role: "parent",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown lead source", () => {
    expect(
      emailSubscribeBodySchema.safeParse({ email: "student@example.com", source: "elsewhere" })
        .success
    ).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(
      emailSubscribeBodySchema.safeParse({ email: "student@example.com", role: "teacher" }).success
    ).toBe(false);
  });
});
