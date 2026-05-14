// Unit tests for /api/admin/moderation schemas.

import { describe, expect, it } from "vitest";
import { moderationActionBodySchema, moderationWarnBodySchema } from "./schemas";

describe("moderationActionBodySchema", () => {
  const valid = { kind: "chat" as const, messageId: "msg-1" };

  it("accepts a chat action", () => {
    expect(moderationActionBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a dm action", () => {
    expect(moderationActionBodySchema.safeParse({ kind: "dm", messageId: "msg-1" }).success).toBe(
      true
    );
  });

  it("accepts an optional reason", () => {
    expect(moderationActionBodySchema.safeParse({ ...valid, reason: "spam" }).success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(moderationActionBodySchema.safeParse({ ...valid, kind: "video" }).success).toBe(false);
  });

  it("rejects empty messageId", () => {
    expect(moderationActionBodySchema.safeParse({ ...valid, messageId: "" }).success).toBe(false);
  });

  it("rejects missing messageId", () => {
    expect(moderationActionBodySchema.safeParse({ kind: "chat" }).success).toBe(false);
  });
});

describe("moderationWarnBodySchema", () => {
  const valid = { targetUserUuid: "user-1", reason: "Repeated low-grade incivility" };

  it("accepts a minimal warning (defaults severity to medium)", () => {
    const r = moderationWarnBodySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.severity).toBe("medium");
  });

  it("accepts each severity level", () => {
    for (const sev of ["low", "medium", "high"] as const) {
      expect(moderationWarnBodySchema.safeParse({ ...valid, severity: sev }).success).toBe(true);
    }
  });

  it("rejects empty reason (admin must justify)", () => {
    expect(moderationWarnBodySchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
  });

  it("rejects empty targetUserUuid", () => {
    expect(moderationWarnBodySchema.safeParse({ ...valid, targetUserUuid: "" }).success).toBe(
      false
    );
  });

  it("accepts an optional related message context", () => {
    expect(
      moderationWarnBodySchema.safeParse({
        ...valid,
        relatedMessageId: "msg-1",
        relatedMessageKind: "chat",
      }).success
    ).toBe(true);
  });

  it("rejects an unknown relatedMessageKind", () => {
    expect(
      moderationWarnBodySchema.safeParse({
        ...valid,
        relatedMessageKind: "voice",
      }).success
    ).toBe(false);
  });

  it("rejects an unknown severity", () => {
    expect(moderationWarnBodySchema.safeParse({ ...valid, severity: "extreme" }).success).toBe(
      false
    );
  });
});
