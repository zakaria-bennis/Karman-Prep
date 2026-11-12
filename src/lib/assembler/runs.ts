/*
 * Server only. The quiz-run service: every flow (Daily 10, practice set, Domain quiz,
 * full-length test, diagnostic; time trials start in time-trial-run.ts) starts here from sealed
 * catalog snapshots, saves first answers, moves skill levels and writes the result. Answers are
 * graded on the server against the snapshot frozen at start; the browser never sees a key before
 * its answer is saved.
 */
import { z } from "zod";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { awardForAnswer } from "@/lib/quiz/points";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import {
  NOT_STARTED,
  applyAnswer,
  applyMeasured,
  applyQuizSkill,
  effective,
  type LevelState,
} from "@/lib/levels/rules";
import { loadStoredLevels, saveLevels, skillStateOf } from "@/lib/levels/server";
import { subSkillOfQuestion } from "@/lib/subskills/map";
import { getSubSkill, subSkillTitle, subSkillsOfSkill } from "@/lib/subskills/taxonomy";
import { dayKeyIn, safeTimeZone, streakDays } from "@/lib/daily-ten/day";
import { selectDailyTen, skillsToLoad, targetDifficulty } from "@/lib/daily-ten/select";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import {
  catalogSkill,
  loadAdmittedBank,
  questionFamily,
  skillsInDomain,
  skillsInSection,
} from "./bank";
import {
  DIAGNOSTIC_BLUEPRINT,
  FULL_LENGTH_FORMS,
  SECTION_SHAPE,
  assembleDiagnostic,
  assembleDomainQuiz,
  assembleFullLengthForms,
  routeHarder,
  type Section,
} from "./forms";
import { PlanLimitError, loadQuizAccess } from "./plan-gate";
import { practiceSetPool } from "./set-pool";
import { finishTimeTrial } from "./time-trial-run";
import { masteryBySkill } from "./mastery-by-skill";
import { nextDiagnosticRun, recordDiagnosticResult } from "./diagnostic-record";
import {
  answeredInRuns,
  dailyTenDays,
  findOpenRun,
  findRunByKey,
  fullTestQuestionIds,
  getOwnedRun,
  openFullTest,
  insertResponses,
  insertRun,
  latestRunOfKind,
  loadResponses,
  tokensForRun,
  updateRun,
} from "./run-store";
import type { RunForm, RunRecord, RunResponse, RunSectionForm, RunView } from "./run-types";
import { diagnosticSectionScore, predictedTotal, sectionScore } from "./score";
import {
  buildView,
  gradeAgainst,
  isSectionDone,
  labelForSkill,
  nextAdaptive,
  reviewOf,
  sectionQuestionIds,
  snapshotMap,
  summarise,
} from "./run-view";

export const PRACTICE_SET_SIZE = 10;
const title: Record<Section, string> = { reading: "Reading and Writing", math: "Math" };

const familyOf = (snap: CatalogDeliverySnapshot) =>
  questionFamily(snap.student as unknown as QuizQuestionWithChoices);

async function view(run: RunRecord): Promise<RunView> {
  return buildView(run, await loadResponses(run.id));
}

async function requireQuestionsLeft(clerkId: string) {
  const access = await loadQuizAccess(clerkId);
  if (access.questionsLeft === 0)
    throw new PlanLimitError("You have used the Free plan's 100 questions.");
  return access;
}

