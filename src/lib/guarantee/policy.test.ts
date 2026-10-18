import { describe, expect, it } from "vitest";
import {
  evaluatePostPlanTest,
  evaluatePlanCompletion,
  isClaimWithinWindow,
  isCoveredOutcomeOffer,
  isEligibleFirstSessionFitRequest,
  isOutcomeRefundEligible,
  isQualifyingBaseline,
  isQualifyingPostPlanTest,
  type OfficialBaselineEvidence,
  type PlanCompletionEvidence,
} from "./policy";

const baseline: OfficialBaselineEvidence = {
  isOfficialSat: true,
  isMostRecentOfficialScore: true,
  totalScore: 1200,
  testDate: "2025-10-15",
  purchaseDate: "2026-10-01",
  firstTeachingDate: "2026-10-10",
  suppliedBeforeTeaching: true,
  eligibilityDisclosedBeforePurchase: true,
};

const plan: PlanCompletionEvidence = {
  writtenPlanBeforeTeaching: true,
  completedInstructionalWeeks: 12,
  agreedOneToOneHours: 12,
  completedOneToOneHoursIncludingApprovedMakeups: 12,
  requiredHomeworkCount: 10,
  goodFaithOnTimeHomeworkCount: 9,
  specifiedFullLengthTests: 2,
  completedSpecifiedFullLengthTests: 2,
  approvedPauseDays: 0,
  documentedException: false,
};

