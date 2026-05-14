// Unit tests for /api/admin/moderation schemas.

import { describe, expect, it } from "vitest";
import { moderationActionBodySchema } from "./schemas";

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
