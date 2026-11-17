import { describe, expect, it } from "vitest";
import { questionText, sharedQuestionSchema, typingPlace } from "./shared";
import {
  presenceBodySchema,
  reactBodySchema,
  readChannelBodySchema,
  sendDmBodySchema,
  sendMessageBodySchema,
} from "@/app/api/chat/schemas";

const question = {
  skill: "Circles",
  section: "Math" as const,
  from: "Daily 10, Nov 14",
  prompt: "A circle has radius 6. What is its area?",
  choices: ["12 pi", "36 pi", "6 pi", "72 pi"],
  flagged: true,
};
const uuid = "07d594cf-d972-4d14-87af-2325f974169d";

describe("a question sent with a message", () => {
  it("is accepted as it is", () => {
    expect(sharedQuestionSchema.safeParse(question).success).toBe(true);
  });

  it("is refused when it is malformed or far too long", () => {
    expect(sharedQuestionSchema.safeParse({ ...question, section: "History" }).success).toBe(false);
    expect(sharedQuestionSchema.safeParse({ ...question, prompt: "x".repeat(4001) }).success).toBe(
      false
    );
    expect(
      sharedQuestionSchema.safeParse({ ...question, choices: Array(7).fill("a") }).success
    ).toBe(false);
  });

  it("gives the check every word of it", () => {
    const text = questionText(question);
    expect(text).toContain(question.prompt);
    for (const choice of question.choices) expect(text).toContain(choice);
  });

  it("can be sent with no words, to the class or in a private chat", () => {
    expect(
      sendMessageBodySchema.safeParse({ channelId: uuid, messageType: "cohort_message", question })
        .success
    ).toBe(true);
    expect(sendDmBodySchema.safeParse({ recipientId: "user_1", question }).success).toBe(true);
  });

  it("an empty message with no question is still refused", () => {
    expect(
      sendMessageBodySchema.safeParse({ channelId: uuid, messageType: "cohort_message" }).success
    ).toBe(false);
  });
});

describe("announcements, reactions, read marks and presence", () => {
  it("accepts an announcement as a kind of class message", () => {
    expect(
      sendMessageBodySchema.safeParse({
        channelId: uuid,
        messageType: "announcement",
        content: "Class moves to 5 PM.",
      }).success
    ).toBe(true);
  });

  it("accepts a known reaction or taking one back, and nothing else", () => {
    const base = { kind: "channel", messageId: uuid };
    expect(reactBodySchema.safeParse({ ...base, reaction: "fire" }).success).toBe(true);
    expect(reactBodySchema.safeParse({ ...base, reaction: null }).success).toBe(true);
    expect(reactBodySchema.safeParse({ ...base, reaction: "heart" }).success).toBe(false);
    expect(reactBodySchema.safeParse({ ...base, messageId: "m12", reaction: "up" }).success).toBe(
      false
    );
  });

  it("reads a channel as chat or announcements only", () => {
    expect(readChannelBodySchema.safeParse({ channelId: uuid, scope: "chat" }).success).toBe(true);
    expect(readChannelBodySchema.safeParse({ channelId: uuid, scope: "dm" }).success).toBe(false);
  });

  it("takes an empty heartbeat, a class or a private chat", () => {
    expect(presenceBodySchema.safeParse({}).success).toBe(true);
    expect(presenceBodySchema.safeParse({ typing: { channelId: uuid }, watch: null }).success).toBe(
      true
    );
    expect(presenceBodySchema.safeParse({ watch: { withClerkId: "user_1" } }).success).toBe(true);
  });

  it("keeps typing in a class apart from typing to a person", () => {
    expect(typingPlace.channel(uuid)).not.toBe(typingPlace.dm(uuid));
  });
});