/** Today's Daily 10: the same ten all day (saved), counted in the streak once finished. */
export async function openDailyTen(clerkId: string, timeZone: string): Promise<RunView> {
  const now = new Date();
  const day = dayKeyIn(now, safeTimeZone(timeZone));
  const runKey = `daily-ten:${day}`;
  const saved = await findRunByKey(clerkId, runKey);
  if (saved) return view(saved);
  const access = await requireQuestionsLeft(clerkId);
  const [levels, mastery, history] = await Promise.all([
    loadStoredLevels(clerkId),
    masteryBySkill(clerkId, now),
    answeredInRuns(clerkId),
  ]);
  const skills = CATALOG_SKILLS.map((skill) => {
    const state = effective(skillStateOf(levels, skill.id, now), now);
    return {
      skillId: skill.id,
      section: (skill.subject === "math" ? "math" : "reading") as Section,
      level: state.level,
      lastPracticedAt: state.lastPracticedAt,
      mastery: mastery.get(skill.id) ?? null,
    };
  });
  const seed = `${clerkId}:${day}`;
  const first = skillsToLoad(skills, now, seed);
  let bank = await loadAdmittedBank(first, access.maxDifficulty);
  // Too few questions in the first skills (small pools, a failed read): widen to every skill.
  const perSection = (section: Section) =>
    bank.items.filter((item) => item.section === section).length;
  if (perSection("reading") < 10 || perSection("math") < 10) {
    const more = await loadAdmittedBank(
      CATALOG_SKILLS.map((skill) => skill.id).filter((id) => !first.includes(id)),
      access.maxDifficulty
    );
    bank = {
      items: [...bank.items, ...more.items],
      snapshots: new Map([...bank.snapshots, ...more.snapshots]),
    };
  }
  const candidates = new Map<
    string,
    {
      questionId: string;
      skillId: string;
      difficulty: number;
      family: string;
      answeredAt: string | null;
    }[]
  >();
  for (const item of bank.items) {
    const list = candidates.get(item.skillId) ?? [];
    list.push({
      questionId: item.id,
      skillId: item.skillId,
      difficulty: item.difficulty,
      family: item.family,
      answeredAt: history.get(item.id) ?? null,
    });
    candidates.set(item.skillId, list);
  }
  let picks = selectDailyTen({
    skills,
    candidates,
    maxDifficulty: access.maxDifficulty,
    now,
    seed,
  });
  if (access.questionsLeft !== null) picks = picks.slice(0, access.questionsLeft);
  if (!picks.length) throw new Error("No distinct approved questions are available");
  const ids = picks.map((p) => p.questionId);
  const form: RunForm = {
    title: "Daily 10",
    grading: "instant",
    sections: [
      {
        key: "main",
        title: "Daily 10",
        subject: "reading",
        seconds: null,
        questionIds: ids,
      },
    ],
  };
  return view(
    await insertRun({
      studentId: clerkId,
      kind: "daily-ten",
      runKey,
      scope: day,
      form,
      snapshots: ids.map((id) => bank.snapshots.get(id)!),
      sequence: ids,
    })
  );
}

/**
 * A 10-question practice set in one sub-skill (or a whole catalog skill), adaptive within the
 * set. Resumes an open one. A sub-skill serves only its own questions (src/lib/subskills/).
 */
export async function startPracticeSet(clerkId: string, setId: string): Promise<RunView> {
  const id = z.string().min(1).max(200).parse(setId);
  const sub = getSubSkill(id);
  const skill = catalogSkill(sub?.skillId ?? id);
  if (!skill) throw new Error("Practice session is unavailable");
  const scope = sub?.id ?? skill.id;
  const split = subSkillsOfSkill(skill.id).length > 1;
  const open = await findOpenRun(clerkId, "practice-set", scope);
  if (open) return view(open);
  const access = await requireQuestionsLeft(clerkId);
  const [levels, history, bank] = await Promise.all([
    loadStoredLevels(clerkId),
    answeredInRuns(clerkId),
    loadAdmittedBank([skill.id], access.maxDifficulty),
  ]);
  const items =
    sub && split
      ? bank.items.filter((i) => subSkillOfQuestion(i.id, skill.id) === sub.id)
      : bank.items;
  if (!items.length) throw new Error("No distinct approved questions are available");
  // Freeze a pool spread across difficulty, never-answered questions first.
  const pool = practiceSetPool(items, history);
  const state = effective(
    sub ? (levels.get(sub.id) ?? NOT_STARTED) : skillStateOf(levels, skill.id),
    new Date()
  );
  const title = sub && split ? (subSkillTitle(sub.id) ?? skill.label) : skill.label;
  const size = Math.min(PRACTICE_SET_SIZE, pool.length, access.questionsLeft ?? PRACTICE_SET_SIZE);
  const form: RunForm = {
    title,
    grading: "instant",
    sections: [
      {
        key: "main",
        title,
        subject: skill.subject === "math" ? "math" : "reading",
        seconds: null,
        questionIds: [],
      },
    ],
    adaptive: {
      size,
      skillId: skill.id,
      startDifficulty: targetDifficulty(state.level, access.maxDifficulty),
      maxDifficulty: access.maxDifficulty,
    },
  };
  const run = await insertRun({
    studentId: clerkId,
    kind: "practice-set",
    runKey: `practice-set:${scope}:${crypto.randomUUID()}`,
    scope,
    form,
    snapshots: pool.map((id) => bank.snapshots.get(id)!),
    sequence: [],
  });
  return serveNext(run, []);
}

