// ============================================================
// computePayoutAmount — single source of truth for tutor pay.
//
// Decision (locked 2026-05-04, refined 2026-05-10):
//   · Pay = paid_hours × hourly_rate
//   · paid_hours = floor(duration_minutes / 15) × 15 / 60
//   · Default hourly_rate = $35 (set on users.hourly_rate)
//
// Examples:
//   60 min → 1.00 h → $35.00
//   65 min → 1.00 h → $35.00   (5-min overage doesn't pay)
//   75 min → 1.25 h → $43.75
//   89 min → 1.25 h → $43.75   (still rounds down to 75)
//   90 min → 1.50 h → $52.50
//   105 min → 1.75 h → $61.25
//   120 min → 2.00 h → $70.00
//   45 min → 0.75 h → $26.25   (short sessions paid pro-rata)
//   55 min → 0.75 h → $26.25
//
// All money is rounded to 2 decimal places at the end.
// ============================================================

const DEFAULT_HOURLY_RATE = 35;
const INCREMENT_MINUTES = 15;

export interface PayoutBreakdown {
  /** Raw session length in minutes. */
  rawMinutes: number;
  /** Minutes after rounding down to the nearest 15-min increment. */
  paidMinutes: number;
  /** Paid hours (paidMinutes / 60). 2 decimal places. */
  paidHours: number;
  /** Hourly rate applied. */
  hourlyRate: number;
  /** Final payout in USD, 2 decimal places. */
  payoutAmount: number;
}

export function computePayout(
  durationMinutes: number | null | undefined,
  hourlyRate: number | null | undefined
): PayoutBreakdown {
  const rawMinutes = Math.max(0, Math.round(durationMinutes ?? 0));
  const paidMinutes = Math.floor(rawMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
  const paidHours = Number((paidMinutes / 60).toFixed(2));
  const rate = hourlyRate ?? DEFAULT_HOURLY_RATE;
  const payoutAmount = Number((paidHours * rate).toFixed(2));
  return { rawMinutes, paidMinutes, paidHours, hourlyRate: rate, payoutAmount };
}

/** Convenience for places that just need the dollar amount. */
export function computePayoutAmount(
  durationMinutes: number | null | undefined,
  hourlyRate: number | null | undefined
): number {
  return computePayout(durationMinutes, hourlyRate).payoutAmount;
}
