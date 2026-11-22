/*
 * Server only. The portal's activities on the quiz-run machinery (src/lib/assembler/runs.ts): a skill
 * set on one of the 72 skills, endless mode, reviewing mistakes, and what happens when one of them
 * (or a Daily 10) finishes: the 72 skills' levels, the coins, the endless run's best.
 * Grading, saving answers and the answer key stay in runs.ts; nothing here sees a key before an answer.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { loadAdmittedBank } from "@/lib/assembler/bank";
import { assertQuestionsLeft } from "@/lib/assembler/plan-gate";
import { practiceSetPool } from "@/lib/assembler/set-pool";
import {
  answeredInRuns,
  findOpenRun,
  getOwnedRun,
  insertRun,
  loadResponses,
  updateRun,
  dailyTenDays,
} from "@/lib/assembler/run-store";
import type {
  RunForm,
  RunRecord,
  RunResponse,
  RunResult,
  RunView,
} from "@/lib/assembler/run-types";
import { buildView } from "@/lib/assembler/run-view";
import { stableHash } from "@/lib/catalog-practice/picker";
import { targetDifficulty } from "@/lib/daily-ten/select";
import { coinsFor, type CoinActivity } from "@/lib/coins/earn";
import { SKILLS72, skill72, type Section72 } from "@/lib/skills/ids72";
import { streaks } from "@/lib/student/streak";
import { dailyMoves, setMove } from "../mastery";
import type { Level72, PlayForm, PlayResult, PlayScope } from "../types";
import { bankCoins, coinBalance, currentMultiplier } from "./coins";
import { loadLevels72, saveLevels72 } from "./levels72";
import { pool72, skills72Of } from "./pool72";

/** A skill set is 8 questions (founder, 2026-11-18). */
export const SET_SIZE = 8;
/** Endless: misses that end a run (founder, 2026-11-21: three hearts). */
export const HEARTS = 3;
/** Endless: the most questions one run draws from, never repeating one. */
const ENDLESS_POOL = 120;
/** Review: the most mistakes in one review. */
const REVIEW_SIZE = 10;

const db = () => createAdminClient() as unknown as SupabaseClient;
/** The old engine's five levels for a portal level, to pick a starting difficulty. */
const OLD_LEVEL = [0, 2, 3, 4] as const;
const subjectOf = (section: Section72): "math" | "reading" =>
  section === "Math" ? "math" : "reading";

async function view(run: RunRecord): Promise<RunView> {
  return buildView(run, await loadResponses(run.id));
}

/** Skills a scope draws from. */
export function skillsOf(scope: PlayScope) {
  if (scope.kind === "skill") return SKILLS72.filter((s) => s.id === scope.skillId);
  if (scope.kind === "domain") return SKILLS72.filter((s) => s.domain === scope.domain);
  return SKILLS72.filter((s) => s.section === scope.section);
}

