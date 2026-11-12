import { describe, expect, it } from "vitest";
import { addNoteInput, addTaskInput, contactKey, setStageInput, tagInput } from "./schemas";

describe("CRM action schemas", () => {
  it("accepts an email key or a user key, nothing else", () => {
    expect(contactKey.safeParse("mom@example.com").success).toBe(true);
    expect(contactKey.safeParse("user:00000000-0000-4000-8000-000000000001").success).toBe(true);
    expect(contactKey.safeParse("Mom@Example.com").success).toBe(false);
    expect(contactKey.safeParse("drop table").success).toBe(false);
  });

  it("normalises tags and refuses odd ones", () => {
    expect(tagInput.parse({ key: "a@b.co", tag: "  Hot  Lead " }).tag).toBe("hot lead");
    expect(tagInput.safeParse({ key: "a@b.co", tag: "<script>" }).success).toBe(false);
    expect(tagInput.safeParse({ key: "a@b.co", tag: "x".repeat(31) }).success).toBe(false);
  });

  it("trims notes, drops control characters and needs text", () => {
    expect(addNoteInput.parse({ key: "a@b.co", body: " hi\u0007\nthere " }).body).toBe("hi\nthere");
    expect(addNoteInput.safeParse({ key: "a@b.co", body: "   " }).success).toBe(false);
    expect(addNoteInput.safeParse({ key: "a@b.co", body: "x".repeat(4001) }).success).toBe(false);
  });

  it("needs a real date and a one-line title for a follow-up", () => {
    expect(
      addTaskInput.safeParse({ key: "a@b.co", title: "Call", dueOn: "2026-11-20" }).success
    ).toBe(true);
    expect(
      addTaskInput.safeParse({ key: "a@b.co", title: "Call", dueOn: "tomorrow" }).success
    ).toBe(false);
    expect(
      addTaskInput.safeParse({ key: "a@b.co", title: "a\nb", dueOn: "2026-11-20" }).success
    ).toBe(false);
  });

  it("takes a stage, or null for automatic", () => {
    expect(setStageInput.safeParse({ key: "a@b.co", stage: null }).success).toBe(true);
    expect(setStageInput.safeParse({ key: "a@b.co", stage: "won" }).success).toBe(false);
  });
});
