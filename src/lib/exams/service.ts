/*
 * Server only. Everything an exam sitting does: the exam list, the start, saving answers with their times,
 * submitting a part, routing Module 2, the break, and the result. Each call first brings the sitting up
 * to `now` (`advance`): a module that ran out of time is closed and graded with the answers saved so far,
 * Module 2 is routed, Math starts when the break is over, and a finished exam gets its result. So leaving
 * the page never pauses the clock, and coming back always lands where the exam would be.
 */
import { toCatalogStudentQuestion } from "@/lib/catalog-practice/delivery-contract";
import { gradeAgainst } from "@/lib/assembler/run-view";
import { predictedFromRange } from "@/lib/student/progress";
import type { StudentQuizQuestion } from "@/types/quiz";
import {
  MODULE_INFO,
  MODULE_ORDER,
  SECTION_TITLE,
  acceptsAnswers,
  closeModule,
  endTime,
  moduleOf,
  newPlan,
  routeModule2,
  stageOf,
  startAfterBreak,
  type ExamSection,
  type ModuleKey,
  type PlannedModule,
  type SittingPlan,
} from "./plan";
import { loadExamQuestions, type ExamQuestion } from "./questions";
import { buildResult, chooseRoute, type ExamResult, type GradedAnswer } from "./result";
import {
  completeSitting,
  findSitting,
  formNumbers,
  insertSitting,
  loadForm,
  otherScoredExams,
  readResponses,
  savePlan,
  sittingById,
  paceNorms,
  sittingsOf,
  skill72Tags,
  studentFacts,
  writeResponses,
  type ResponseRow,
  type SittingRecord,
} from "./store";
import {
  FALLBACK_TIME_ZONE,
  examWindow,
  howToOpen,
  validTimeZone,
  type ExamWindow,
} from "./window";

export class ExamError extends Error {
  constructor(
    message: string,
    readonly kind: "closed" | "order" | "limit" | "missing" | "late" | "state" = "state"
  ) {
    super(message);
    this.name = "ExamError";
  }
}

export type ExamAnswerInput = {
  questionId: string;
  answer: string | null;
  seconds: number;
  changes: number;
  flagged: boolean;
};

export type ModuleView = {
  key: ModuleKey;
  section: ExamSection;
  number: 1 | 2;
  title: string;
  questions: StudentQuizQuestion[];
  saved: Record<
    string,
    { answer: string | null; flagged: boolean; seconds: number; changes: number }
  >;
  deadline: string;
  seconds: number;
};

export type SittingView =
  | { stage: "module"; sittingId: string; form: number; serverNow: string; module: ModuleView }
  | { stage: "break"; sittingId: string; form: number; serverNow: string; endsAt: string }
  | { stage: "done"; sittingId: string; form: number; serverNow: string; result: ExamResult };

export type Access = {
  /** The test switch is on and this caller may use it (an admin, or development). */
  testSwitch: boolean;
  /** Plan limit on full-length exams (Free: 1); null when none. */
  limit: number | null;
  /** Full-length exams already used against that limit. */
  used: number;
};

// ---------------------------------------------------------------------------------------------------
// Grading and moving the sitting on

function graded(
  part: PlannedModule,
  questions: Map<string, ExamQuestion>,
  saved: Map<string, ResponseRow>
): { rows: ResponseRow[]; answers: GradedAnswer[] } {
  const rows: ResponseRow[] = [];
  const answers: GradedAnswer[] = [];
  part.questionIds.forEach((id, position) => {
    const q = questions.get(id);
    const prior = saved.get(id);
    const answer = prior?.answer ?? null;
    const correct = q && answer ? gradeAgainst(answer, q.snapshot) : false;
    const trial = part.trialIds.includes(id);
    rows.push({
      module: part.key,
      position,
      question_id: id,
      answer,
      is_correct: correct,
      trial,
      seconds: prior?.seconds ?? 0,
      changes: prior?.changes ?? 0,
      flagged: prior?.flagged ?? false,
    });
    if (q)
      answers.push({
        module: part.key,
        item: q.engine,
        correct,
        trial,
        answered: !!answer,
        seconds: prior?.seconds ?? 0,
        skill72: null,
      });
  });
  return { rows, answers };
}

