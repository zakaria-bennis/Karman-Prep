import { describe, expect, it, vi } from "vitest";
import { PLAN_ENTITLEMENTS, type PlanId } from "@/lib/plans/catalog";
import { quizAccessFor } from "./plan-gate";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    throw new Error("pure tests only");
  },
}));

const plan = (id: PlanId) => ({ entitlements: PLAN_ENTITLEMENTS[id] });
const used = (questionsAnswered: number, fullLengthTestsCompleted = 0) => ({
  questionsAnswered,
  fullLengthTestsCompleted,
});

describe("quiz access comes from src/lib/plans", () => {
  it("opens the core pool to Free, Practice and school seats, and every question to Pro plans", () => {
    for (const id of ["free", "practice", "school"] as const)
      expect(quizAccessFor(plan(id), used(0)).maxDifficulty).toBe(5);
    for (const id of ["pro", "cohort", "private-10", "private-20", "tutor-affiliate"] as const)
      expect(quizAccessFor(plan(id)).maxDifficulty).toBe(7);
  });

  it("counts down Free's 100 questions and stops at zero", () => {
    expect(quizAccessFor(plan("free"), used(0)).questionsLeft).toBe(100);
    expect(quizAccessFor(plan("free"), used(97)).questionsLeft).toBe(3);
    expect(quizAccessFor(plan("free"), used(140)).questionsLeft).toBe(0);
  });

  it("gives paid plans no question limit", () => {
    expect(quizAccessFor(plan("practice")).questionsLeft).toBeNull();
    expect(quizAccessFor(plan("pro")).questionsLeft).toBeNull();
  });

  it("lets Free start one full-length test until one is finished", () => {
    expect(quizAccessFor(plan("free"), used(0, 0)).canStartFullTest).toBe(true);
    expect(quizAccessFor(plan("free"), used(0, 1)).canStartFullTest).toBe(false);
  });

  it("refuses Free a full-length test when usage could not be read", () => {
    expect(quizAccessFor(plan("free")).canStartFullTest).toBe(false);
  });

  it("never limits full-length tests on paid plans", () => {
    expect(quizAccessFor(plan("practice")).canStartFullTest).toBe(true);
    expect(quizAccessFor(plan("cohort")).canStartFullTest).toBe(true);
  });
});