/** Appends the next adaptive question to the set when the last one is answered. */
async function serveNext(run: RunRecord, responses: RunResponse[]): Promise<RunView> {
  const answered = new Set(responses.map((r) => r.questionId));
  if (run.form.adaptive && run.sequence.every((id) => answered.has(id))) {
    const families = new Map(run.snapshots.map((s) => [s.binding.questionId, familyOf(s)]));
    const next = nextAdaptive(run, responses, await answeredInRuns(run.studentId), families);
    if (next) {
      run = { ...run, sequence: [...run.sequence, next] };
      await updateRun(run.id, run.studentId, { sequence: run.sequence });
    } else if (run.sequence.length) {
      // The pool ran dry before ten: the set ends with what was answered.
      run = {
        ...run,
        form: { ...run.form, adaptive: { ...run.form.adaptive, size: run.sequence.length } },
      };
      await updateRun(run.id, run.studentId, { form: run.form });
    }
  }
  return buildView(run, responses);
}

/** About 12 questions across one Domain's skills. Resumes an open one. */
export async function startDomainQuiz(clerkId: string, domainId: string): Promise<RunView> {
  const domain = SKILL_DOMAINS.find((d) => d.id === z.string().max(60).parse(domainId));
  if (!domain) throw new Error("Practice session is unavailable");
  const open = await findOpenRun(clerkId, "domain-quiz", domain.id);
  if (open) return view(open);
  const access = await requireQuestionsLeft(clerkId);
  const [history, bank] = await Promise.all([
    answeredInRuns(clerkId),
    loadAdmittedBank(skillsInDomain(domain.id), access.maxDifficulty),
  ]);
  const picked = assembleDomainQuiz(bank.items, {
    domainId: domain.id,
    maxDifficulty: access.maxDifficulty,
    seed: `${clerkId}:${domain.id}:${Date.now()}`,
    answered: new Set(history.keys()),
  });
  if (!picked.length) throw new Error("No distinct approved questions are available");
  const ids = picked.map((i) => i.id).slice(0, access.questionsLeft ?? picked.length);
  const form: RunForm = {
    title: `${domain.label} quiz`,
    grading: "instant",
    sections: [
      {
        key: "main",
        title: domain.label,
        subject: domain.subject === "math" ? "math" : "reading",
        seconds: null,
        questionIds: ids,
      },
    ],
  };
  return view(
    await insertRun({
      studentId: clerkId,
      kind: "domain-quiz",
      runKey: `domain-quiz:${domain.id}:${crypto.randomUUID()}`,
      scope: domain.id,
      form,
      snapshots: ids.map((id) => bank.snapshots.get(id)!),
      sequence: ids,
    })
  );
}

function timedSections(
  parts: {
    section: Section;
    first: string[];
    easier?: string[];
    harder?: string[];
    minutes: number;
  }[],
  moduleTitles: boolean
): RunSectionForm[] {
  return parts.flatMap((part, index) => {
    const prefix = part.section === "reading" ? "rw" : "m";
    const first: RunSectionForm = {
      key: `${prefix}1`,
      title: moduleTitles ? `${title[part.section]}, Module 1` : title[part.section],
      subject: part.section,
      seconds: part.minutes * 60,
      questionIds: part.first,
      breakBefore: index > 0,
    };
    if (!part.easier || !part.harder) return [first];
    return [
      first,
      {
        key: `${prefix}2`,
        title: `${title[part.section]}, Module 2`,
        subject: part.section,
        seconds: part.minutes * 60,
        questionIds: [],
        variants: { easier: part.easier, harder: part.harder, routeFrom: `${prefix}1` },
      },
    ];
  });
}