async function gradeModule(sitting: SittingRecord, part: PlannedModule): Promise<GradedAnswer[]> {
  const [questions, responses] = await Promise.all([
    loadExamQuestions(part.questionIds),
    readResponses(sitting.id),
  ]);
  const saved = new Map(
    responses.filter((r) => r.module === part.key).map((r) => [r.question_id, r])
  );
  const { rows, answers } = graded(part, questions, saved);
  await writeResponses(sitting.id, rows);
  return answers;
}

/** Graded answers of modules already graded (from the saved rows). */
async function gradedAnswers(
  sitting: SittingRecord,
  plan: SittingPlan,
  keys: readonly ModuleKey[]
) {
  const modules = keys.map((key) => moduleOf(plan, key));
  const ids = modules.flatMap((m) => m.questionIds);
  const [questions, responses, tags] = await Promise.all([
    loadExamQuestions(ids),
    readResponses(sitting.id),
    skill72Tags(ids),
  ]);
  const byId = new Map(responses.map((r) => [r.question_id, r]));
  const answers: GradedAnswer[] = [];
  for (const part of modules) {
    for (const id of part.questionIds) {
      const q = questions.get(id);
      const row = byId.get(id);
      if (!q) continue;
      const correct =
        row?.is_correct ?? (row?.answer ? gradeAgainst(row.answer, q.snapshot) : false);
      answers.push({
        module: part.key,
        item: q.engine,
        correct,
        trial: part.trialIds.includes(id),
        answered: !!row?.answer,
        seconds: row?.seconds ?? 0,
        skill72: tags.get(id) ?? null,
      });
    }
  }
  return answers;
}

const minutesUsed = (part: PlannedModule) =>
  part.startedAt && part.endedAt
    ? Math.round((new Date(part.endedAt).getTime() - new Date(part.startedAt).getTime()) / 6000) /
      10
    : 0;

