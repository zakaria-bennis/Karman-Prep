// The after-hours assistant's rules, prompt and fallbacks. Nothing here calls the API.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { answerAfterHours, type AskAssistant } from "./claude";
import { karmanFacts } from "./facts";
import {
  CHAT_ASSISTANT_MODEL,
  FALLBACK_REPLY,
  buildSystemPrompt,
  buildUserPrompt,
  isAfterHours,
} from "./model";
import { MARCH_PROGRAM, formatPrice } from "@/lib/marketing/offer";

describe("isAfterHours", () => {
  // Central is UTC-6 in November
  it("is after hours from 9 PM to 9 AM Central", () => {
    expect(isAfterHours(new Date("2026-11-17T03:00:00Z"))).toBe(true); // 9 PM
    expect(isAfterHours(new Date("2026-11-17T14:59:00Z"))).toBe(true); // 8:59 AM
    expect(isAfterHours(new Date("2026-11-17T15:00:00Z"))).toBe(false); // 9 AM
    expect(isAfterHours(new Date("2026-11-17T02:59:00Z"))).toBe(false); // 8:59 PM
  });
});

describe("the facts", () => {
  const facts = karmanFacts();
  it("carry the site's own numbers and published answers", () => {
    expect(facts).toContain(String(MARCH_PROGRAM.price));
    expect(facts).toContain(formatPrice(MARCH_PROGRAM.price));
    expect(facts).toMatch(/Q: .+\nA: .+/);
    expect(facts).toMatch(/Saturday, from 6 AM to midnight/);
  });
  it("never call a practice test official", () => {
    expect(facts).toMatch(/not official College Board tests/);
  });
});

describe("the prompt", () => {
  const system = buildSystemPrompt("FACTS GO HERE");
  it("uses Claude Haiku and holds the rules that matter", () => {
    expect(CHAT_ASSISTANT_MODEL).toBe("claude-haiku-5-5");
    expect(system).toMatch(/automated, not a person and not the tutor/);
    expect(system).toMatch(/Never give a bare answer/);
    expect(system).toMatch(/Answer only from the FACTS/);
    expect(system).toMatch(/never offer a refund/);
    expect(system).toMatch(/988/);
    expect(system.endsWith("FACTS GO HERE")).toBe(true);
  });

  it("shows the model a sent question with its choices and both answers", () => {
    const user = buildUserPrompt({
      studentFirstName: "Maya",
      tutorFirstName: "Jordan",
      thread: [{ from: "tutor", text: "How did the time trial feel?" }],
      message: "",
      question: {
        skill: "Percentages",
        section: "Math",
        prompt: "What is the final price?",
        choices: ["$38", "$40", "$42", "$45"],
        studentAnswer: "A",
        correctAnswer: "B",
      },
    });
    expect(user).toContain("Tutor: How did the time trial feel?");
    expect(user).toContain("B. $40");
    expect(user).toContain("The student chose A.");
    expect(user).toContain("The right choice is B.");
    expect(user).toContain("sent the question with no words");
  });
});

describe("answerAfterHours", () => {
  const input = { studentFirstName: null, tutorFirstName: null, thread: [], message: "hi" };
  it("returns the model's answer", async () => {
    const ask: AskAssistant = async () => ({ reply: "Hello.", needs_tutor: false, urgent: false });
    expect((await answerAfterHours(input, ask)).reply).toBe("Hello.");
  });
  it("hands off to the tutor when there is no answer or the call fails", async () => {
    const none: AskAssistant = async () => null;
    const broken: AskAssistant = async () => {
      throw new Error("down");
    };
    for (const ask of [none, broken]) {
      expect(await answerAfterHours(input, ask)).toEqual({
        reply: FALLBACK_REPLY,
        needs_tutor: true,
        urgent: false,
      });
    }
  });
});
