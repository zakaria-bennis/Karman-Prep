import { describe, expect, it } from "vitest";
import { FREE_PLAN, PRACTICE_PLAN, PRO_PLAN, QUESTION_BANK } from "@/lib/marketing/offer";
import { checkoutHref, isLocked, planCard, upgradesFor, upgradeWords } from "./locks";

const open = { questionsLeft: null, canStartFullTest: true };
const freeFresh = { questionsLeft: 100, canStartFullTest: true };
const freeSpent = { questionsLeft: 0, canStartFullTest: false };

describe("which plans the portal offers", () => {
  it("offers Free both plans, a Practice plan Pro, and nothing beyond Pro", () => {
    expect(upgradesFor("free")).toEqual(["practice", "pro"]);
    expect(upgradesFor("practice")).toEqual(["pro"]);
    expect(upgradesFor("school")).toEqual(["pro"]);
    expect(upgradesFor("pro")).toEqual([]);
    expect(upgradesFor("cohort")).toEqual([]);
    expect(upgradesFor("private-20")).toEqual([]);
  });

  it("offers only Pro for workshops, which Practice does not have", () => {
    expect(upgradesFor("free", "workshops")).toEqual(["pro"]);
    expect(upgradesFor("free", "questions")).toEqual(["practice", "pro"]);
    expect(upgradesFor("practice", "workshops")).toEqual(["pro"]);
  });
});

describe("what is locked", () => {
  it("locks new questions only once Free's are used", () => {
    expect(isLocked("questions", "free", freeFresh)).toBe(false);
    expect(isLocked("questions", "free", freeSpent)).toBe(true);
    expect(isLocked("questions", "pro", open)).toBe(false);
  });

  it("locks a new full-length exam when the plan cannot start one", () => {
    expect(isLocked("exam", "free", freeSpent)).toBe(true);
    expect(isLocked("exam", "free", freeFresh)).toBe(false);
    expect(isLocked("exam", "practice", open)).toBe(false);
  });

  it("keeps the predicted score and the second challenge question for paying plans", () => {
    expect(isLocked("score", "free", freeFresh)).toBe(true);
    expect(isLocked("score", "practice", open)).toBe(false);
    expect(isLocked("challenge", "free", freeFresh)).toBe(true);
    expect(isLocked("challenge", "pro", open)).toBe(false);
  });

  it("opens workshops to Pro and the taught plans only", () => {
    expect(isLocked("workshops", "free", freeFresh)).toBe(true);
    expect(isLocked("workshops", "practice", open)).toBe(true);
    expect(isLocked("workshops", "school", open)).toBe(true);
    expect(isLocked("workshops", "pro", open)).toBe(false);
    expect(isLocked("workshops", "cohort", open)).toBe(false);
    expect(isLocked("workshops", "private-10", open)).toBe(false);
  });

  it("never locks the plan page itself", () => {
    expect(isLocked("plan", "free", freeSpent)).toBe(false);
  });
});

describe("the sheet's words and plans", () => {
  it("names Free's limit from offer.ts", () => {
    expect(upgradeWords("questions", ["practice", "pro"]).title).toContain(
      String(FREE_PLAN.questionLimit)
    );
  });

  it("speaks of Pro alone when Pro is the only way up", () => {
    expect(upgradeWords("score", ["pro"]).title).toBe("Your predicted score comes with Pro");
    expect(upgradeWords("score", ["practice", "pro"]).title).toBe(
      "Your predicted score comes with Practice or Pro"
    );
  });

  it("prices each plan by term from offer.ts", () => {
    expect(planCard("practice", "month").price).toBe(`$${PRACTICE_PLAN.monthly}`);
    expect(planCard("practice", "quarter").price).toBe(`$${PRACTICE_PLAN.threeMonths}`);
    expect(planCard("pro", "month").price).toBe(`$${PRO_PLAN.monthly}`);
    expect(planCard("pro", "quarter").per).toBe("for 3 months");
  });

  it("counts exams and questions from offer.ts", () => {
    expect(planCard("pro", "month").lines.join(" ")).toContain(String(QUESTION_BANK.proTests));
    expect(planCard("practice", "month").lines.join(" ")).toContain(
      String(QUESTION_BANK.practiceTests)
    );
  });

  it("sends each plan to checkout with its term", () => {
    expect(checkoutHref("pro", "quarter")).toBe("/checkout/start?plan=pro&term=quarter");
  });
});