/** Earlier scored exams the predicted score counts, oldest first, and the last full-length total. */
async function history(sitting: SittingRecord, userId: string | null) {
  const [sittings, other] = await Promise.all([
    sittingsOf(sitting.studentId),
    otherScoredExams(sitting.studentId, userId),
  ]);
  const earlierSittings = sittings
    .filter((s) => s.id !== sitting.id && s.result && s.completedAt)
    .map((s) => ({ at: s.completedAt!, total: s.result!.total }));
  const scored = [
    ...earlierSittings,
    ...other.runs
      .filter((r) => r.result?.predicted?.total)
      .map((r) => ({ at: r.completed_at, total: r.result!.predicted!.total })),
    ...other.diagnostics.map((d) => ({
      at: d.taken_at,
      total: predictedFromRange(d.score_range_low, d.score_range_high),
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const lastExam = [...earlierSittings].sort((a, b) => b.at.localeCompare(a.at))[0];
  return { earlier: scored.map((s) => s.total), previousTotal: lastExam?.total ?? null };
}

async function finish(sitting: SittingRecord, plan: SittingPlan, userId: string | null, now: Date) {
  const answers = await gradedAnswers(sitting, plan, MODULE_ORDER);
  const route = (key: "rw2" | "m2") =>
    moduleOf(plan, key).kind === "harder" ? "harder" : "easier";
  const { earlier, previousTotal } = await history(sitting, userId);
  const result = buildResult({
    form: sitting.form,
    answers,
    routes: { reading: route("rw2"), math: route("m2") },
    minutes: Object.fromEntries(
      MODULE_ORDER.map((key) => [key, minutesUsed(moduleOf(plan, key))])
    ) as Record<ModuleKey, number>,
    previousTotal,
    earlier,
    completedAt: now,
    norms: await paceNorms(),
  });
  await completeSitting(sitting.id, result, result.coins);
  return result;
}

/**
 * Brings the sitting up to `now`: closes and grades modules that ran out of time, routes Module 2, starts
 * Math after the break and scores a finished exam. Returns the sitting as it now stands, and whether this
 * call finished it.
 */
export async function advance(
  sitting: SittingRecord,
  now: Date,
  userId: string | null,
  submitted?: { key: ModuleKey; at: Date }
): Promise<{ sitting: SittingRecord; finishedNow: boolean }> {
  let plan = sitting.plan;
  let changed = false;
  for (let step = 0; step < 12; step++) {
    const stage = stageOf(plan, now);
    if (stage.stage === "module" && submitted && stage.module.key === submitted.key) {
      await gradeModule(sitting, stage.module);
      plan = closeModule(plan, stage.module.key, endTime(stage.module, submitted.at));
      submitted = undefined;
      changed = true;
      continue;
    }
    if (stage.stage === "close") {
      await gradeModule(sitting, stage.module);
      plan = closeModule(plan, stage.module.key, stage.at);
      changed = true;
      continue;
    }
    if (stage.stage === "route") {
      const key = stage.module.key as "rw2" | "m2";
      const module1 = key === "rw2" ? "rw1" : "m1";
      const answers = await gradedAnswers(sitting, plan, [module1]);
      const form = await loadForm(sitting.form);
      if (!form) throw new ExamError("This exam is not available", "missing");
      plan = routeModule2(plan, key, chooseRoute(MODULE_INFO[key].section, answers), form.items);
      changed = true;
      continue;
    }
    if (stage.stage === "start-math") {
      plan = startAfterBreak(plan, now);
      changed = true;
      continue;
    }
    break;
  }
  if (changed) {
    const saved = await savePlan(sitting.id, sitting.plan, plan);
    if (!saved) {
      // Another tab moved it on first: read what it saved.
      const fresh = await sittingById(sitting.id);
      if (!fresh) throw new ExamError("This exam is not available", "missing");
      return { sitting: fresh, finishedNow: false };
    }
    plan = { ...plan, rev: sitting.plan.rev + 1 };
  }
  let current: SittingRecord = { ...sitting, plan };
  let finishedNow = false;
  if (stageOf(plan, now).stage === "done" && !sitting.completedAt) {
    const result = await finish(current, plan, userId, now);
    current = { ...current, result, coins: result.coins, completedAt: result.completedAt };
    finishedNow = true;
  }
  return { sitting: current, finishedNow };
}

// ---------------------------------------------------------------------------------------------------
// Views

async function moduleView(
  sitting: SittingRecord,
  part: PlannedModule,
  deadline: Date
): Promise<ModuleView> {
  const [questions, responses] = await Promise.all([
    loadExamQuestions(part.questionIds),
    readResponses(sitting.id),
  ]);
  const info = MODULE_INFO[part.key];
  const saved: ModuleView["saved"] = {};
  for (const r of responses)
    if (r.module === part.key)
      saved[r.question_id] = {
        answer: r.answer,
        flagged: r.flagged,
        seconds: r.seconds,
        changes: r.changes,
      };
  return {
    key: part.key,
    section: info.section,
    number: info.number,
    title: `Section ${info.section === "reading" ? 1 : 2}, Module ${info.number}: ${SECTION_TITLE[info.section]}`,
    questions: part.questionIds
      .map((id) => questions.get(id))
      .filter((q): q is ExamQuestion => !!q)
      .map((q) => toCatalogStudentQuestion(q.snapshot)),
    saved,
    deadline: deadline.toISOString(),
    seconds: part.seconds,
  };
}

export async function viewOf(sitting: SittingRecord, now: Date): Promise<SittingView> {
  const base = { sittingId: sitting.id, form: sitting.form, serverNow: now.toISOString() };
  if (sitting.result) return { stage: "done", ...base, result: sitting.result };
  const stage = stageOf(sitting.plan, now);
  if (stage.stage === "break")
    return { stage: "break", ...base, endsAt: stage.endsAt.toISOString() };
  if (stage.stage === "module")
    return {
      stage: "module",
      ...base,
      module: await moduleView(sitting, stage.module, stage.deadline),
    };
  throw new ExamError("This exam could not be loaded. Reload the page.", "state");
}

// ---------------------------------------------------------------------------------------------------
// The exam list and the start

export type ExamListItem = {
  form: number;
  status: "done" | "in-progress" | "next" | "later";
  total: number | null;
  completedAt: string | null;
};

export type ExamList = {
  exams: ExamListItem[];
  next: number | null;
  window: { open: boolean; opensAt: string; closesAt: string; zone: string };
  zoneKnown: boolean;
  passes: number;
  opensWith: "window" | "test-switch" | "pass" | null;
  access: Access;
  /** An exam started and not finished (it keeps its own time). */
  running: number | null;
};

function windowView(window: ExamWindow) {
  return {
    open: window.open,
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
    zone: window.zone,
  };
}

export async function examList(studentId: string, access: Access, now: Date): Promise<ExamList> {
  const [forms, sittings, facts] = await Promise.all([
    formNumbers(),
    sittingsOf(studentId),
    studentFacts(studentId),
  ]);
  const byForm = new Map(sittings.map((s) => [s.form, s]));
  const next = forms.find((form) => !byForm.has(form)) ?? null;
  const window = examWindow(now, facts.timeZone ?? FALLBACK_TIME_ZONE);
  const running = sittings.find((s) => !s.completedAt && stageOf(s.plan, now).stage !== "done");
  return {
    exams: forms.map((form) => {
      const s = byForm.get(form);
      return {
        form,
        status: s ? (s.completedAt ? "done" : "in-progress") : form === next ? "next" : "later",
        total: s?.result?.total ?? null,
        completedAt: s?.completedAt ?? null,
      };
    }),
    next,
    window: windowView(window),
    zoneKnown: facts.timeZone !== null,
    passes: facts.examPasses,
    opensWith: howToOpen({ window, testSwitch: access.testSwitch, passes: facts.examPasses }),
    access,
    running: running?.form ?? null,
  };
}

export type StartInfo = {
  form: number;
  level: "standard" | "hard";
  opensWith: "window" | "test-switch" | "pass";
  window: { open: boolean; opensAt: string; closesAt: string; zone: string };
  passes: number;
  accommodation: number;
  modules: { key: ModuleKey; title: string; questions: number; minutes: number }[];
};

/** Whether a new exam can be started now, and how; throws ExamError when it cannot. */
async function checkStart(studentId: string, form: number, access: Access, now: Date) {
  const [forms, sittings, facts] = await Promise.all([
    formNumbers(),
    sittingsOf(studentId),
    studentFacts(studentId),
  ]);
  if (!forms.includes(form)) throw new ExamError("This exam is not available", "missing");
  if (sittings.some((s) => s.form === form))
    throw new ExamError("This exam was already started", "state");
  const next = forms.find((f) => !sittings.some((s) => s.form === f));
  if (form !== next)
    throw new ExamError(`Exams go in order. Your next one is Exam ${next}.`, "order");
  if (access.limit !== null && access.used >= access.limit)
    throw new ExamError("Your plan includes one full-length exam. Upgrade for all 20.", "limit");
  const window = examWindow(now, facts.timeZone ?? FALLBACK_TIME_ZONE);
  const opensWith = howToOpen({ window, testSwitch: access.testSwitch, passes: facts.examPasses });
  if (!opensWith)
    throw new ExamError("Full-length exams open on Saturday from 6 am to midnight.", "closed");
  return { facts, window, opensWith };
}

export async function startInfo(
  studentId: string,
  form: number,
  access: Access,
  now: Date
): Promise<StartInfo> {
  const { facts, window, opensWith } = await checkStart(studentId, form, access, now);
  const stored = await loadForm(form);
  if (!stored) throw new ExamError("This exam is not available", "missing");
  return {
    form,
    level: stored.level,
    opensWith,
    window: windowView(window),
    passes: facts.examPasses,
    accommodation: facts.accommodation,
    modules: MODULE_ORDER.map((key) => {
      const info = MODULE_INFO[key];
      return {
        key,
        title: `${SECTION_TITLE[info.section]}, Module ${info.number}`,
        questions: info.size,
        minutes: Math.round(info.minutes * facts.accommodation),
      };
    }),
  };
}

export async function startExam(input: {
  studentId: string;
  form: number;
  access: Access;
  timeZone: string | null;
  now: Date;
}): Promise<SittingView> {
  const { facts, opensWith } = await checkStart(
    input.studentId,
    input.form,
    input.access,
    input.now
  );
  const stored = await loadForm(input.form);
  if (!stored) throw new ExamError("This exam is not available", "missing");
  const plan = newPlan({
    form: input.form,
    level: stored.level,
    items: stored.items,
    accommodation: facts.accommodation,
    startedAt: input.now,
  });
  const zone = facts.timeZone ?? validTimeZone(input.timeZone) ?? FALLBACK_TIME_ZONE;
  await insertSitting({
    studentId: input.studentId,
    form: input.form,
    timeZone: zone,
    openedBy: opensWith,
    plan,
  });
  const sitting = await findSitting(input.studentId, input.form);
  if (!sitting) throw new ExamError("This exam could not be started", "state");
  return viewOf(sitting, input.now);
}

// ---------------------------------------------------------------------------------------------------
// During the exam

async function owned(studentId: string, sittingId: string): Promise<SittingRecord> {
  const sitting = await sittingById(sittingId);
  if (!sitting || sitting.studentId !== studentId)
    throw new ExamError("This exam is not available", "missing");
  return sitting;
}

export async function sittingState(
  studentId: string,
  form: number,
  userId: string | null,
  now: Date
) {
  const sitting = await findSitting(studentId, form);
  if (!sitting) return null;
  const moved = await advance(sitting, now, userId);
  return { view: await viewOf(moved.sitting, now), finishedNow: moved.finishedNow };
}

function rowsFor(part: PlannedModule, answers: readonly ExamAnswerInput[]): ResponseRow[] {
  const position = new Map(part.questionIds.map((id, i) => [id, i]));
  return answers
    .filter((a) => position.has(a.questionId))
    .map((a) => ({
      module: part.key,
      position: position.get(a.questionId)!,
      question_id: a.questionId,
      answer: a.answer && a.answer.trim() ? a.answer.trim().slice(0, 40) : null,
      is_correct: null,
      trial: part.trialIds.includes(a.questionId),
      seconds: Math.max(0, Math.min(86400, Math.round(a.seconds))),
      changes: Math.max(0, Math.min(999, Math.round(a.changes))),
      flagged: a.flagged,
    }));
}

/** Saves answers for the module that is running; refused once its time (and grace) is over. */
export async function saveAnswers(input: {
  studentId: string;
  sittingId: string;
  module: ModuleKey;
  answers: readonly ExamAnswerInput[];
  now: Date;
}): Promise<{ saved: number }> {
  const sitting = await owned(input.studentId, input.sittingId);
  const part = moduleOf(sitting.plan, input.module);
  if (!acceptsAnswers(part, input.now)) throw new ExamError("Time is up for this part.", "late");
  const rows = rowsFor(part, input.answers);
  await writeResponses(sitting.id, rows);
  return { saved: rows.length };
}

/** Saves the last answers, ends the module now, grades it and moves on. */
export async function submitModule(input: {
  studentId: string;
  userId: string | null;
  sittingId: string;
  module: ModuleKey;
  answers: readonly ExamAnswerInput[];
  now: Date;
}) {
  const sitting = await owned(input.studentId, input.sittingId);
  const part = moduleOf(sitting.plan, input.module);
  if (acceptsAnswers(part, input.now))
    await writeResponses(sitting.id, rowsFor(part, input.answers));
  const moved = await advance(sitting, input.now, input.userId, {
    key: input.module,
    at: input.now,
  });
  return { view: await viewOf(moved.sitting, input.now), finishedNow: moved.finishedNow };
}

/** Ends the break early: Math starts now. */
export async function endBreak(input: {
  studentId: string;
  userId: string | null;
  sittingId: string;
  now: Date;
}) {
  const sitting = await owned(input.studentId, input.sittingId);
  const plan = startAfterBreak(sitting.plan, input.now);
  if (plan.modules[2].startedAt !== sitting.plan.modules[2].startedAt)
    await savePlan(sitting.id, sitting.plan, plan);
  const fresh = (await sittingById(sitting.id))!;
  const moved = await advance(fresh, input.now, input.userId);
  return { view: await viewOf(moved.sitting, input.now), finishedNow: moved.finishedNow };
}