describe("KARMAN guarantee policy boundaries", () => {
  it("accepts only a recent official, pre-purchase, pre-teaching baseline below 1600", () => {
    expect(isQualifyingBaseline(baseline)).toBe(true);
    expect(isQualifyingBaseline({ ...baseline, isOfficialSat: false })).toBe(false);
    expect(isQualifyingBaseline({ ...baseline, suppliedBeforeTeaching: false })).toBe(false);
    expect(isQualifyingBaseline({ ...baseline, eligibilityDisclosedBeforePurchase: false })).toBe(
      false
    );
    expect(isQualifyingBaseline({ ...baseline, isMostRecentOfficialScore: false })).toBe(false);
    expect(isQualifyingBaseline({ ...baseline, totalScore: 1600 })).toBe(false);
    expect(isQualifyingBaseline({ ...baseline, testDate: "2024-10-09" })).toBe(false);
    expect(
      isQualifyingBaseline({
        ...baseline,
        testDate: "2024-02-29",
        purchaseDate: "2025-02-28",
        firstTeachingDate: "2025-02-28",
      })
    ).toBe(true);
    expect(isQualifyingBaseline({ ...baseline, purchaseDate: "2025-10-14" })).toBe(false);
  });

  it("requires the exact one-to-one 12-week itemized paid course offer", () => {
    const eligible = {
      offerId: "future-reviewed-offer",
      subject: "SAT" as const,
      planType: "one_to_one" as const,
      instructionalWeeks: 12,
      courseFeeCentsAfterDiscounts: 25000,
      courseFeeSeparatelyDisclosedBeforePurchase: true,
      courseFeeActuallyPaid: true,
      baseline,
    };
    expect(isCoveredOutcomeOffer(eligible, [eligible.offerId])).toBe(true);
    expect(isCoveredOutcomeOffer({ ...eligible, subject: "other" }, [eligible.offerId])).toBe(
      false
    );
    expect(isCoveredOutcomeOffer({ ...eligible, instructionalWeeks: 11 }, [eligible.offerId])).toBe(
      false
    );
    expect(
      isCoveredOutcomeOffer({ ...eligible, courseFeeCentsAfterDiscounts: 0 }, [eligible.offerId])
    ).toBe(false);
    expect(
      isCoveredOutcomeOffer({ ...eligible, courseFeeActuallyPaid: false }, [eligible.offerId])
    ).toBe(false);
    expect(
      isCoveredOutcomeOffer({ ...eligible, courseFeeSeparatelyDisclosedBeforePurchase: false }, [
        eligible.offerId,
      ])
    ).toBe(false);
    expect(isCoveredOutcomeOffer(eligible)).toBe(false);
  });

  it("qualifies only an equal-or-lower official total, without a point threshold", () => {
    expect(isOutcomeRefundEligible(1200, 1200)).toBe(true);
    expect(isOutcomeRefundEligible(1200, 1199)).toBe(true);
    expect(isOutcomeRefundEligible(1200, 1201)).toBe(false);
    expect(isOutcomeRefundEligible(1600, 1600)).toBe(false);
  });

  it("requires 90 percent homework, planned hours, all specified tests, and a written plan", () => {
    expect(evaluatePlanCompletion(plan)).toBe("eligible");
    expect(evaluatePlanCompletion({ ...plan, goodFaithOnTimeHomeworkCount: 8 })).toBe("ineligible");
    expect(
      evaluatePlanCompletion({ ...plan, completedOneToOneHoursIncludingApprovedMakeups: 11 })
    ).toBe("ineligible");
    expect(evaluatePlanCompletion({ ...plan, completedSpecifiedFullLengthTests: 1 })).toBe(
      "ineligible"
    );
    expect(evaluatePlanCompletion({ ...plan, documentedException: true })).toBe("human_review");
    expect(evaluatePlanCompletion({ ...plan, requiredHomeworkCount: null })).toBe("human_review");
    expect(evaluatePlanCompletion({ ...plan, specifiedFullLengthTests: 1 })).toBe("human_review");
    expect(evaluatePlanCompletion({ ...plan, writtenPlanBeforeTeaching: false })).toBe(
      "ineligible"
    );
    expect(evaluatePlanCompletion({ ...plan, completedInstructionalWeeks: 11 })).toBe("ineligible");
    expect(evaluatePlanCompletion({ ...plan, goodFaithOnTimeHomeworkCount: 11 })).toBe(
      "human_review"
    );
    expect(evaluatePlanCompletion({ ...plan, agreedOneToOneHours: 12.5 })).toBe("human_review");
  });

  it("accepts a test within 60 days or the next offered administration after an exception", () => {
    const common = {
      planCompletionDate: "2026-01-01",
      isOfficialSat: true,
      isFirstOfficialSittingAfterPlan: true,
      isNextOfferedAdministration: false,
      noAdministrationInWindow: false,
      registeredTestWasCancelled: false,
    };
    expect(isQualifyingPostPlanTest({ ...common, testDate: "2026-03-02" })).toBe(true);
    expect(isQualifyingPostPlanTest({ ...common, testDate: "2026-03-03" })).toBe(false);
    expect(
      isQualifyingPostPlanTest({
        ...common,
        testDate: "2026-04-01",
        isNextOfferedAdministration: true,
        noAdministrationInWindow: true,
      })
    ).toBe(true);
    expect(isQualifyingPostPlanTest({ ...common, testDate: "2025-12-31" })).toBe(false);
    expect(
      isQualifyingPostPlanTest({ ...common, isOfficialSat: false, testDate: "2026-02-01" })
    ).toBe(false);
    expect(
      evaluatePostPlanTest({
        ...common,
        isFirstOfficialSittingAfterPlan: null,
        testDate: "2026-02-01",
      })
    ).toBe("human_review");
  });

  it("uses 30 calendar days after score availability for claims", () => {
    expect(isClaimWithinWindow("2026-01-01", "2026-01-31")).toBe(true);
    expect(isClaimWithinWindow("2026-01-01", "2026-02-01")).toBe(false);
    expect(isClaimWithinWindow("2026-01-01", "2025-12-31")).toBe(false);
  });

  it("allows one fit remedy only within 48 hours and before another paid session", () => {
    const request = {
      offerId: "future-reviewed-fit-offer",
      format: "private" as const,
      firstSessionEndedAt: "2026-10-01T12:00:00Z",
      requestReceivedAt: "2026-10-03T12:00:00Z",
      secondPaidSessionAt: null,
      firstSessionFeeCents: 13500,
      firstSessionFeeSeparatelyDisclosed: true,
      firstSessionFeePaid: true,
      resolution: "refund" as const,
      priorFitRemedyUsed: false,
    };
    const eligibleIds = [request.offerId];
    expect(isEligibleFirstSessionFitRequest(request)).toBe(false);
    expect(isEligibleFirstSessionFitRequest(request, eligibleIds)).toBe(true);
    expect(
      isEligibleFirstSessionFitRequest({ ...request, resolution: "free_replacement" }, eligibleIds)
    ).toBe(true);
    expect(
      isEligibleFirstSessionFitRequest(
        {
          ...request,
          requestReceivedAt: "2026-10-03T12:00:01Z",
        },
        eligibleIds
      )
    ).toBe(false);
    expect(
      isEligibleFirstSessionFitRequest(
        {
          ...request,
          requestReceivedAt: "2026-10-02T11:59:59Z",
          secondPaidSessionAt: "2026-10-02T11:59:59Z",
        },
        eligibleIds
      )
    ).toBe(false);
    expect(
      isEligibleFirstSessionFitRequest(
        {
          ...request,
          firstSessionFeeSeparatelyDisclosed: false,
          requestReceivedAt: "2026-10-02T11:59:59Z",
        },
        eligibleIds
      )
    ).toBe(false);
    expect(
      isEligibleFirstSessionFitRequest({ ...request, priorFitRemedyUsed: true }, eligibleIds)
    ).toBe(false);
    expect(
      isEligibleFirstSessionFitRequest({ ...request, firstSessionFeeCents: 13500.5 }, eligibleIds)
    ).toBe(false);
  });
});