/** Full-length test `form` (1 to 4). Free gets one. A started form resumes; a finished one shows its report. */
export async function startFullTest(clerkId: string, formNumber: number): Promise<RunView> {
  const form = z.number().int().min(1).max(FULL_LENGTH_FORMS).parse(formNumber);
  const saved = await findRunByKey(clerkId, `full-test:${form}`);
  if (saved) return view(saved);
  const access = await loadQuizAccess(clerkId);
  if (!access.canStartFullTest)
    throw new PlanLimitError("The Free plan includes one full-length test.");
  // A limited plan finishes the test it started before opening another form.
  if (access.limited && (await openFullTest(clerkId)))
    throw new PlanLimitError("Finish the full-length test you started first.");
  const bank = await loadAdmittedBank(
    [...skillsInSection("reading"), ...skillsInSection("math")],
    access.maxDifficulty
  );
  const taken = new Set(await fullTestQuestionIds(clerkId));
  const exclude = bank.items.filter((i) => taken.has(i.id)).map((i) => i.family);
  const forms = assembleFullLengthForms(bank.items, {
    upTo: form,
    maxDifficulty: access.maxDifficulty,
    exclude,
  });
  const built = forms[form - 1];
  const parts = built.sections.map((s) => ({
    section: s.section,
    first: s.module1.map((i) => i.id),
    easier: s.easier.map((i) => i.id),
    harder: s.harder.map((i) => i.id),
    minutes: SECTION_SHAPE[s.section].minutes,
  }));
  const short = parts.some(
    (p) =>
      p.first.length < SECTION_SHAPE[p.section].perModule ||
      p.easier.length < SECTION_SHAPE[p.section].perModule ||
      p.harder.length < SECTION_SHAPE[p.section].perModule
  );
  if (short) throw new Error("No distinct approved questions are available");
  const ids = parts.flatMap((p) => [...p.first, ...p.easier, ...p.harder]);
  return view(
    await insertRun({
      studentId: clerkId,
      kind: "full-test",
      runKey: `full-test:${form}`,
      scope: String(form),
      form: {
        title: `Practice test ${form}`,
        grading: "end",
        sections: timedSections(parts, true),
      },
      snapshots: ids.map((id) => bank.snapshots.get(id)!),
      sequence: [],
    })
  );
}

/** The diagnostic, drawn from the bank: one timed module per section. Resumes or shows its report. */
export async function startDiagnostic(clerkId: string): Promise<RunView> {
  const latest = await latestRunOfKind(clerkId, "diagnostic");
  const runKey = await nextDiagnosticRun(clerkId, latest);
  if (!runKey) return view(latest!);
  const bank = await loadAdmittedBank(
    [...skillsInSection("reading"), ...skillsInSection("math")],
    5
  );
  const built = assembleDiagnostic(bank.items, { seed: `${clerkId}:${runKey}` });
  const parts = built.map((s) => ({
    section: s.section,
    first: s.items.map((i) => i.id),
    minutes: DIAGNOSTIC_BLUEPRINT[s.section].minutes,
  }));
  const ids = parts.flatMap((p) => p.first);
  if (ids.length < 20) throw new Error("No distinct approved questions are available");
  return view(
    await insertRun({
      studentId: clerkId,
      kind: "diagnostic",
      runKey,
      scope: null,
      form: { title: "Diagnostic", grading: "end", sections: timedSections(parts, false) },
      snapshots: ids.map((id) => bank.snapshots.get(id)!),
      sequence: [],
    })
  );
}

export async function resumeRun(clerkId: string, runId: string): Promise<RunView> {
  const run = await getOwnedRun(z.string().uuid().parse(runId), clerkId);
  if (!run) throw new Error("Practice session is unavailable");
  const responses = await loadResponses(run.id);
  return run.form.adaptive && !run.completedAt
    ? serveNext(run, responses)
    : buildView(run, responses);
}

export const answerSchema = z
  .object({
    runId: z.string().uuid(),
    questionId: z.string().uuid(),
    answer: z.string().trim().min(1).max(200),
    seconds: z.number().int().min(0).max(86400),
    usedHint: z.boolean().default(false),
  })
  .strict();

