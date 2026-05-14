// ============================================================
// Unit tests for the chat API route body schemas.
//
// Locks down the gate at the request boundary so a client (or
// curl) posting a malformed body can't slip past TS narrowing.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  highlightMessageBodySchema,
  pinMessageBodySchema,
  readDmBodySchema,
  sendDmBodySchema,
  sendMessageBodySchema,
} from "./schemas";

describe("sendMessageBodySchema", () => {
  const valid = {
    channelId: "channel-1",
    content: "hello",
    messageType: "cohort_message" as const,
  };

  it("accepts a minimal cohort_message", () => {
    expect(sendMessageBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an image-only message (no content, mediaUrls non-empty)", () => {
    const r = sendMessageBodySchema.safeParse({
      channelId: "channel-1",
      mediaUrls: ["https://cdn.example.com/a.jpg"],
      messageType: "cohort_message",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty content AND empty mediaUrls", () => {
    const r = sendMessageBodySchema.safeParse({
      channelId: "channel-1",
      messageType: "cohort_message",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty channelId", () => {
    expect(sendMessageBodySchema.safeParse({ ...valid, channelId: "" }).success).toBe(false);
  });

  it("rejects an unknown messageType", () => {
    expect(sendMessageBodySchema.safeParse({ ...valid, messageType: "system" }).success).toBe(
      false
    );
  });

  it("requires parentMessageId for qa_answer", () => {
    const r = sendMessageBodySchema.safeParse({
      channelId: "channel-1",
      content: "answer",
      messageType: "qa_answer",
    });
    expect(r.success).toBe(false);
  });

  it("accepts qa_answer when parentMessageId is provided", () => {
    const r = sendMessageBodySchema.safeParse({
      channelId: "channel-1",
      content: "answer",
      messageType: "qa_answer",
      parentMessageId: "msg-parent",
    });
    expect(r.success).toBe(true);
  });

  it("accepts an isAnonymous flag", () => {
    expect(sendMessageBodySchema.safeParse({ ...valid, isAnonymous: true }).success).toBe(true);
  });
});

describe("sendDmBodySchema", () => {
  it("accepts a recipient + content", () => {
    const r = sendDmBodySchema.safeParse({
      recipientId: "clerk-abc",
      content: "hey",
    });
    expect(r.success).toBe(true);
  });

  it("accepts image-only DMs", () => {
    const r = sendDmBodySchema.safeParse({
      recipientId: "clerk-abc",
      mediaUrls: ["https://cdn.example.com/a.jpg"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty recipientId", () => {
    expect(sendDmBodySchema.safeParse({ recipientId: "", content: "hi" }).success).toBe(false);
  });

  it("rejects empty content AND empty mediaUrls", () => {
    expect(sendDmBodySchema.safeParse({ recipientId: "clerk-abc" }).success).toBe(false);
  });
});

describe("readDmBodySchema", () => {
  it("accepts a non-empty Clerk id", () => {
    expect(readDmBodySchema.safeParse({ withClerkId: "clerk-abc" }).success).toBe(true);
  });

  it("rejects empty withClerkId", () => {
    expect(readDmBodySchema.safeParse({ withClerkId: "" }).success).toBe(false);
  });
});

describe("pinMessageBodySchema", () => {
  it("accepts a valid pin request", () => {
    expect(pinMessageBodySchema.safeParse({ messageId: "msg-1", pinned: true }).success).toBe(true);
  });

  it("rejects a non-boolean pinned (the old runtime check would have caught this too)", () => {
    expect(pinMessageBodySchema.safeParse({ messageId: "msg-1", pinned: "true" }).success).toBe(
      false
    );
  });

  it("rejects missing pinned", () => {
    expect(pinMessageBodySchema.safeParse({ messageId: "msg-1" }).success).toBe(false);
  });

  it("rejects empty messageId", () => {
    expect(pinMessageBodySchema.safeParse({ messageId: "", pinned: true }).success).toBe(false);
  });
});

describe("highlightMessageBodySchema", () => {
  it("accepts a valid highlight request", () => {
    expect(
      highlightMessageBodySchema.safeParse({ messageId: "msg-1", highlighted: false }).success
    ).toBe(true);
  });

  it("rejects a non-boolean highlighted", () => {
    expect(
      highlightMessageBodySchema.safeParse({ messageId: "msg-1", highlighted: 1 }).success
    ).toBe(false);
  });
});
