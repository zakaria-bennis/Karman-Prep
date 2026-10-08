import { GUARANTEE_POLICY } from "@/lib/guarantee/policy";

/**
 * Prospective checkout eligibility rules approved by the product owner.
 * Keep this separate from historical subscriptions and customer billing state.
 */
export function isFreeTrialEligibleTier(tier: string): boolean {
  // The owner-approved seven-day trial applies only to the cheapest/bottom tier.
  return (GUARANTEE_POLICY.trial.eligibleTierIds as readonly string[]).includes(tier);
}