/** Instant lanes: grade one answer, award tokens, move the skill's level. First answer wins. */
export async function answerQuestion(clerkId: string, raw: z.input<typeof answerSchema>) {
  const input = answerSchema.parse(raw);
  const run = await getOwnedRun(input.runId, clerkId);
  if (!run || run.form.grading !== "instant") throw new Error("Practice session is unavailable");
  const responses = await loadResponses(run.id);
  const snapshots = snapshotMap(run);
  const existing = responses.find((r) => r.questionId === input.questionId);
  const snap = snapshots.get(input.questionId);
  if (!snap) throw new Error("Question is not next in this session");
  if (existing)
    return { review: reviewOf(snap, existing), change: null, view: buildView(run, responses) };
  const ids = sectionQuestionIds(run, 0);
  const next = ids.find((id) => !responses.some((r) => r.questionId === id));
  if (run.completedAt || next !== input.questionId)
    throw new Error("Question is not next in this session");
  const correct = gradeAgainst(input.answer, snap);
  const skillId = snap.binding.catalogSkillId;
  // Levels live per sub-skill; the answer row keeps the catalog skill.
  const levelKey = subSkillOfQuestion(input.questionId, skillId);
  const levels = await loadStoredLevels(clerkId);
  const before = levels.get(levelKey) ?? NOT_STARTED;
  const now = new Date();
  // Domain quizzes move levels by the quiz rule when they finish; sets and the Daily 10 by runs.
  const moved =
    run.kind === "domain-quiz"
      ? null
      : applyAnswer(before, { correct, usedHint: input.usedHint, at: now });
  const response: RunResponse = {
    ordinal: responses.length,
    sectionKey: "main",
    questionId: input.questionId,
    skillId,
    difficulty: snap.student.difficulty_level,
    studentAnswer: input.answer,
    isCorrect: correct,
    usedHint: input.usedHint,
    seconds: input.seconds,
    answeredAt: now.toISOString(),
    levelBefore: effective(before, now).level,
    levelAfter: moved ? moved.state.level : effective(before, now).level,
  };
  await insertResponses(run.id, [response]);
  const saved = (await loadResponses(run.id)).find((r) => r.questionId === input.questionId)!;
  if (saved.answeredAt !== response.answeredAt && saved.studentAnswer !== response.studentAnswer) {
    // Another tab saved first: keep its answer and do not move levels twice.
    return { review: reviewOf(snap, saved), change: null, view: await resumeRun(clerkId, run.id) };
  }
  if (moved) await saveLevels(clerkId, new Map([[levelKey, moved.state]]));
  const points = await awardForAnswer({
    key: `run:${run.id}:${input.questionId}`,
    clerkId,
    correct,
    difficulty: snap.student.difficulty_level,
    skillId,
  });
  const all = [...responses, saved];
  let current = run;
  if (all.length >= (run.form.adaptive?.size ?? ids.length)) current = await finishRun(run, all);
  return {
    review: reviewOf(snap, saved, points),
    change:
      moved?.change && moved.change.to > moved.change.from
        ? { skill: labelForSkill(levelKey), ...moved.change }
        : null,
    view: current.completedAt ? buildView(current, all) : await serveNext(current, all),
  };
}

export const sectionSchema = z
  .object({
    runId: z.string().uuid(),
    sectionKey: z.string().min(1).max(8),
    answers: z.record(z.string().uuid(), z.string().max(200)),
    seconds: z.number().int().min(0).max(86400),
  })
  .strict();

/** Timed lanes: grade a whole section when it is submitted (or its time runs out). */
export async function submitSection(
  clerkId: string,
  raw: z.input<typeof sectionSchema>
): Promise<RunView> {
  const input = sectionSchema.parse(raw);
  let run = await getOwnedRun(input.runId, clerkId);
  if (!run || run.form.grading !== "end") throw new Error("Practice session is unavailable");
  const responses = await loadResponses(run.id);
  const index = run.form.sections.findIndex((s) => s.key === input.sectionKey);
  const answered = new Set(responses.map((r) => r.questionId));
  if (index < 0 || run.completedAt) return buildView(run, responses);
  if (isSectionDone(run, index, answered)) return buildView(run, responses);
  const firstOpen = run.form.sections.findIndex((_, i) => !isSectionDone(run!, i, answered));
  if (firstOpen !== index) throw new Error("Question is not next in this session");
  const snapshots = snapshotMap(run);
  const now = new Date().toISOString();
  const ids = sectionQuestionIds(run, index);
  const per = Math.round(input.seconds / Math.max(1, ids.length));
  const rows: RunResponse[] = ids
    .filter((id) => !answered.has(id))
    .map((id, i) => {
      const snap = snapshots.get(id)!;
      const answer = (input.answers[id] ?? "").trim();
      return {
        ordinal: responses.length + i,
        sectionKey: input.sectionKey,
        questionId: id,
        skillId: snap.binding.catalogSkillId,
        difficulty: snap.student.difficulty_level,
        studentAnswer: answer,
        isCorrect: gradeAgainst(answer, snap),
        usedHint: false,
        seconds: per,
        answeredAt: now,
        levelBefore: null,
        levelAfter: null,
      };
    });
  await insertResponses(run.id, rows);
  const all = await loadResponses(run.id);
  // Route the next Module 2 by this module's right answers.
  const routed = run.form.sections.map((s) => {
    if (!s.variants || s.variants.route || s.variants.routeFrom !== input.sectionKey) return s;
    const right = all.filter((r) => r.sectionKey === input.sectionKey && r.isCorrect).length;
    return {
      ...s,
      variants: {
        ...s.variants,
        route: routeHarder(s.subject, right) ? ("harder" as const) : ("easier" as const),
      },
    };
  });
  if (routed.some((s, i) => s !== run!.form.sections[i])) {
    run = { ...run, form: { ...run.form, sections: routed } };
    await updateRun(run.id, clerkId, { form: run.form });
  }
  const done = new Set(all.map((r) => r.questionId));
  if (run.form.sections.every((_, i) => isSectionDone(run!, i, done))) {
    run = await finishRun(run, all);
    if (run.kind === "time-trial") run = await finishTimeTrial(run, all, input.seconds);
  }
  return buildView(run, all);
}

