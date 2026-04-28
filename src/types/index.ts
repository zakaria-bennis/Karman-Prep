// ============================================================
// Karman — Global TypeScript Types
// Mirrors the Supabase database schema + app-level types.
// ============================================================

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

/** Stripe subscription record */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_end: string | null;
}

export type SubscriptionTier = "group" | "small_group" | "private" | "elite";
export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due" | "incomplete";

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
 *  All values are difficulty-weighted percentages (0-100). */
export interface DomainScores {
  // Math — College Board's 4 Math domains
  algebra: number;
  advanced_math: number;
  geometry: number;            // "Geometry & Trig" on the Bluebook score report
  data_analysis: number;       // "Problem-Solving & Data Analysis"
  // Reading & Writing — College Board's 4 R&W domains
  info_ideas: number;          // Information & Ideas
  craft_structure: number;     // Craft & Structure
  expression_ideas: number;    // Expression of Ideas
  conventions: number;         // Standard English Conventions
}

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
export const DOMAIN_COLORS: Record<SATDomain, { bg: string; text: string; border: string; hex: string }> = {
  algebra: {
    bg: "bg-blue-500",
    text: "text-blue-500",
    border: "border-blue-500",
    hex: "#3B82F6",
  },
  advanced_math: {
    bg: "bg-purple-500",
    text: "text-purple-500",
    border: "border-purple-500",
    hex: "#A855F7",
  },
  geometry: {
    bg: "bg-teal-500",
    text: "text-teal-500",
    border: "border-teal-500",
    hex: "#14B8A6",
  },
  data_analysis: {
    bg: "bg-amber-500",
    text: "text-amber-500",
    border: "border-amber-500",
    hex: "#F59E0B",
  },
  info_ideas: {
    bg: "bg-rose-400",
    text: "text-rose-400",
    border: "border-rose-400",
    hex: "#FB7185",
  },
  craft_structure: {
    bg: "bg-pink-500",
    text: "text-pink-500",
    border: "border-pink-500",
    hex: "#EC4899",
  },
  expression_ideas: {
    bg: "bg-fuchsia-500",
    text: "text-fuchsia-500",
    border: "border-fuchsia-500",
    hex: "#D946EF",
  },
  conventions: {
    bg: "bg-indigo-400",
    text: "text-indigo-400",
    border: "border-indigo-400",
    hex: "#818CF8",
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

// ---- Subscription Tiers ----------------------------------------

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  bestValue?: boolean;
  stripePriceEnvKey: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "group",
    name: "Seminar",                         // #10 renamed Group → Seminar
    price: "$40",
    period: "/month",
    description: "Full curriculum access and live seminar-style group sessions to keep you on track.",
    features: [
      "Access to full curriculum library (100+ lessons)",
      "Live seminar-style group sessions with your cohort", // #5 removed 15-student cap
      "Personalized diagnostic assessment",
      "Progress tracking dashboard",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    stripePriceEnvKey: "STRIPE_PRICE_GROUP_MONTHLY",
  },
  {
    id: "small_group",
    name: "Small Group",
    price: "$60",
    period: "/person/session",
    description: "Live sessions with a small cohort for focused, tutor-led instruction.",
    features: [
      "Live Zoom sessions with max 5 students",
      "Targeted concept review each session",
      "Session recap and next steps via email",
      "Progress tracking dashboard",
      "Direct access to your tutor",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    stripePriceEnvKey: "STRIPE_PRICE_SMALL_GROUP",
  },
  {
    id: "private",
    name: "Private",
    price: "$135",
    period: "/session",
    description: "One-on-one tutoring sessions, booked as you go.",
    features: [
      "Weekly 1-on-1 private tutoring session",
      "Fully personalized study plan",
      "Session recordings",
      "Full curriculum library access",
      "Progress tracking",
      // #9 "Parent progress reports" removed
    ],
    cta: "Book a Session",
    highlighted: false,
    stripePriceEnvKey: "STRIPE_PRICE_PRIVATE",
  },
  {
    id: "elite",
    name: "Elite",
    price: "$800",
    period: "/month",
    description: "8 private sessions per month with a dedicated elite SAT specialist.",
    features: [
      "8 private 1-on-1 sessions per month",
      "Dedicated elite SAT specialist",              // #12 removed founder names
      "Custom study plan built around your test date",
      "50-point score improvement guarantee",
      "24/7 priority support via text",
      "Parent progress reports",
      "Full curriculum library access",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    bestValue: true,                                  // #11 Best Value badge
    stripePriceEnvKey: "STRIPE_PRICE_ELITE_MONTHLY",
  },
];
