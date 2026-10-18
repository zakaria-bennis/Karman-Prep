/**
 * Versioned prospective guarantee policy. Changes here must be reflected in
 * public disclosures and reviewed before an offer is added to an eligible ID
 * list. No current checkout offer is allowlisted.
 */
export const GUARANTEE_POLICY = {
  version: "2026-10-08-v1",
  supportEmail: "billing@karmanprep.com",
  trial: {
    days: 7,
    eligibleTierIds: ["group"] as const,
  },
  outcome: {
    title: "12-Week Course-Fee Protection",
    instructionalWeeks: 12,
    baselineLookbackMonths: 12,
    excludedBaselineScore: 1600,
    homeworkCompletionPercent: 90,
    postPlanTestWindowDays: 60,
    claimWindowCalendarDays: 30,
    claimAcknowledgmentBusinessDays: 5,
    claimDecisionBusinessDaysAfterComplete: 10,
    eligibleOfferIds: [] as readonly string[],
  },
  firstSessionFit: {
    requestWindowHours: 48,
    replacementMinutes: 60,
    requireRequestBeforeSecondPaidSession: true,
    eligibleOfferIds: [] as readonly string[],
  },
} as const;

export type OfficialBaselineEvidence = {
  isOfficialSat: boolean | null;
  isMostRecentOfficialScore: boolean | null;
  totalScore: number;
  testDate: string;
  purchaseDate: string;
  firstTeachingDate: string;
  suppliedBeforeTeaching: boolean | null;
  eligibilityDisclosedBeforePurchase: boolean | null;
};

export function isQualifyingBaseline(evidence: OfficialBaselineEvidence): boolean {
  const testDate = parseDateOnly(evidence.testDate);
  const purchaseDate = parseDateOnly(evidence.purchaseDate);
  const teachingDate = parseDateOnly(evidence.firstTeachingDate);
  if (!testDate || !purchaseDate || !teachingDate) return false;

  const earliest = subtractUtcMonths(teachingDate, GUARANTEE_POLICY.outcome.baselineLookbackMonths);
  return (
    evidence.isOfficialSat === true &&
    evidence.isMostRecentOfficialScore === true &&
    evidence.suppliedBeforeTeaching === true &&
    evidence.eligibilityDisclosedBeforePurchase === true &&
    Number.isInteger(evidence.totalScore) &&
    evidence.totalScore >= 400 &&
    evidence.totalScore < GUARANTEE_POLICY.outcome.excludedBaselineScore &&
    testDate >= earliest &&
    testDate <= purchaseDate &&
    purchaseDate <= teachingDate
  );
}

export type OutcomeOfferEvidence = {
  offerId: string;
  subject: "SAT" | "other";
  planType: "one_to_one" | "group";
  instructionalWeeks: number;
  courseFeeCentsAfterDiscounts: number;
  courseFeeSeparatelyDisclosedBeforePurchase: boolean;
  courseFeeActuallyPaid: boolean;
  baseline: OfficialBaselineEvidence;
};

export function isCoveredOutcomeOffer(
  offer: OutcomeOfferEvidence,
  eligibleOfferIds: readonly string[] = GUARANTEE_POLICY.outcome.eligibleOfferIds
): boolean {
  return (
    eligibleOfferIds.includes(offer.offerId) &&
    offer.subject === "SAT" &&
    offer.planType === "one_to_one" &&
    offer.instructionalWeeks === GUARANTEE_POLICY.outcome.instructionalWeeks &&
    Number.isInteger(offer.courseFeeCentsAfterDiscounts) &&
    offer.courseFeeCentsAfterDiscounts > 0 &&
    offer.courseFeeSeparatelyDisclosedBeforePurchase &&
    offer.courseFeeActuallyPaid &&
    isQualifyingBaseline(offer.baseline)
  );
}

export function isOutcomeRefundEligible(baselineScore: number, finalScore: number): boolean {
  return (
    Number.isInteger(baselineScore) &&
    baselineScore >= 400 &&
    baselineScore < GUARANTEE_POLICY.outcome.excludedBaselineScore &&
    Number.isInteger(finalScore) &&
    finalScore >= 400 &&
    finalScore <= baselineScore
  );
}

export type PlanCompletionEvidence = {
  writtenPlanBeforeTeaching: boolean | null;
  completedInstructionalWeeks: number | null;
  agreedOneToOneHours: number | null;
  completedOneToOneHoursIncludingApprovedMakeups: number | null;
  requiredHomeworkCount: number | null;
  goodFaithOnTimeHomeworkCount: number | null;
  specifiedFullLengthTests: number | null;
  completedSpecifiedFullLengthTests: number | null;
  approvedPauseDays: number | null;
  documentedException: boolean | null;
};

export type PlanCompletionResult = "eligible" | "ineligible" | "human_review";

