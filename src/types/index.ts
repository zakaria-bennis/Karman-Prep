// ============================================================
// Karman — Global TypeScript Types
// Mirrors the Supabase database schema + app-level types.
// ============================================================

import { z } from "zod";

// ---- Database Row Types ----------------------------------------

/** A platform user — synced from Clerk on first sign-in */
export interface User {
  id: string;
  clerk_id: string;
  role: "student" | "tutor" | "parent";
  email: string;
  created_at: string;
  sat_test_date: string | null;
}

/** A renewing plan (Practice, Pro or Tutor affiliate), kept in step with
 *  Stripe by /api/stripe/webhook. One-time purchases are plan grants. */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_id: "practice" | "pro" | "tutor-affiliate";
  billing_term: "month" | "quarter";
  status: SubscriptionStatus;
  current_period_end: string | null;
}

/** The old delivery tiers, still used by booking and cohort scheduling
 *  (`bookings.plan_tier`, `cohorts.tier`). Not a billing plan. */
export type SubscriptionTier = "group" | "small_group" | "private" | "elite";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "canceled";

/** SAT concept node — displayed on the curriculum graph */
export interface Concept {
  id: string;
  title: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3; // 1 = beginner, 3 = hard
  prerequisite_ids: string[];
  node_position_x: number;
  node_position_y: number;
}

/** Student progress on a specific concept */
export interface Progress {
  id: string;
  user_id: string;
  concept_id: string;
  status: ProgressStatus;
  quiz_score: number | null; // 0–100
  last_visited: string | null;
}

export type ProgressStatus = "locked" | "available" | "in_progress" | "mastered";

/** Results from a diagnostic assessment */
export interface DiagnosticResult {
  id: string;
  user_id: string;
  taken_at: string;
  score_range_low: number;
  score_range_high: number;
  domain_scores: DomainScores; // JSONB
  weak_concepts: string[]; // concept IDs
}

/** Per-domain scores (used in DiagnosticResult and UI).
 *  Mirrors the 8 official Digital SAT domains — 4 Math, 4 R&W.
 *  All values are difficulty-weighted percentages (0-100).
 *
 *  Type is DERIVED from `domainScoresSchema` below so a single
 *  source of truth governs both compile-time + runtime validation
 *  when reading the `diagnostic_results.domain_scores` jsonb column. */
export const domainScoresSchema = z.object({
  // Math — College Board's 4 Math domains
  algebra: z.number(),
  advanced_math: z.number(),
  geometry: z.number(), // "Geometry & Trig" on the Bluebook score report
  data_analysis: z.number(), // "Problem-Solving & Data Analysis"
  // Reading & Writing — College Board's 4 R&W domains
  info_ideas: z.number(), // Information & Ideas
  craft_structure: z.number(), // Craft & Structure
  expression_ideas: z.number(), // Expression of Ideas
  conventions: z.number(), // Standard English Conventions
});
export type DomainScores = z.infer<typeof domainScoresSchema>;

/** A practice or diagnostic question */
export interface Question {
  id: string;
  concept_id: string | null;
  question_text: string;
  options: string[]; // Always 4 options (A–D)
  correct_answer: string; // "A" | "B" | "C" | "D"
  difficulty: 1 | 2 | 3;
  domain: SATDomain;
}

// ---- Domain / Color System ----------------------------------------

export type SATDomain =
  | "algebra"
  | "advanced_math"
  | "geometry"
  | "data_analysis"
  | "info_ideas"
  | "craft_structure"
  | "expression_ideas"
  | "conventions";

/** Which SAT section a domain belongs to. Used by the predicted-score
 *  pipeline to roll 8 domain scores into Math + R&W section sub-scores. */
export const DOMAIN_SECTION: Record<SATDomain, "math" | "rw"> = {
  algebra: "math",
  advanced_math: "math",
  geometry: "math",
  data_analysis: "math",
  info_ideas: "rw",
  craft_structure: "rw",
  expression_ideas: "rw",
  conventions: "rw",
};

/** Tailwind color classes for each SAT domain */
export const DOMAIN_COLORS: Record<
  SATDomain,
  { bg: string; text: string; border: string; hex: string }
> = {
  algebra: {
    bg: "bg-info",
    text: "text-info",
    border: "border-info/40",
    hex: "#2FA8FF",
  },
  advanced_math: {
    bg: "bg-gold",
    text: "text-gold",
    border: "border-gold/40",
    hex: "#C8AB6A",
  },
  geometry: {
    bg: "bg-success",
    text: "text-success",
    border: "border-success/40",
    hex: "#2FA8FF",
  },
  data_analysis: {
    bg: "bg-warning",
    text: "text-warning",
    border: "border-warning/40",
    hex: "#E0A24A",
  },
  info_ideas: {
    bg: "bg-error",
    text: "text-error",
    border: "border-error/40",
    hex: "#F06A8C",
  },
  craft_structure: {
    bg: "bg-error",
    text: "text-error",
    border: "border-error/40",
    hex: "#D84F73",
  },
  expression_ideas: {
    bg: "bg-gold",
    text: "text-gold",
    border: "border-gold/40",
    hex: "#D84F73",
  },
  conventions: {
    bg: "bg-gold",
    text: "text-gold",
    border: "border-gold/40",
    hex: "#42D9FF",
  },
};

export const DOMAIN_LABELS: Record<SATDomain, string> = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  geometry: "Geometry & Trig",
  data_analysis: "Problem-Solving & Data",
  info_ideas: "Information & Ideas",
  craft_structure: "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
};
