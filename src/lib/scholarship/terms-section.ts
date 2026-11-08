// ============================================================
// The "Cohort Scholarship" section of the Terms of Service.
// Every number comes from COHORT_SCHOLARSHIP in
// src/lib/marketing/offer.ts, so the terms, the upload page and
// the payout always agree.
// CONFIRM: lawyer review before launch.
// ============================================================

import { COHORT_SCHOLARSHIP as S, formatPrice } from "@/lib/marketing/offer";

export const SCHOLARSHIP_TERMS_SECTION = {
  id: "cohort-scholarship",
  title: "12. Cohort Scholarship",
  content: `Every 9-week cohort awards one merit scholarship of ${formatPrice(S.amount)} to the eligible student with the highest SAT total score, shared equally in a tie. It is paid as a refund of the cohort price (${formatPrice(S.refund)}) plus a merit bonus for the rest (${formatPrice(S.meritBonus)}).`,
  list: [
    "Who can win: a student enrolled in the cohort whose family paid the cohort price in full, or every installment on time, and who did not withdraw or receive a refund for that cohort.",
    `Which score counts: one SAT total score from a single test date, taken on or after the cohort's first class and no later than ${S.satWithinDays} days after its last class. Superscores, PSAT scores and practice tests, including Karman's, do not count.`,
    `How to apply: upload the College Board score report (PDF) from your Karman account within ${S.claimDays} days of the scores being released. The name on the report must match the student's Karman account.`,
    "How we check: Karman checks every report automatically and by hand, and may ask the student to show the score in their College Board account on a video call. A changed or made-up report disqualifies the student and may close the account.",
    `Ties: if eligible students share the top total score, they split the scholarship equally (${formatPrice(S.amount / 2)} each when two students tie). Each share is paid the same way: first as a refund of what the family paid for the cohort, and any rest as a bonus.`,
    `Payment: within ${S.payWithinDays} days of approval, Karman refunds the cohort price to the original payment method and sends the merit bonus to the parent or guardian who paid for the cohort by bank transfer. A student who receives the scholarship cannot also claim the score guarantee or any other refund for the same cohort.`,
    "One scholarship per cohort and one per student. It cannot be transferred or exchanged before it is awarded. Any taxes on the award are the family's responsibility.",
    "Karman may change or end the scholarship for future cohorts with notice. A change never applies to a cohort that has already started.",
  ],
};
