"use server";
// The portal's activities (overnight build, 2026-11-22, Quiz modes): start a skill set, endless run,
// review or time trial; the Daily 10's mix; the two challenge questions; a strategy quiz's coins; a
// Second chance; and the admin-only "Generated" mark. Answers to runs go through the existing
// actionAnswerRunQuestion and actionResumeRun (quiz-run-actions.ts). Every input is checked with Zod.
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { PlanLimitError, challengeSubjectsLeft } from "@/lib/assembler/plan-gate";
import { PaceError, assertStartPace } from "@/lib/assembler/pace-guard";
import { openDailyTen, serveNext } from "@/lib/assembler/runs";
import { getOwnedRun } from "@/lib/assembler/run-store";
import type { RunView } from "@/lib/assembler/run-types";
import { loadDailySlot, reviewDailyAnswer } from "@/lib/daily-challenge/server";
import { saverOffer, spendStreakSaver, type SaverOffer } from "@/lib/play/server/saver";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import { recordChallengeAnswer } from "@/lib/daily-ten/challenge";
import { coinsFor } from "@/lib/coins/earn";
import { multiplierOn } from "@/lib/coins/multiplier";
import { isSkill72Id, skill72 } from "@/lib/skills/ids72";
import { streaks } from "@/lib/student/streak";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import {
  bankCoins,
  challengeDays,
  coinBalance,
  currentMultiplier,
  savedDays,
} from "@/lib/play/server/coins";
import { loadLevels72 } from "@/lib/play/server/levels72";
import {
  endlessBest,
  startEndless,
  startReview,
  startSkillSet,
  spendSecondChance,
} from "@/lib/play/server/play-runs";
import { skills72Of } from "@/lib/play/server/pool72";
import { startTrial, trialStanding } from "@/lib/play/server/trials";
import type { Level72, PlayScope } from "@/lib/play/types";

export type PlayActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; limit?: boolean };

async function studentId(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? ""))
    throw new Error("Student access required");
  return userId;
}

/** Never show database or stack details to a student. */
const SAY: Record<string, string> = {
  "Student access required": "Sign in with a student account to practice.",
  "No distinct approved questions are available":
    "Not enough questions here yet. Try another skill.",
  "Nothing to review": "No mistakes to review here yet.",
  "No second chances left": "No Second chances left. Buy one on Rewards.",
  "No second chance here": "A Second chance can't be used here.",
  "There is no missed day to save.": "No missed day to save.",
  "Your streak saver was not used. Try again.": "Your streak saver was not used. Try again.",
  "You have no streak savers left.": "No Streak savers left.",
  "You already answered this one today.": "You already answered this one today.",
  "Question is not next in this session":
    "This question was already answered in another tab. Reload to continue.",
};

async function wrap<T>(work: () => Promise<T>): Promise<PlayActionResult<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    if (error instanceof PlanLimitError) return { ok: false, error: error.message, limit: true };
    if (error instanceof PaceError)
      return { ok: false, error: "That was very fast. Take a minute, then carry on." };
    const message = error instanceof Error ? error.message : "";
    console.error("[play]", message);
    return {
      ok: false,
      error: SAY[message] ?? "We could not finish that. Your saved answers are safe. Try again.",
    };
  }
}

const skillId = z.string().refine(isSkill72Id, "Unknown skill");
const scopeSchema: z.ZodType<PlayScope> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("skill"), skillId }),
  z.object({ kind: z.literal("domain"), domain: z.string().min(2).max(80) }),
  z.object({ kind: z.literal("section"), section: z.enum(["Reading and Writing", "Math"]) }),
]);

/** A short value fixed per student that orders their answer choices (the same order every time). */
function seedOf(clerkId: string): string {
  return createHash("sha256").update(`karman-shuffle:${clerkId}`).digest("hex").slice(0, 16);
}

export type Started = { view: RunView; seed: string };

export async function actionStartSkillSet(input: { skillId: string }) {
  return wrap(async (): Promise<Started> => {
    const id = await studentId();
    await assertStartPace(id);
    const parsed = z.object({ skillId }).strict().parse(input);
    return { view: await startSkillSet(id, parsed.skillId, serveNext), seed: seedOf(id) };
  });
}

export async function actionStartEndless(input: { scope: PlayScope }) {
  return wrap(async (): Promise<Started> => {
    const id = await studentId();
    await assertStartPace(id);
    const { scope } = z.object({ scope: scopeSchema }).strict().parse(input);
    return { view: await startEndless(id, scope, serveNext), seed: seedOf(id) };
  });
}

