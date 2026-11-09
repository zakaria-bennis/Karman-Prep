// ============================================================
// Display names and caps for the scheduling codes still stored on
// `bookings.plan_tier` and `cohorts.tier`: group, small_group,
// private, elite. Those codes predate the plan ladder in
// src/lib/marketing/offer.ts (founder, 2026-11-08) and stay until
// the database is renamed. Never show a code, or an old plan name,
// to anyone: always go through tierLabel().
// ============================================================

import { MARCH_PROGRAM } from "@/lib/marketing/offer";

export type SchedulingTier = "group" | "small_group" | "private" | "elite";

const TIER_LABELS: Record<SchedulingTier, string> = {
  small_group: "Cohort",
  group: "Weekly live session",
  private: "Private tutoring",
  elite: "Private tutoring",
};

export function tierLabel(tier: SchedulingTier): string {
  return TIER_LABELS[tier];
}

/** For values read as plain strings (e.g. `subscriptions.tier`): the label
 *  for a scheduling code, otherwise the value unchanged. */
export function tierLabelOf(value: string): string {
  return Object.prototype.hasOwnProperty.call(TIER_LABELS, value)
    ? TIER_LABELS[value as SchedulingTier]
    : value;
}

/** Most students a cohort row may hold. The cohort (small_group) seats
 *  MARCH_PROGRAM.paidSeats; the database constraint
 *  `cohort_size_within_tier_cap` (migration 20261108120000) must match. */
export const COHORT_TIER_CAP: Record<"group" | "small_group", number> = {
  small_group: MARCH_PROGRAM.paidSeats,
  group: 200,
};
