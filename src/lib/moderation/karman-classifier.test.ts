// ============================================================
// Unit tests for Karman's own check on a chat message.
// A fake `ask` stands in for Claude, so nothing here calls the API.
// ============================================================

import { describe, expect, it, vi } from "vitest";
import {
  CLASSIFIER_MODEL,
  SYSTEM_PROMPT,
  callKarmanClassifier,
  type Ask,
} from "./karman-classifier";

const says = (answer: Awaited<ReturnType<Ask>>) => vi.fn<Ask>(async () => answer);

describe("callKarmanClassifier", () => {
  it("uses Claude Haiku", () => {
    expect(CLASSIFIER_MODEL).toBe("claude-haiku-5-5");
  });

  it("passes the trimmed words and every picture to the model", async () => {
    const ask = says({ flagged: false, category: "none", reason: "clean" });
    await callKarmanClassifier("  hi  \n", ["https://cdn.example.com/a.jpg"], ask);
    expect(ask).toHaveBeenCalledWith("hi", ["https://cdn.example.com/a.jpg"]);
  });

  it("asks nothing when there are no words and no pictures", async () => {
    const ask = says({ flagged: false, category: "none", reason: "clean" });
    expect((await callKarmanClassifier("", [], ask)).flagged).toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it("checks a picture sent with no words", async () => {
    const ask = says({ flagged: true, category: "sexual", reason: "nudity" });
    const r = await callKarmanClassifier("", ["https://cdn.example.com/a.jpg"], ask);
    expect(ask).toHaveBeenCalledOnce();
    expect(r).toEqual({ flagged: true, category: "sexual", reason: "nudity" });
  });

  it("returns a clean verdict with no category", async () => {
    const r = await callKarmanClassifier(
      "how do you set up 14?",
      [],
      says({ flagged: false, category: "cheating", reason: "clean" })
    );
    expect(r).toEqual({ flagged: false, reason: "clean" });
  });

  it("reports each kind of flag", async () => {
    for (const category of ["sexual", "cheating", "contact", "conduct"] as const) {
      const r = await callKarmanClassifier(
        "x",
        [],
        says({ flagged: true, category, reason: "why" })
      );
      expect(r).toEqual({ flagged: true, category, reason: "why" });
    }
  });

  it("treats a flag with no kind as conduct", async () => {
    const r = await callKarmanClassifier(
      "x",
      [],
      says({ flagged: true, category: "none", reason: "" })
    );
    expect(r).toEqual({ flagged: true, category: "conduct", reason: "flagged" });
  });

  it("flags content the model declines to look at, as the most serious kind", async () => {
    const r = await callKarmanClassifier("", ["https://cdn.example.com/a.jpg"], says("declined"));
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("sexual");
  });

  it("throws when the model cannot be reached, so the pipeline does not deliver", async () => {
    const ask = vi.fn<Ask>(async () => {
      throw new Error("timeout");
    });
    await expect(callKarmanClassifier("hello", [], ask)).rejects.toThrow("timeout");
  });

  it("tells the model who the students are, what is and is not cheating, and how to judge pictures", () => {
    expect(SYSTEM_PROMPT).toMatch(/14-18/);
    expect(SYSTEM_PROMPT).toMatch(/Karman/);
    expect(SYSTEM_PROMPT).toMatch(/minors/);
    expect(SYSTEM_PROMPT).toMatch(/ACADEMIC DISHONESTY/);
    expect(SYSTEM_PROMPT).toMatch(/WORKING A QUESTION OUT TOGETHER/);
    expect(SYSTEM_PROMPT).toMatch(/When it is unclear, it is not cheating/);
    expect(SYSTEM_PROMPT).toMatch(/PICTURES/);
    expect(SYSTEM_PROMPT).toMatch(/looks under 18/);
  });
});
