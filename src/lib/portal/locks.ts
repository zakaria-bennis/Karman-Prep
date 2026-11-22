/*
 * The portal's plan gates, as the student sees them (founder, 2026-11-14): Free sees Practice
 * features locked, Practice sees Pro features locked, and a locked thing says Upgrade when it is
 * tapped. The server still enforces every limit (src/lib/plans, src/lib/assembler/plan-gate.ts); this
 * file only decides what the portal shows as locked and which plans the Upgrade sheet offers.
 * Pure, safe on the client. Every figure comes from src/lib/marketing/offer.ts.
 */
import {
  PRACTICE_PLAN,
  PRO_PLAN,
  QUESTION_BANK,
  FREE_PLAN,
  formatPrice,
} from "@/lib/marketing/offer";
import type { PlanId } from "@/lib/plans/catalog";

/** What a student can bump into: the reason the Upgrade sheet is opened. */
export type Locked =
  /** Free's 100 questions are used. */
  | "questions"
  /** Free's one full-length exam is used. */
  | "exam"
  /** Free has no predicted score. */
  | "score"
  /** Free answers one of the two daily challenge questions. */
  | "challenge"
  /** Workshops are for Pro, Cohort and Private. */
  | "workshops"
  /** Opened from Settings, with nothing locked. */
  | "plan";

export type UpgradeTo = "practice" | "pro";

export interface Access {
  questionsLeft: number | null;
  canStartFullTest: boolean;
}

/** The plans a student on `planId` can move up to from the portal: Free to Practice or Pro, a
 *  Practice plan (bought or from a school) to Pro, nothing beyond Pro. */
export function upgradesFor(planId: PlanId): UpgradeTo[] {
  if (planId === "free") return ["practice", "pro"];
  if (planId === "practice" || planId === "school") return ["pro"];
  return [];
}

/** Whether this feature is locked for the student, and so opens the Upgrade sheet. */
export function isLocked(what: Locked, planId: PlanId, access: Access): boolean {
  switch (what) {
    case "questions":
      return access.questionsLeft === 0;
    case "exam":
      return !access.canStartFullTest;
    case "score":
    case "challenge":
      return planId === "free";
    case "workshops":
      return planId === "free" || planId === "practice" || planId === "school";
    case "plan":
      return false;
  }
}

/** The sheet's heading and one line under it, for each reason. */
export function upgradeWords(
  what: Locked,
  offers: readonly UpgradeTo[]
): { title: string; say: string } {
  const both = offers.length > 1;
  const with_ = both ? "Practice or Pro" : "Pro";
  switch (what) {
    case "questions":
      return {
        title: `That's your ${FREE_PLAN.questionLimit} free questions`,
        say: `Keep your streak going with ${with_}.`,
      };
    case "exam":
      return {
        title: "Your free full-length exam is done",
        say: `Practice has ${QUESTION_BANK.practiceTests}. Pro has ${QUESTION_BANK.proTests}.`,
      };
    case "score":
      return {
        title: `Your predicted score comes with ${with_}`,
        say: "Two full-length exams, and it shows on Progress.",
      };
    case "challenge":
      return {
        title: "One challenge question a day on Free",
        say: `${with_} answers both, every day.`,
      };
    case "workshops":
      return {
        title: "Workshops come with Pro",
        say: "Live sessions on the skills students miss most.",
      };
    case "plan":
      return { title: "Upgrade", say: both ? "Pick the plan that fits." : "Everything, with Pro." };
  }
}

export type Term = "month" | "quarter";

/** One plan as the sheet shows it: its name, its price for the chosen term, and what it adds. */
export function planCard(
  to: UpgradeTo,
  term: Term
): {
  name: string;
  price: string;
  per: string;
  lines: string[];
} {
  const plan = to === "pro" ? PRO_PLAN : PRACTICE_PLAN;
  const lines =
    to === "pro"
      ? [
          `${QUESTION_BANK.verifiedCount} questions, the hardest included`,
          "Video explanations as they're recorded",
          `${QUESTION_BANK.proTests} full-length exams`,
          "Your predicted score",
        ]
      : [
          `${QUESTION_BANK.practiceCount.toLocaleString("en-US")} questions`,
          "Written explanations",
          `${QUESTION_BANK.practiceTests} full-length exams`,
          "Your predicted score",
        ];
  return {
    name: plan.name,
    price: formatPrice(term === "month" ? plan.monthly : plan.threeMonths),
    per: term === "month" ? "a month" : "for 3 months",
    lines,
  };
}

/** Where a plan's button goes: checkout, which sends a signed-in student straight to payment. */
export const checkoutHref = (to: UpgradeTo, term: Term) =>
  `/checkout/start?plan=${to}&term=${term}`;