/** Writes the result once: levels for the kind's rule, tokens, streak, predicted scores. */
async function finishRun(run: RunRecord, responses: RunResponse[]): Promise<RunRecord> {
  if (run.completedAt) return run;
  const now = new Date();
  const levels = await loadStoredLevels(run.studentId);
  const changed = new Map<string, LevelState>();
  const bySkill = new Map<string, RunResponse[]>();
  const keyOf = (r: RunResponse) => subSkillOfQuestion(r.questionId, r.skillId);
  for (const r of responses) bySkill.set(keyOf(r), [...(bySkill.get(keyOf(r)) ?? []), r]);
  const moves = new Map<string, { from: number; to: number }>();
  if (run.kind === "domain-quiz" || run.kind === "full-test" || run.kind === "diagnostic") {
    for (const [skillId, rows] of bySkill) {
      const before = levels.get(skillId) ?? NOT_STARTED;
      const from = effective(before, now).level;
      const state =
        run.kind === "domain-quiz"
          ? applyQuizSkill(
              before,
              rows.map((r) => ({ correct: r.isCorrect, usedHint: r.usedHint })),
              now
            ).state
          : applyMeasured(before, rows.length, now);
      changed.set(skillId, state);
      moves.set(skillId, { from, to: state.level });
    }
    await saveLevels(run.studentId, changed);
  }
  const withMoves = responses.map((r) => {
    const m = moves.get(keyOf(r));
    return m
      ? {
          ...r,
          levelBefore: m.from as RunResponse["levelBefore"],
          levelAfter: m.to as RunResponse["levelAfter"],
        }
      : r;
  });
  const result = summarise(run, withMoves, await tokensForRun(run.id, run.studentId), keyOf);
  if (run.kind === "full-test" || run.kind === "diagnostic") {
    const scored = (section: Section) => {
      const keys = run.form.sections.filter((s) => s.subject === section).map((s) => s.key);
      const rows = (key: string | undefined) =>
        responses
          .filter((r) => r.sectionKey === key)
          .map((r) => ({ difficulty: r.difficulty, correct: r.isCorrect }));
      return run.kind === "full-test"
        ? sectionScore({ section, module1: rows(keys[0]), module2: rows(keys[1]) })
        : diagnosticSectionScore(rows(keys[0]));
    };
    const reading = scored("reading");
    const math = scored("math");
    result.predicted = { reading, math, total: predictedTotal({ reading, math }) };
  }
  if (run.kind === "daily-ten") {
    const days = await dailyTenDays(run.studentId);
    const day = run.scope ?? run.runKey.replace("daily-ten:", "");
    result.streak = streakDays([...days, day], day);
  }
  const completedAt = now.toISOString();
  await updateRun(run.id, run.studentId, { completed_at: completedAt, result });
  if (run.kind === "diagnostic" && result.predicted)
    await recordDiagnosticResult(run.studentId, result.predicted, completedAt);
  return { ...run, completedAt, result };
}
