/**
 * Guarantee status for the two plans that carry it. The thresholds mirror
 * src/lib/marketing/offer.ts GUARANTEE (requirements for the cohort,
 * GUARANTEE.private20 for Private 20) as read on 2026-10-31. The screens show
 * each requirement as a count against its threshold and never restate the
 * remedies or the outcomes; those stay on the guarantee page. Candidate for
 * promotion into src/plans so every portal reads one mirror.
 */
import { PLANS, type PlanId } from "@/plans/plans";
import { SAT_MARCH, fmtDate } from "@/mock";
import { takenTests } from "./mock";

export const GUARANTEE_TERMS = {
  /** +100 points from a start under 1400, +50 from 1400 (plan ladder, 2026-11-08). */
  points: 100,
  pointsFrom1400: 50,
  splitAt: 1400,
  cohort: {
    classesNeeded: 15,
    classesTotal: 18,
    testsNeeded: 5,
    practicePercent: 90,
    satWindowDays: 60,
  },
  private10: { testsNeeded: 2, satWithinDays: 30 },
  private20: { testsNeeded: 4, satWithinDays: 30 },
} as const;

export interface GuaranteeRow {
  label: string;
  value: string;
  tone: "positive" | "notice" | "muted";
}
export interface GuaranteeStatus {
  onTrack: boolean;
  headline: string;
  rows: GuaranteeRow[];
}

/** Demo counts for the cohort student: classes held so far, attended, practice done. */
const COHORT_PROGRESS = { held: 7, attended: 6, practicePercent: 92 };
const PRIVATE_PROGRESS = { sessionsHeld: 7, sessionsAttended: 7 };

export function guaranteeStatus(plan: PlanId, studentId: string): GuaranteeStatus | null {
  const sat = fmtDate(SAT_MARCH, "long");
  const p = PLANS[plan];
  if (!p.guarantee) return null;
  if (p.bundles.includes("liveClasses")) {
    const t = GUARANTEE_TERMS.cohort;
    const tests = takenTests("ava").length;
    const practiceOk = COHORT_PROGRESS.practicePercent >= t.practicePercent;
    const missed = COHORT_PROGRESS.held - COHORT_PROGRESS.attended;
    const canStillMake = t.classesTotal - missed >= t.classesNeeded;
    const onTrack = practiceOk && canStillMake;
    return {
      onTrack,
      headline: onTrack ? "On track for the guarantee" : "One requirement is slipping",
      rows: [
        {
          label: "Live classes attended",
          value: `${COHORT_PROGRESS.attended} of ${COHORT_PROGRESS.held} held, ${t.classesNeeded} of ${t.classesTotal} needed`,
          tone: canStillMake ? "positive" : "notice",
        },
        {
          label: "Full-length tests, one sitting each",
          value: `${tests} of ${t.testsNeeded} taken`,
          tone: "muted",
        },
        {
          label: "Assigned practice done",
          value: `${COHORT_PROGRESS.practicePercent}%, ${t.practicePercent}% needed`,
          tone: practiceOk ? "positive" : "notice",
        },
        { label: "The SAT", value: sat, tone: "muted" },
      ],
    };
  }
  if (p.bundles.includes("oneToOne")) {
    const t = plan === "private10" ? GUARANTEE_TERMS.private10 : GUARANTEE_TERMS.private20;
    const tests = takenTests(studentId).length;
    const attendedAll = PRIVATE_PROGRESS.sessionsAttended === PRIVATE_PROGRESS.sessionsHeld;
    return {
      onTrack: attendedAll,
      headline: attendedAll ? "On track for the guarantee" : "A missed session counts",
      rows: [
        {
          label: "Sessions attended",
          value: `${PRIVATE_PROGRESS.sessionsAttended} of ${PRIVATE_PROGRESS.sessionsHeld}`,
          tone: attendedAll ? "positive" : "notice",
        },
        {
          label: "Full-length tests",
          value: `${tests} of ${t.testsNeeded} taken`,
          tone: "muted",
        },
        {
          label: `The SAT within ${t.satWithinDays} days of the last session`,
          value: sat,
          tone: "muted",
        },
      ],
    };
  }
  return null;
}

console.assert(guaranteeStatus("cohort", "ava")?.onTrack === true, "the cohort demo is on track");
console.assert(guaranteeStatus("private20", "maya")?.rows.length === 3, "three Private 20 rows");
console.assert(
  guaranteeStatus("pro", "sofia") === null,
  "no guarantee on Pro"
);
console.assert(guaranteeStatus("private10", "maya")?.rows.length === 3, "Private 10 carries the guarantee too");