export async function actionStartReview(input: { skillId?: string; questionIds?: string[] }) {
  return wrap(async (): Promise<Started> => {
    const id = await studentId();
    const parsed = z
      .object({
        skillId: skillId.optional(),
        questionIds: z.array(z.string().uuid()).max(50).optional(),
      })
      .strict()
      .parse(input);
    return { view: await startReview(id, parsed), seed: seedOf(id) };
  });
}

/** The best endless run on a scope, and when it was set. */
export async function actionEndlessBest(input: { scope: PlayScope }) {
  return wrap(async () => {
    const id = await studentId();
    const { scope } = z.object({ scope: scopeSchema }).strict().parse(input);
    return endlessBest(id, scope);
  });
}

export async function actionTrialStanding(input: { scope: PlayScope }) {
  return wrap(async () => {
    const id = await studentId();
    const { scope } = z.object({ scope: scopeSchema }).strict().parse(input);
    return trialStanding(id, scope);
  });
}

export async function actionStartTrial(input: { scope: PlayScope }) {
  return wrap(async (): Promise<Started> => {
    const id = await studentId();
    await assertStartPace(id);
    const { scope } = z.object({ scope: scopeSchema }).strict().parse(input);
    return { view: await startTrial(id, scope), seed: seedOf(id) };
  });
}

export async function actionUseSecondChance(input: { runId: string; questionId: string }) {
  return wrap(async () => {
    const id = await studentId();
    const parsed = z
      .object({ runId: z.string().uuid(), questionId: z.string().uuid() })
      .strict()
      .parse(input);
    return spendSecondChance(id, parsed.runId, parsed.questionId);
  });
}

/** The Second chances a student holds (bought on Rewards). */
export async function actionSecondChances() {
  return wrap(async () => {
    const id = await studentId();
    const { data } = await (createAdminClient() as unknown as SupabaseClient)
      .from("portal_rewards")
      .select("passes")
      .eq("student_id", id)
      .maybeSingle();
    const passes = (data as { passes?: Record<string, number> } | null)?.passes ?? {};
    return passes["Second chance"] ?? 0;
  });
}

export type DailyPick = {
  skill: string;
  skillId: string;
  level: Level72;
  section: "rw" | "math";
  /** A spaced review of a skill that was due. */
  review?: boolean;
};

/** Today's Daily 10 (opened, the same ten all day) and the skills its ten come from. */
export async function actionDailyMix(input: { timeZone?: string }) {
  return wrap(async () => {
    const id = await studentId();
    const zone = z
      .object({ timeZone: z.string().max(64).optional() })
      .strict()
      .parse(input);
    const view = await openDailyTen(id, zone.timeZone ?? "");
    const run = await getOwnedRun(view.id, id);
    const ids = run?.form.sections[0]?.questionIds ?? [];
    const catalog = new Map(
      (run?.snapshots ?? []).map((s) => [s.binding.questionId, s.binding.catalogSkillId])
    );
    const [filed, { levels }] = await Promise.all([
      skills72Of(ids.map((q) => ({ questionId: q, catalogSkillId: catalog.get(q) ?? "" }))),
      loadLevels72(id),
    ]);
    const play = run?.form.play;
    const picks: DailyPick[] = ids.flatMap((q) => {
      const s = skill72(play?.skills?.[q]?.s ?? "") ?? filed.get(q);
      if (!s) return [];
      return [
        {
          skill: s.name,
          skillId: s.id,
          level: levels.get(s.id) ?? 0,
          section: s.section === "Math" ? "math" : "rw",
          ...(play?.reviews?.includes(q) ? { review: true } : {}),
        },
      ];
    });
    return { view, picks, seed: seedOf(id) };
  });
}

export type ChallengeToday = {
  day: string;
  questions: { subject: "reading" | "math"; question: StudentQuizQuestion }[];
  /** Answers already given today, by subject. */
  answered: Partial<Record<"reading" | "math", StudentQuizReview>>;
  /** Subjects the student may still answer today (Free: one of the two). */
  open: ("reading" | "math")[];
  multiplier: number;
  streak: number;
  seed: string;
};

