/*
 * What the student portal is given about the signed-in student, read on the server by
 * `loadPortalData` (load.ts) and handed to the page. Each screen reads its part through
 * `usePortalData` (src/app/dashboard/student/_portal/portalData.tsx). Plain data, safe on the client.
 *
 * Screens are wired one at a time (founder, 2026-11-21); a screen with no part here yet still
 * shows its stand-ins.
 */
import type { PlanId } from "@/lib/plans/catalog";
import type { SkillFacts } from "@/app/dashboard/student/_portal/skills72";
import type { Student } from "@/app/dashboard/student/_portal/progressData";
import type { RealHomework, RealWorkshop } from "./homework";
import type { RealRewards } from "./rewards";
import type { RealSchedule } from "./schedule";
import type { GeneratedAdminView } from "@/lib/generator/admin";

/** The portal's three menus (src/app/dashboard/student/_portal/plans.ts). */
export type PortalPlan = "practice" | "cohort" | "private";

export interface PortalData {
  plan: PortalPlan;
  /** The exact plan (Free, Practice, Pro, a school seat...): the menus share three shapes, the locks
   *  do not. */
  planId: PlanId;
  /** What the plan opens right now (src/lib/assembler/plan-gate.ts): questions left on Free (null
   *  with no limit), whether a new full-length exam may start, and the hardest level open. */
  access: { questionsLeft: number | null; canStartFullTest: boolean; maxDifficulty: number };
  firstName: string | null;
  email: string | null;
  /** First and last name, as the menu shows it. */
  name: string;
  /** The SAT date the student entered (YYYY-MM-DD), if any. */
  testDate: string | null;
  /** The official SAT dates still to come (YYYY-MM-DD), from the `sat_dates` table. */
  satDates: string[];
  /** The choices the student made in Settings, kept with the account (student_settings.prefs). The
   *  portal reads the keys it knows and ignores the rest. */
  prefs: Record<string, unknown>;
  /** Whether the student has seen the portal's welcome (student_settings.welcomed_at). */
  welcomed: boolean;
  /** Onboarding could not place them with a tutor or cohort yet: "We're matching you with a tutor". */
  placementPending: boolean;
  /** Whether today's Daily 10 and challenge are done. */
  today: { dailyDone: boolean; challengeDone: boolean };
  /** Workshops coming up, for the Library. */
  workshops: RealWorkshop[];
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
  /** Only for an admin (checked on the server): live practice questions per skill, original and
   *  generated, and whether the sitewide switch hides generated ones. Absent for every student. */
  generatedAdmin?: GeneratedAdminView | null;
}
