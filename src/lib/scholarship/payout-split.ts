// ============================================================
// How the $1,500 award is split (pure).
//
// The refund gives back what the family paid for the cohort,
// up to the cohort price and never more than what is still
// refundable. The merit bonus makes up the rest of the award.
// At the $995 price, paid in full: $995 refund + $505 bonus.
// ============================================================

export interface SplitInput {
  awardCents: number;
  cohortPriceCents: number;
  /** What the cohort payment collected. */
  paidCents: number;
  /** Already refunded on that payment by anything other than this claim. */
  refundedElsewhereCents: number;
}

export interface Split {
  refundCents: number;
  bonusCents: number;
}

export function computePayoutSplit(input: SplitInput): Split {
  for (const [k, v] of Object.entries(input)) {
    if (!Number.isInteger(v) || v < 0) throw new Error(`${k} must be a whole, non-negative number`);
  }
  const refundable = Math.max(0, input.paidCents - input.refundedElsewhereCents);
  const refundCents = Math.min(input.cohortPriceCents, refundable, input.awardCents);
  return { refundCents, bonusCents: input.awardCents - refundCents };
}

export function centsToDollars(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
