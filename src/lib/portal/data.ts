/*
 * What the student portal is given about the signed-in student, read on the server by
 * `loadPortalData` (load.ts) and handed to the page. Each screen reads its part through
 * `usePortalData` (src/app/dev/shell/portalData.tsx). Plain data, safe on the client.
 *
 * Screens are wired one at a time (founder, 2026-11-21); a screen with no part here yet still
 * shows its stand-ins.
 */
import type { SkillFacts } from "@/app/dev/shell/skills72";
import type { Student } from "@/app/dev/shell/progressData";
import type { RealHomework } from "./homework";
import type { RealRewards } from "./rewards";
import type { RealSchedule } from "./schedule";

/** The portal's three menus (src/app/dev/shell/plans.ts). */
export type PortalPlan = "practice" | "cohort" | "private";

export interface PortalData {
  plan: PortalPlan;
  firstName: string | null;
  /** Each of the 72 skills: the student's level (0 to 3) and the questions behind it. */
  skills: SkillFacts;
  /** Progress and the Mistake Log: exams, the test date and a log of every day. */
  student: Student;
  /** Homework, for Cohort and Private students. */
  homework: RealHomework | null;
  /** Days in a row with the challenge question answered. */
  streak: number;
  bestStreak: number;
  /** Schedule, for Private students. */
  schedule: RealSchedule | null;
  rewards: RealRewards;
}