export function scopeKey(scope: PlayScope): string {
  if (scope.kind === "skill") return `skill:${scope.skillId}`;
  const name = scope.kind === "domain" ? scope.domain : scope.section;
  return `${scope.kind}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function scopeName(scope: PlayScope): string {
  if (scope.kind === "skill") return skill72(scope.skillId)?.name ?? "Skill";
  return scope.kind === "domain" ? scope.domain : scope.section;
}

/**
 * A skill set of 8 on one of the 72 skills, adaptive within the set (up one difficulty after a right
 * answer, down one after a miss). Resumes the open one. The 72-skill's level moves when it finishes.
 */
export async function startSkillSet(
  clerkId: string,
  skillId: string,
  serveNext: (run: RunRecord, responses: RunResponse[]) => Promise<RunView>
): Promise<RunView> {
  const skill = skill72(skillId);
  if (!skill) throw new Error("Practice session is unavailable");
  const scope = `set72:${skill.id}`;
  const open = await findOpenRun(clerkId, "practice-set", scope);
  if (open) return view(open);
  const access = await assertQuestionsLeft(clerkId);
  const [{ levels }, history, pool] = await Promise.all([
    loadLevels72(clerkId),
    answeredInRuns(clerkId),
    pool72([skill.id], access.maxDifficulty),
  ]);
  if (!pool.items.length) throw new Error("No distinct approved questions are available");
  const frozen = practiceSetPool(pool.items, history);
  const level = levels.get(skill.id) ?? 0;
  const size = Math.min(SET_SIZE, frozen.length, access.questionsLeft ?? SET_SIZE);
  const form: RunForm = {
    title: skill.name,
    grading: "instant",
    sections: [
      {
        key: "main",
        title: skill.name,
        subject: subjectOf(skill.section),
        seconds: null,
        questionIds: [],
      },
    ],
    adaptive: {
      size,
      skillId: pool.items[0].skillId,
      startDifficulty: targetDifficulty(OLD_LEVEL[level], access.maxDifficulty),
      maxDifficulty: access.maxDifficulty,
    },
    play: { mode: "set", skillId: skill.id },
  };
  const run = await insertRun({
    studentId: clerkId,
    kind: "practice-set",
    runKey: `practice-set:${scope}:${crypto.randomUUID()}`,
    scope,
    form,
    snapshots: frozen.map((id) => pool.snapshots.get(id)!),
    sequence: [],
  });
  return serveNext(run, []);
}

/**
 * Endless mode on a skill, a domain (leaning on the weakest skills) or a section (across all its
 * domains). Three misses end it; a question never comes twice in a run. Resumes the open one.
 */
export async function startEndless(
  clerkId: string,
  scope: PlayScope,
  serveNext: (run: RunRecord, responses: RunResponse[]) => Promise<RunView>
): Promise<RunView> {
  const skills = skillsOf(scope);
  if (!skills.length) throw new Error("Practice session is unavailable");
  const key = `endless:${scopeKey(scope)}`;
  const open = await findOpenRun(clerkId, "practice-set", key);
  if (open) return view(open);
  const access = await assertQuestionsLeft(clerkId);
  const [{ levels }, history, pool] = await Promise.all([
    loadLevels72(clerkId),
    answeredInRuns(clerkId),
    pool72(
      skills.map((s) => s.id),
      access.maxDifficulty
    ),
  ]);
  if (!pool.items.length) throw new Error("No distinct approved questions are available");
  // a domain run leans on the skills the student knows least (Not started 4 to Proficient 1)
  const weights: Record<string, number> = {};
  for (const s of skills) weights[s.id] = scope.kind === "domain" ? 4 - (levels.get(s.id) ?? 0) : 1;
  // the run's questions: spread over the skills, never-answered first
  const bySkill = new Map<string, typeof pool.items>();
  for (const item of pool.items)
    bySkill.set(item.skill72, [...(bySkill.get(item.skill72) ?? []), item]);
  const share = Math.max(8, Math.ceil(ENDLESS_POOL / Math.max(1, bySkill.size)));
  const frozen = [...bySkill.values()]
    .flatMap((items) => practiceSetPool(items, history, share))
    .slice(0, 400);
  const files = new Map(pool.items.map((i) => [i.id, i]));
  const skillsOfQuestion: Record<string, { s: string; d: string }> = {};
  for (const id of frozen) {
    const item = files.get(id)!;
    skillsOfQuestion[id] = { s: item.skill72, d: item.domain72 };
  }
  const first = skills[0];
  const average = skills.reduce((n, s) => n + (levels.get(s.id) ?? 0), 0) / skills.length;
  const title = scopeName(scope);
  const form: RunForm = {
    title,
    grading: "instant",
    sections: [
      { key: "main", title, subject: subjectOf(first.section), seconds: null, questionIds: [] },
    ],
    adaptive: {
      size: frozen.length,
      skillId: files.get(frozen[0])!.skillId,
      startDifficulty: targetDifficulty(OLD_LEVEL[Math.floor(average)], access.maxDifficulty),
      maxDifficulty: access.maxDifficulty,
    },
    play: { mode: "endless", scope, hearts: HEARTS, skills: skillsOfQuestion, weights },
  };
  const run = await insertRun({
    studentId: clerkId,
    kind: "practice-set",
    runKey: `practice-set:${key}:${crypto.randomUUID()}`,
    scope: key,
    form,
    snapshots: frozen.map((id) => pool.snapshots.get(id)!),
    sequence: [],
  });
  return serveNext(run, []);
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** Misses so far in a run. */
const misses = (responses: readonly RunResponse[]) => responses.filter((r) => !r.isCorrect).length;

/** True when a portal run is over before its size: endless after its last heart, or when its
 *  questions run out. */
export function playOver(run: RunRecord, responses: readonly RunResponse[]): boolean {
  const play = run.form.play;
  if (play?.mode !== "endless") return false;
  return misses(responses) >= (play.hearts ?? HEARTS) || responses.length >= run.snapshots.length;
}

/**
 * Endless's next question: the skill to draw from (one skill; a domain's weighted to the weakest;
 * a section's in turn across its domains), then the question nearest the difficulty the run has
 * climbed to, never-answered first, never one already asked or of the same family.
 */
export function nextEndless(
  run: RunRecord,
  responses: readonly RunResponse[],
  families: ReadonlyMap<string, string>,
  history: ReadonlyMap<string, string>
): string | null {
  const play = run.form.play;
  const adaptive = run.form.adaptive;
  if (!play || !adaptive) return null;
  const files = play.skills ?? {};
  const served = new Set(run.sequence);
  const usedFamilies = new Set(run.sequence.map((id) => families.get(id)));
  const open = run.snapshots
    .map((s) => s.binding.questionId)
    .filter((id) => !served.has(id) && !usedFamilies.has(families.get(id)));
  if (!open.length) return null;
  let target = adaptive.startDifficulty;
  for (const r of responses) target += r.isCorrect ? 1 : -1;
  target = Math.max(1, Math.min(adaptive.maxDifficulty, target));
  const turn = stableHash(`${run.id}:${run.sequence.length}`);
  let wanted: (id: string) => boolean = () => true;
  if (play.scope?.kind === "domain") {
    // weighted by how weak each skill is, among the skills that still have questions
    const left = [...new Set(open.map((id) => files[id]?.s).filter(Boolean))] as string[];
    const total = left.reduce((n, s) => n + (play.weights?.[s] ?? 1), 0);
    let at = ((turn % 1000) / 1000) * total;
    const pick = left.find((s) => (at -= play.weights?.[s] ?? 1) < 0) ?? left[0];
    wanted = (id) => files[id]?.s === pick;
  } else if (play.scope?.kind === "section") {
    // the domain served least so far, so the run moves across all of them
    const count = new Map<string, number>();
    for (const id of open) count.set(files[id]?.d ?? "", count.get(files[id]?.d ?? "") ?? 0);
    for (const id of run.sequence) {
      const d = files[id]?.d ?? "";
      if (count.has(d)) count.set(d, (count.get(d) ?? 0) + 1);
    }
    const least = Math.min(...count.values());
    const domains = [...count].filter(([, n]) => n === least).map(([d]) => d);
    const pick = domains[turn % domains.length];
    wanted = (id) => (files[id]?.d ?? "") === pick;
  }
  const pool = open.filter(wanted).length ? open.filter(wanted) : open;
  const difficulty = new Map(
    run.snapshots.map((s) => [s.binding.questionId, s.student.difficulty_level])
  );
  let best: { id: string; key: number[] } | null = null;
  for (const id of pool) {
    const key = [
      Math.abs((difficulty.get(id) ?? target) - target),
      history.has(id) ? 1 : 0,
      stableHash(`${run.id}:${id}`),
    ];
    if (!best || lexLess(key, best.key)) best = { id, key };
  }
  return best?.id ?? null;
}

/** The student's mistakes still to put right: questions whose latest answer was wrong, newest first. */
export async function missedQuestions(
  clerkId: string
): Promise<{ questionId: string; catalogSkillId: string; at: string }[]> {
  const { data } = await db()
    .from("quiz_run_responses")
    .select("question_id, skill_id, is_correct, answered_at, quiz_runs!inner(student_id)")
    .eq("quiz_runs.student_id", clerkId)
    .order("answered_at", { ascending: false })
    .limit(3000)
    .then(
      (r) => r,
      () => ({ data: null })
    );
  const latest = new Map<
    string,
    { questionId: string; catalogSkillId: string; at: string; ok: boolean }
  >();
  for (const r of (data ?? []) as {
    question_id: string;
    skill_id: string;
    is_correct: boolean;
    answered_at: string;
  }[])
    if (!latest.has(r.question_id))
      latest.set(r.question_id, {
        questionId: r.question_id,
        catalogSkillId: r.skill_id,
        at: r.answered_at,
        ok: r.is_correct,
      });
  return [...latest.values()].filter((m) => !m.ok).map(({ ok: _ok, ...m }) => m);
}

/**
 * A review of mistakes: the student's misses on one 72-skill (from the skill's page), or the
 * questions picked in the Mistake Log. Up to ten, newest first, graded as they go.
 */
export async function startReview(
  clerkId: string,
  input: { skillId?: string; questionIds?: string[] }
): Promise<RunView> {
  const skill = input.skillId ? skill72(input.skillId) : undefined;
  const scope = `review:${skill?.id ?? "log"}`;
  const open = await findOpenRun(clerkId, "practice-set", scope);
  if (open && !input.questionIds?.length) return view(open);
  const missed = await missedQuestions(clerkId);
  const filed = await skills72Of(missed);
  const picked = missed
    .filter((m) =>
      input.questionIds?.length
        ? input.questionIds.includes(m.questionId)
        : !skill || filed.get(m.questionId)?.id === skill.id
    )
    .slice(0, REVIEW_SIZE);
  if (!picked.length) throw new Error("Nothing to review");
  const access = await assertQuestionsLeft(clerkId);
  const bank = await loadAdmittedBank(
    [...new Set(picked.map((m) => m.catalogSkillId))],
    Math.max(access.maxDifficulty, 7)
  );
  const ids = picked.map((m) => m.questionId).filter((id) => bank.snapshots.has(id));
  if (!ids.length) throw new Error("Nothing to review");
  const subject = bank.items.find((i) => i.id === ids[0])?.section ?? "reading";
  const title = skill?.name ?? "Mistakes";
  const skills: Record<string, { s: string; d: string }> = {};
  for (const id of ids) {
    const s = filed.get(id);
    if (s) skills[id] = { s: s.id, d: s.domain };
  }
  return view(
    await insertRun({
      studentId: clerkId,
      kind: "practice-set",
      runKey: `practice-set:${scope}:${crypto.randomUUID()}`,
      scope,
      form: {
        title,
        grading: "instant",
        sections: [{ key: "main", title, subject, seconds: null, questionIds: ids }],
        play: { mode: "review", skillId: skill?.id, skills },
      },
      snapshots: ids.map((id) => bank.snapshots.get(id)!),
      sequence: ids,
    })
  );
}

/** How many times the student answered each question before this run. */
async function answeredBefore(
  clerkId: string,
  runId: string,
  questionIds: readonly string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!questionIds.length) return out;
  const { data } = await db()
    .from("quiz_run_responses")
    .select("question_id, run_id, quiz_runs!inner(student_id)")
    .eq("quiz_runs.student_id", clerkId)
    .in("question_id", questionIds as string[])
    .neq("run_id", runId)
    .limit(5000)
    .then(
      (r) => r,
      () => ({ data: null })
    );
  for (const r of (data ?? []) as { question_id: string }[])
    out.set(r.question_id, (out.get(r.question_id) ?? 0) + 1);
  return out;
}

const ACTIVITY: Record<PlayForm["mode"], CoinActivity> = {
  set: "skill-set",
  daily: "daily-ten",
  endless: "endless",
  review: "review",
  trial: "time-trial",
};

/** The best endless run before this one, on the same scope. */
async function bestEndless(clerkId: string, scope: string, runId: string): Promise<number> {
  return (await bestRunOn(clerkId, scope, runId)).run;
}

/** The best endless run on a scope, and when it was set (the start page's card). */
export async function endlessBest(
  clerkId: string,
  scope: PlayScope
): Promise<{ run: number; when: string | null }> {
  return bestRunOn(clerkId, `endless:${scopeKey(scope)}`, "");
}

async function bestRunOn(
  clerkId: string,
  scope: string,
  runId: string
): Promise<{ run: number; when: string | null }> {
  const { data } = await db()
    .from("quiz_runs")
    .select("id, result, completed_at")
    .eq("student_id", clerkId)
    .eq("kind", "practice-set")
    .eq("scope", scope)
    .not("completed_at", "is", null)
    .limit(500)
    .then(
      (r) => r,
      () => ({ data: null })
    );
  let best = { run: 0, when: null as string | null };
  for (const r of (data ?? []) as {
    id: string;
    result: RunResult | null;
    completed_at: string | null;
  }[]) {
    const run = r.result?.play?.endless?.run ?? 0;
    if (r.id !== runId && run > best.run) best = { run, when: r.completed_at };
  }
  return best;
}

/**
 * When a portal run (or a Daily 10) finishes: moves the 72 skills' levels by the founder's rules,
 * banks the coins, and says what happened for the ending. Never throws: a failure here leaves the
 * run finished without these extras.
 */
export async function finishPlay(
  run: RunRecord,
  responses: readonly RunResponse[],
  result: RunResult
): Promise<PlayResult | undefined> {
  const play = run.form.play;
  if (!play) return undefined;
  try {
    const clerkId = run.studentId;
    const rows = [...responses].sort((a, b) => a.ordinal - b.ordinal);
    const [filed, { levels, stored }, before, multiplier, walletBefore] = await Promise.all([
      play.skillId && play.mode === "set"
        ? Promise.resolve(new Map<string, ReturnType<typeof skill72>>())
        : skills72Of(rows.map((r) => ({ questionId: r.questionId, catalogSkillId: r.skillId }))),
      loadLevels72(clerkId),
      answeredBefore(
        clerkId,
        run.id,
        rows.map((r) => r.questionId)
      ),
      currentMultiplier(clerkId),
      coinBalance(clerkId),
    ]);
    const skillOf = (r: RunResponse) =>
      skill72(play.skills?.[r.questionId]?.s ?? "") ??
      (play.mode === "set" ? skill72(play.skillId ?? "") : filed.get(r.questionId)) ??
      null;
    const answers = rows.map((r) => ({
      questionId: r.questionId,
      skill: skillOf(r)?.name ?? "",
      skillId: skillOf(r)?.id ?? "",
      ok: r.isCorrect,
      rescued: play.rescued === r.questionId,
      seconds: r.seconds,
    }));
    const out: PlayResult = {
      mode: play.mode,
      answers: answers.map(({ skillId: _id, ...a }) => a),
      coins: { total: 0, lines: [], multiplier, walletBefore },
    };
    let levelsUp = 0;
    if (play.mode === "set" && play.skillId) {
      const skill = skill72(play.skillId)!;
      const from = levels.get(skill.id) ?? 0;
      const complete = rows.length >= (run.form.adaptive?.size ?? SET_SIZE);
      const move = setMove(from, answers, complete);
      levelsUp = move.to - move.from;
      out.level = { skillId: skill.id, skill: skill.name, from: move.from, to: move.to };
      if (complete)
        await saveLevels72(clerkId, [
          { skillId: skill.id, level: move.to, sets: (stored.get(skill.id)?.sets ?? 0) + 1 },
        ]);
    }
    if (play.mode === "daily") {
      const moves = dailyMoves(
        (id) => levels.get(id) ?? 0,
        answers.filter((a) => a.skillId).map((a) => ({ skillId: a.skillId, ok: a.ok }))
      );
      levelsUp = moves.filter((m) => m.to > m.from).length;
      out.moves = moves.map((m) => ({ ...m, skill: skill72(m.skillId)?.name ?? "" }));
      await saveLevels72(
        clerkId,
        moves.map((m) => ({
          skillId: m.skillId,
          level: m.to,
          sets: stored.get(m.skillId)?.sets ?? 0,
        }))
      );
      const days = await dailyTenDays(clerkId).catch(() => [] as string[]);
      const today = run.scope ?? "";
      const run_ = streaks([...new Set([...days, today])].filter(Boolean).sort(), today);
      out.streak = { days: result.streak ?? run_.current, best: run_.longest };
    }
    if (play.mode === "endless") {
      out.endless = {
        run: answers.filter((a) => a.ok).length,
        best: await bestEndless(clerkId, run.scope ?? "", run.id),
        hearts: play.hearts ?? HEARTS,
      };
    }
    const earned = coinsFor({
      activity: ACTIVITY[play.mode],
      answers: rows.map((r) => ({
        ok: r.isCorrect,
        difficulty: r.difficulty,
        level: levels.get(skillOf(r)?.id ?? "") ?? 0,
        before: before.get(r.questionId) ?? 0,
      })),
      levelsUp,
      streakDays: out.streak?.days,
      multiplier,
    });
    await bankCoins(clerkId, `run:${run.id}`, ACTIVITY[play.mode], earned);
    out.coins = { total: earned.total, lines: earned.lines, multiplier, walletBefore };
    return out;
  } catch (error) {
    console.error("[play] finish extras", error instanceof Error ? error.message : error);
    return undefined;
  }
}

/** The Second chance's pass, as Rewards names it. */
const SECOND_CHANCE = "Second chance";

/**
 * A Second chance (founder, 2026-11-16): after a miss in a skill set, the student spends one they
 * bought on Rewards and the miss counts as right for the level. One a set. If the set already
 * finished, its level is worked out again.
 */
export async function spendSecondChance(
  clerkId: string,
  runId: string,
  questionId: string
): Promise<RunView> {
  const run = await getOwnedRun(runId, clerkId);
  const play = run?.form.play;
  if (!run || play?.mode !== "set" || play.rescued) throw new Error("No second chance here");
  const responses = await loadResponses(run.id);
  const miss = responses.find((r) => r.questionId === questionId && !r.isCorrect);
  if (!miss) throw new Error("No second chance here");
  // spend the pass first: read, check, write (a student does this by hand, one at a time)
  const { data: row } = await db()
    .from("portal_rewards")
    .select("passes")
    .eq("student_id", clerkId)
    .maybeSingle();
  const passes = ((row as { passes?: Record<string, number> } | null)?.passes ?? {}) as Record<
    string,
    number
  >;
  if ((passes[SECOND_CHANCE] ?? 0) < 1) throw new Error("No second chances left");
  const { error } = await db()
    .from("portal_rewards")
    .update({
      passes: { ...passes, [SECOND_CHANCE]: passes[SECOND_CHANCE] - 1 },
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", clerkId);
  if (error) throw new Error("No second chances left");
  const form: RunForm = { ...run.form, play: { ...play, rescued: questionId } };
  let next: RunRecord = { ...run, form };
  await updateRun(run.id, clerkId, { form });
  // a finished set: its level again, with the miss put right
  if (run.completedAt && run.result?.play?.level && play.skillId) {
    const level = run.result.play.level;
    const rows = [...responses].sort((a, b) => a.ordinal - b.ordinal);
    const move = setMove(
      level.from,
      rows.map((r) => ({ ok: r.isCorrect, rescued: r.questionId === questionId })),
      true
    );
    const answers = run.result.play.answers.map((a) =>
      a.questionId === questionId ? { ...a, rescued: true } : a
    );
    const result: RunResult = {
      ...run.result,
      play: { ...run.result.play, answers, level: { ...level, to: move.to as Level72 } },
    };
    if (move.to > level.to) {
      const multiplier = run.result.play.coins.multiplier;
      const earned = coinsFor({
        activity: "skill-set",
        answers: [],
        levelsUp: move.to - level.to,
        multiplier,
      });
      await bankCoins(clerkId, `run:${run.id}:second-chance`, "skill-set", earned);
      result.play!.coins = {
        ...result.play!.coins,
        total: result.play!.coins.total + earned.total,
        lines: [
          ...result.play!.coins.lines,
          { label: "Second chance level up", coins: earned.total },
        ],
      };
      const { stored } = await loadLevels72(clerkId);
      await saveLevels72(clerkId, [
        {
          skillId: play.skillId,
          level: move.to as Level72,
          sets: stored.get(play.skillId)?.sets ?? 1,
        },
      ]);
    }
    await updateRun(run.id, clerkId, { result });
    next = { ...next, result };
  }
  return buildView(next, responses);
}
