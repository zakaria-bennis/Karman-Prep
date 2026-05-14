// ============================================================
// recommendTier — picks the right Karman plan based on the
// pre-payment questionnaire responses.
//
// Design philosophy:
//   · Don't ask "do you want a small group or 1-on-1?" — that
//     just hands the user the recommendation. Instead infer the
//     amount of attention they actually need from a battery of
//     diagnostic questions (study independence, learning pace,
//     prior-prep result, score gap vs time, etc).
//   · Recommend the LOWEST attention level that fits. Don't
//     up-sell to Elite by default.
//   · ALL plans include live tutoring. The differentiator is
//     how much PERSONAL attention the student gets per session.
//   · Two billing models exist: subscription (Seminar, Elite)
//     and per-session (Small Group, Private). Use the user's
//     stated preference to pick the right tier within the
//     attention bracket.
//
// Tier matrix:
//                  | Subscription   | Per-session
//   Low attention  | Seminar        | Small Group
//   High attention | Elite          | Private
// ============================================================

import type { SubscriptionTier } from "@/types";

export type Independence = "on_my_own" | "with_checkins" | "needs_structure";
export type LearningPace = "quick" | "average" | "slower";
export type PriorPrepResult = "first_time" | "worked" | "didnt_move";
export type BillingPreference = "subscription" | "per_session";

export interface RecommendationInput {
  /** Weeks until the student's planned SAT date. Pass null when
   *  they haven't picked a date yet — we'll assume a comfortable
   *  6-month runway. */
  weeksToTest: number | null;
  /** Student's goal SAT score (400-1600). */
  goalScore: number;
  /** Student's most-recent SAT or PSAT total. Pass null if they
   *  haven't taken either — we'll assume the lower bound. */
  baselineScore: number | null;
  /** Self-reported study hours per week the student can commit (1-25). */
  hoursPerWeek: number;
  /** How well the student stays on track without external structure. */
  independence: Independence;
  /** How fast the student typically picks up new material. */
  pace: LearningPace;
  /** Prior test-prep history + outcome. */
  priorPrep: PriorPrepResult;
  /** Subscription vs per-session billing preference. */
  billingPreference: BillingPreference;
}

export interface Recommendation {
  tier: SubscriptionTier;
  /** One-sentence headline shown above the reasoning. */
  headline: string;
  /** 2-3 sentence reasoning grounded in the student's inputs. */
  why: string;
  /** Surfaced as "We also considered ..." so the student knows
   *  we evaluated alternatives. */
  alsoConsidered?: { tier: SubscriptionTier; reason: string };
  /** The signals the engine actually used — surfaced in the UI
   *  as bullet points so the student can see WHY this tier was
   *  picked, not just trust us. */
  signals: string[];
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  group: "Seminar",
  small_group: "Small Group",
  private: "Private",
  elite: "Elite",
};

export function tierLabel(tier: SubscriptionTier): string {
  return TIER_LABELS[tier];
}

// ─────────────────────────────────────────────────────────────
// Attention-need scoring
// ─────────────────────────────────────────────────────────────
//
// Each question contributes points. Higher total = the student
// needs more personal attention per session. Then a threshold
// maps the score to one of two attention brackets, and the
// billing preference picks the actual tier.

interface ScoreBreakdown {
  points: number;
  signal: string | null;
}

function scoreGap(input: RecommendationInput): ScoreBreakdown {
  const baseline = input.baselineScore ?? 1000;
  const gap = Math.max(0, input.goalScore - baseline);
  if (gap >= 200)
    return { points: 3, signal: `Closing a ${gap}-point gap to your goal — big lift.` };
  if (gap >= 130) return { points: 2, signal: `A ${gap}-point goal is a substantial improvement.` };
  if (gap >= 80) return { points: 1, signal: `A ${gap}-point bump is moderate but real work.` };
  return {
    points: 0,
    signal: input.baselineScore
      ? `Only a ${gap}-point bump from your last score — small lift.`
      : null,
  };
}

function scoreTime(input: RecommendationInput): ScoreBreakdown {
  if (input.weeksToTest == null) return { points: 0, signal: null };
  const w = input.weeksToTest;
  if (w <= 6)
    return { points: 3, signal: `Only ${w} weeks until test day — every session has to count.` };
  if (w <= 12) return { points: 2, signal: `${w} weeks until test day — tight runway.` };
  if (w <= 20)
    return { points: 1, signal: `${w} weeks until test day — workable but no time to waste.` };
  return { points: 0, signal: `${w} weeks until test day — plenty of runway.` };
}