/** Today's two challenge questions (one Reading and Writing, one Math), on every plan. */
export async function actionChallengeToday() {
  return wrap(async (): Promise<ChallengeToday> => {
    const id = await studentId();
    const now = new Date();
    const day = utcDayKey(now);
    const [reading, math, open, days, saved] = await Promise.all([
      loadDailySlot("reading", now),
      loadDailySlot("math", now),
      challengeSubjectsLeft(id, day),
      challengeDays(id),
      savedDays(id),
    ]);
    const questions: ChallengeToday["questions"] = [];
    for (const slot of [reading, math])
      if (slot.state === "ready")
        questions.push({ subject: slot.value.subject, question: slot.value.question });
    return {
      day,
      questions,
      answered: {},
      open,
      multiplier: multiplierOn(days, day, saved),
      streak: streaks([...new Set([...days.map((d) => d.day), ...saved])].sort(), day).current,
      seed: seedOf(id),
    };
  });
}

const challengeAnswer = z
  .object({
    subject: z.enum(["math", "reading"]),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    questionId: z.string().uuid(),
    answer: z.string().trim().min(1).max(200),
  })
  .strict();

export type ChallengeDone = {
  multiplier: { before: number; after: number };
  streak: { days: number; best: number };
  coins: { total: number; lines: { label: string; coins: number }[]; walletBefore: number };
};

/** One challenge answer: graded, kept, never counted in Free's 100. When the day's last open
 *  question is answered the challenge's coins are banked with the multiplier as it now stands. */
export async function actionAnswerChallenge(input: z.input<typeof challengeAnswer>) {
  return wrap(async () => {
    const id = await studentId();
    const parsed = challengeAnswer.parse(input);
    const open = await challengeSubjectsLeft(id, parsed.day);
    if (!open.includes(parsed.subject)) throw new Error("You already answered this one today.");
    const saved = await savedDays(id);
    const before = multiplierOn(await challengeDays(id), parsed.day, saved);
    const review = await reviewDailyAnswer(
      parsed.subject,
      parsed.day,
      parsed.questionId,
      parsed.answer
    );
    await recordChallengeAnswer({
      day: parsed.day,
      subject: parsed.subject,
      clerkId: id,
      questionId: parsed.questionId,
      answer: parsed.answer,
      correct: review.isCorrect,
    });
    const left = await challengeSubjectsLeft(id, parsed.day);
    if (left.length) return { review, done: null };
    const days = await challengeDays(id);
    const after = multiplierOn(days, parsed.day, saved);
    const today = days.find((d) => d.day === parsed.day)?.answers ?? [];
    const walletBefore = await coinBalance(id);
    const earned = coinsFor({
      activity: "challenge",
      answers: today.map((a) => ({ ok: a.ok, difficulty: 5, level: 1, before: 0 })),
      levelsUp: 0,
      multiplier: after,
    });
    await bankCoins(id, `challenge:${parsed.day}`, "challenge", earned);
    const run = streaks([...new Set([...days.map((d) => d.day), ...saved])].sort(), parsed.day);
    const done: ChallengeDone = {
      multiplier: { before, after },
      streak: { days: run.current, best: run.longest },
      coins: { total: earned.total, lines: earned.lines, walletBefore },
    };
    return { review, done };
  });
}

/** A strategy quiz finished (the compass, at the end of a lesson): its coins, once a skill a day. */
export async function actionFinishStrategy(input: {
  skillId: string;
  right: number;
  total: number;
}) {
  return wrap(async () => {
    const id = await studentId();
    const parsed = z
      .object({
        skillId,
        right: z.number().int().min(0).max(5),
        total: z.number().int().min(1).max(5),
      })
      .strict()
      .parse(input);
    const walletBefore = await coinBalance(id);
    const multiplier = await currentMultiplier(id);
    const earned = coinsFor({
      activity: "strategy",
      answers: Array.from({ length: parsed.total }, (_, i) => ({
        ok: i < Math.min(parsed.right, parsed.total),
        difficulty: 3,
        level: 1,
        before: 0,
      })),
      levelsUp: 0,
      multiplier,
    });
    const day = new Date().toISOString().slice(0, 10);
    const banked = await bankCoins(id, `strategy:${parsed.skillId}:${day}`, "strategy", earned);
    return {
      coins: banked ? earned.total : 0,
      lines: banked ? earned.lines : [],
      multiplier,
      walletBefore,
      skill: skill72(parsed.skillId)?.name ?? "",
    };
  });
}

/** Yesterday, when the student's streak broke there and they hold a Streak saver; else null. */
export async function actionSaverOffer() {
  return wrap(async (): Promise<SaverOffer | null> => saverOffer(await studentId()));
}

/** Spends one Streak saver on yesterday. */
export async function actionSpendSaver() {
  return wrap(async () => spendStreakSaver(await studentId()));
}