export function evaluatePlanCompletion(evidence: PlanCompletionEvidence): PlanCompletionResult {
  if (
    evidence.writtenPlanBeforeTeaching == null ||
    evidence.documentedException == null ||
    evidence.completedInstructionalWeeks == null ||
    evidence.agreedOneToOneHours == null ||
    evidence.completedOneToOneHoursIncludingApprovedMakeups == null ||
    evidence.requiredHomeworkCount == null ||
    evidence.goodFaithOnTimeHomeworkCount == null ||
    evidence.specifiedFullLengthTests == null ||
    evidence.completedSpecifiedFullLengthTests == null ||
    evidence.approvedPauseDays == null
  ) {
    return "human_review";
  }
  if (evidence.documentedException) return "human_review";

  const counts = [
    evidence.completedInstructionalWeeks,
    evidence.agreedOneToOneHours,
    evidence.completedOneToOneHoursIncludingApprovedMakeups,
    evidence.requiredHomeworkCount,
    evidence.goodFaithOnTimeHomeworkCount,
    evidence.specifiedFullLengthTests,
    evidence.completedSpecifiedFullLengthTests,
    evidence.approvedPauseDays,
  ];
  const hasInconsistentCounts =
    counts.some((value) => !Number.isInteger(value) || value < 0) ||
    evidence.goodFaithOnTimeHomeworkCount > evidence.requiredHomeworkCount ||
    evidence.completedSpecifiedFullLengthTests > evidence.specifiedFullLengthTests;
  if (hasInconsistentCounts) return "human_review";

  if (
    !evidence.writtenPlanBeforeTeaching ||
    evidence.completedInstructionalWeeks < GUARANTEE_POLICY.outcome.instructionalWeeks ||
    evidence.agreedOneToOneHours <= 0 ||
    evidence.completedOneToOneHoursIncludingApprovedMakeups < evidence.agreedOneToOneHours ||
    evidence.completedSpecifiedFullLengthTests < evidence.specifiedFullLengthTests
  ) {
    return "ineligible";
  }
  const minimumHomework = Math.ceil(
    (evidence.requiredHomeworkCount * GUARANTEE_POLICY.outcome.homeworkCompletionPercent) / 100
  );
  return evidence.goodFaithOnTimeHomeworkCount >= minimumHomework ? "eligible" : "ineligible";
}

export type PostPlanTestEvidence = {
  testDate: string;
  planCompletionDate: string;
  isOfficialSat: boolean | null;
  isFirstOfficialSittingAfterPlan: boolean | null;
  isNextOfferedAdministration: boolean;
  noAdministrationInWindow: boolean;
  registeredTestWasCancelled: boolean;
};

export function evaluatePostPlanTest(input: PostPlanTestEvidence): PlanCompletionResult {
  if (input.isOfficialSat == null || input.isFirstOfficialSittingAfterPlan == null) {
    return "human_review";
  }
  if (!input.isOfficialSat || !input.isFirstOfficialSittingAfterPlan) return "ineligible";
  const testDate = parseDateOnly(input.testDate);
  const completion = parseDateOnly(input.planCompletionDate);
  if (!testDate || !completion) return "human_review";
  if (testDate < completion) return "ineligible";
  const lastDay = new Date(completion);
  lastDay.setUTCDate(lastDay.getUTCDate() + GUARANTEE_POLICY.outcome.postPlanTestWindowDays);
  return testDate <= lastDay ||
    (input.isNextOfferedAdministration &&
      (input.noAdministrationInWindow || input.registeredTestWasCancelled))
    ? "eligible"
    : "ineligible";
}

/** Predicate for callers that already route missing evidence to human review. */
export function isQualifyingPostPlanTest(input: PostPlanTestEvidence): boolean {
  return evaluatePostPlanTest(input) === "eligible";
}

export function isClaimWithinWindow(scoreAvailableDate: string, claimDate: string): boolean {
  const available = parseDateOnly(scoreAvailableDate);
  const claim = parseDateOnly(claimDate);
  if (!available || !claim || claim < available) return false;
  const deadline = new Date(available);
  deadline.setUTCDate(deadline.getUTCDate() + GUARANTEE_POLICY.outcome.claimWindowCalendarDays);
  return claim <= deadline;
}

export type FitRequestEvidence = {
  offerId: string;
  format: "group" | "private";
  firstSessionEndedAt: string;
  requestReceivedAt: string;
  secondPaidSessionAt: string | null;
  firstSessionFeeCents: number;
  firstSessionFeeSeparatelyDisclosed: boolean;
  firstSessionFeePaid: boolean;
  resolution: "free_replacement" | "refund";
  priorFitRemedyUsed: boolean;
};

export function isEligibleFirstSessionFitRequest(
  evidence: FitRequestEvidence,
  eligibleOfferIds: readonly string[] = GUARANTEE_POLICY.firstSessionFit.eligibleOfferIds
): boolean {
  const ended = Date.parse(evidence.firstSessionEndedAt);
  const requested = Date.parse(evidence.requestReceivedAt);
  const secondPaidSession = evidence.secondPaidSessionAt
    ? Date.parse(evidence.secondPaidSessionAt)
    : null;
  if (!Number.isFinite(ended) || !Number.isFinite(requested)) return false;
  return (
    eligibleOfferIds.includes(evidence.offerId) &&
    (evidence.format === "group" || evidence.format === "private") &&
    Number.isInteger(evidence.firstSessionFeeCents) &&
    evidence.firstSessionFeeCents > 0 &&
    evidence.firstSessionFeeSeparatelyDisclosed &&
    evidence.firstSessionFeePaid &&
    requested >= ended &&
    requested - ended <= GUARANTEE_POLICY.firstSessionFit.requestWindowHours * 60 * 60 * 1000 &&
    (!secondPaidSession || requested < secondPaidSession) &&
    !evidence.priorFitRemedyUsed &&
    (evidence.resolution === "free_replacement" || evidence.resolution === "refund")
  );
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function subtractUtcMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const dayOfMonth = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return result;
}