function scoreIndependence(input: RecommendationInput): ScoreBreakdown {
  switch (input.independence) {
    case "needs_structure":
      return {
        points: 3,
        signal: "Self-reported struggle to stick to a study plan without accountability.",
      };
    case "with_checkins":
      return { points: 1, signal: "Does best with regular check-ins from a tutor." };
    case "on_my_own":
      return { points: 0, signal: "Strong independent worker — can drive own prep." };
  }
}

function scorePace(input: RecommendationInput): ScoreBreakdown {
  switch (input.pace) {
    case "slower":
      return {
        points: 2,
        signal: "Prefers to work through new material multiple ways before it sticks.",
      };
    case "average":
      return { points: 1, signal: "Picks up new material at a typical pace." };
    case "quick":
      return {
        points: 0,
        signal: "Picks up new material quickly — first explanation usually does it.",
      };
  }
}

function scorePriorPrep(input: RecommendationInput): ScoreBreakdown {
  switch (input.priorPrep) {
    case "didnt_move":
      return {
        points: 2,
        signal:
          "Has tried prep before, and it didn't move the needle — needs a different approach.",
      };
    case "worked":
      return { points: 0, signal: "Prior prep worked — knows how to study for this test." };
    case "first_time":
      return { points: 0, signal: null };
  }
}

function scoreHours(input: RecommendationInput): ScoreBreakdown {
  if (input.hoursPerWeek < 3) {
    return {
      points: 1,
      signal: `Only ~${input.hoursPerWeek} hr/week to study — needs the most efficient time on task possible.`,
    };
  }
  return { points: 0, signal: null };
}

// ─────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────

export function recommendTier(input: RecommendationInput): Recommendation {
  const breakdowns = [
    scoreGap(input),
    scoreTime(input),
    scoreIndependence(input),
    scorePace(input),
    scorePriorPrep(input),
    scoreHours(input),
  ];
  const totalPoints = breakdowns.reduce((s, b) => s + b.points, 0);
  const signals = breakdowns.filter((b) => b.signal !== null).map((b) => b.signal!) as string[];

  // Threshold — `>=5` triggers high-attention. Tuned so that a
  // student with a moderate gap + average pace + independent
  // study habits stays in low-attention (Seminar / Small Group).
  // High-attention requires multiple stress signals stacking.
  const highAttention = totalPoints >= 5;

  if (highAttention) {
    if (input.billingPreference === "subscription") {
      return {
        tier: "elite",
        headline: "Elite is the right call for you.",
        why:
          "You need significant 1-on-1 attention with a tutor who knows your prep inside and out. " +
          "Elite gives you 8 dedicated sessions a month with a specialist who builds your study plan " +
          "around your test date, billed as a predictable monthly subscription.",
        alsoConsidered: {
          tier: "private",
          reason:
            "Private also gives you 1-on-1, but you'd be self-pacing and paying per session. " +
            "Pick that if you'd rather have flexibility over a fixed cadence.",
        },
        signals,
      };
    }
    return {
      tier: "private",
      headline: "Private 1-on-1 is the right fit.",
      why:
        "You need real per-session attention from a tutor working only with you, and you'd rather " +
        "pay per session than commit to a subscription. Private gives you weekly 1-on-1 sessions, " +
        "booked when you're ready to work.",
      alsoConsidered: {
        tier: "elite",
        reason:
          "If you'd rather lock in 8 sessions a month and have a single dedicated specialist, Elite " +
          "is the same 1-on-1 experience on a monthly subscription.",
      },
      signals,
    };
  }

  // Low / moderate attention.
  if (input.billingPreference === "subscription") {
    return {
      tier: "group",
      headline: "Start with Seminar.",
      why:
        "You don't need heavy 1-on-1 attention to hit your goal — you'll do well with the full " +
        "curriculum library plus live cohort sessions led by a tutor. Seminar is the most " +
        "cost-effective subscription that still gives you regular live instruction.",
      alsoConsidered: {
        tier: "small_group",
        reason:
          "Move up to Small Group if you'd rather have a tutor running tighter live sessions with " +
          "just a handful of students — billed per session instead of monthly.",
      },
      signals,
    };
  }
  return {
    tier: "small_group",
    headline: "Small Group strikes the right balance.",
    why:
      "You don't need 1-on-1 attention, but you do want a tutor running each session live with " +
      "just a few other students. Small Group caps at five students per Zoom and is billed per " +
      "session, so you only pay for what you use.",
    alsoConsidered: {
      tier: "group",
      reason:
        "Seminar is a cheaper monthly subscription if you'd rather commit to a fixed cost — same " +
        "curriculum library, just larger live cohorts.",
    },
    signals,
  };
}
