/*
 * The shape and clock of one exam sitting, like the digital SAT: Reading and Writing in two 27-question
 * modules of 32 minutes, a 10-minute break, then Math in two 22-question modules of 35 minutes. Module 2 is
 * the easier or the harder one depending on Module 1. Once started the exam keeps its own time: each
 * module starts when the one before it ends, and Math starts when the student ends the break or when the
 * break runs out, whichever comes first, so leaving the page never stops the clock. Pure: the caller
 * passes `now`, and grading happens outside (src/lib/exams/service.ts).
 */
import { z } from "zod";

export type ExamSection = "reading" | "math";
export type ModuleKey = "rw1" | "rw2" | "m1" | "m2";
export type FormModule = "module1" | "easier" | "harder";

export const MODULE_ORDER: readonly ModuleKey[] = ["rw1", "rw2", "m1", "m2"];

export const MODULE_INFO: Record<
  ModuleKey,
  { section: ExamSection; number: 1 | 2; size: number; minutes: number }
> = {
  rw1: { section: "reading", number: 1, size: 27, minutes: 32 },
  rw2: { section: "reading", number: 2, size: 27, minutes: 32 },
  m1: { section: "math", number: 1, size: 22, minutes: 35 },
  m2: { section: "math", number: 2, size: 22, minutes: 35 },
};

export const SECTION_TITLE: Record<ExamSection, string> = {
  reading: "Reading and Writing",
  math: "Math",
};

export const BREAK_SECONDS = 600;
/** A save that arrives this long after a deadline still counts (a slow network, not extra time). */
export const GRACE_SECONDS = 20;

/** Extra time a tutor or admin has set for the student (users.timing_accommodation). */
export const ACCOMMODATION: Record<string, number> = {
  standard: 1,
  time_and_half: 1.5,
  double: 2,
};

const plannedModuleSchema = z.object({
  key: z.enum(["rw1", "rw2", "m1", "m2"]),
  kind: z.enum(["module1", "easier", "harder"]).nullable(),
  questionIds: z.array(z.string().uuid()).max(40),
  trialIds: z.array(z.string().uuid()).max(4),
  seconds: z.number().int().min(60).max(14400),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

export const sittingPlanSchema = z.object({
  version: z.literal(1),
  form: z.number().int().min(1).max(99),
  level: z.enum(["standard", "hard"]),
  accommodation: z.number().min(1).max(2),
  modules: z.array(plannedModuleSchema).length(4),
  breakEndsAt: z.string().nullable(),
});

export type PlannedModule = z.infer<typeof plannedModuleSchema>;
export type SittingPlan = z.infer<typeof sittingPlanSchema>;

/** The questions of one stored module, in order. */
export type FormModuleItems = { questionIds: string[]; trialIds: string[] };
export type FormItems = Record<ExamSection, Record<FormModule, FormModuleItems>>;

const ms = (iso: string) => new Date(iso).getTime();

/** A new plan with Reading and Writing Module 1 starting at `startedAt`. */
export function newPlan(input: {
  form: number;
  level: "standard" | "hard";
  items: FormItems;
  accommodation: number;
  startedAt: Date;
}): SittingPlan {
  const seconds = (key: ModuleKey) =>
    Math.round(MODULE_INFO[key].minutes * 60 * input.accommodation);
  const module1 = (key: ModuleKey): PlannedModule => {
    const items = input.items[MODULE_INFO[key].section].module1;
    return {
      key,
      kind: "module1",
      questionIds: items.questionIds,
      trialIds: items.trialIds,
      seconds: seconds(key),
      startedAt: null,
      endedAt: null,
    };
  };
  const later = (key: ModuleKey): PlannedModule => ({
    key,
    kind: null,
    questionIds: [],
    trialIds: [],
    seconds: seconds(key),
    startedAt: null,
    endedAt: null,
  });
  const rw1 = { ...module1("rw1"), startedAt: input.startedAt.toISOString() };
  return {
    version: 1,
    form: input.form,
    level: input.level,
    accommodation: input.accommodation,
    modules: [rw1, later("rw2"), module1("m1"), later("m2")],
    breakEndsAt: null,
  };
}

export function moduleOf(plan: SittingPlan, key: ModuleKey): PlannedModule {
  return plan.modules.find((m) => m.key === key)!;
}

/** The first module not yet ended, or null when the exam is over. */
export function currentModule(plan: SittingPlan): PlannedModule | null {
  return plan.modules.find((m) => m.endedAt === null) ?? null;
}

export function deadlineOf(module: PlannedModule): Date | null {
  return module.startedAt ? new Date(ms(module.startedAt) + module.seconds * 1000) : null;
}

/** Past its deadline, grace included: the server closes it with the answers saved so far. */
export function isOverdue(module: PlannedModule, now: Date): boolean {
  const deadline = deadlineOf(module);
  return deadline !== null && now.getTime() > deadline.getTime() + GRACE_SECONDS * 1000;
}

/** Whether a save for this module may still be accepted at `now`. */
export function acceptsAnswers(module: PlannedModule, now: Date): boolean {
  return module.startedAt !== null && module.endedAt === null && !isOverdue(module, now);
}

/** When a module ended: the moment it was submitted, never later than its deadline. */
export function endTime(module: PlannedModule, submittedAt: Date): Date {
  const deadline = deadlineOf(module);
  return deadline && submittedAt > deadline ? deadline : submittedAt;
}

export type Stage =
  | { stage: "module"; module: PlannedModule; deadline: Date }
  | { stage: "break"; endsAt: Date }
  | { stage: "route"; module: PlannedModule }
  | { stage: "start-math" }
  | { stage: "close"; module: PlannedModule; at: Date }
  | { stage: "done" };

/**
 * What the sitting needs at `now`. "route" (grade Module 1, pick Module 2), "start-math" (the break is over)
 * and "close" (a module ran out of time) are steps the service takes before asking again; "module",
 * "break" and "done" are what the student sees.
 */
export function stageOf(plan: SittingPlan, now: Date): Stage {
  const current = currentModule(plan);
  if (!current) return { stage: "done" };
  if (current.kind === null) return { stage: "route", module: current };
  if (current.startedAt === null) {
    if (plan.breakEndsAt && now < new Date(plan.breakEndsAt))
      return { stage: "break", endsAt: new Date(plan.breakEndsAt) };
    return { stage: "start-math" };
  }
  if (isOverdue(current, now)) return { stage: "close", module: current, at: deadlineOf(current)! };
  return { stage: "module", module: current, deadline: deadlineOf(current)! };
}

/** Ends `key` at `at`; ending Reading and Writing Module 2 starts the break. */
export function closeModule(plan: SittingPlan, key: ModuleKey, at: Date): SittingPlan {
  const next = structuredClone(plan);
  next.modules[MODULE_ORDER.indexOf(key)].endedAt = at.toISOString();
  if (key === "rw2") next.breakEndsAt = new Date(at.getTime() + BREAK_SECONDS * 1000).toISOString();
  return next;
}

/** Sets a Module 2 to the easier or harder module; it starts when its Module 1 ended. */
export function routeModule2(
  plan: SittingPlan,
  key: "rw2" | "m2",
  route: "easier" | "harder",
  items: FormItems
): SittingPlan {
  const next = structuredClone(plan);
  const index = MODULE_ORDER.indexOf(key);
  const module1 = next.modules[index - 1];
  const stored = items[MODULE_INFO[key].section][route];
  next.modules[index] = {
    ...next.modules[index],
    kind: route,
    questionIds: stored.questionIds,
    trialIds: stored.trialIds,
    startedAt: module1.endedAt,
  };
  return next;
}

/** Starts Math Module 1: when the student ends the break, or when the break runs out. */
export function startAfterBreak(plan: SittingPlan, now: Date): SittingPlan {
  const next = structuredClone(plan);
  const m1 = next.modules[2];
  if (m1.startedAt !== null || next.modules[1].endedAt === null) return next;
  const breakEnd = next.breakEndsAt ? new Date(next.breakEndsAt) : now;
  m1.startedAt = (now < breakEnd ? now : breakEnd).toISOString();
  return next;
}

/** The latest moment the whole exam can end, from its first start. */
export function latestEnd(plan: SittingPlan): Date | null {
  const start = plan.modules[0].startedAt;
  if (!start) return null;
  const seconds = plan.modules.reduce((sum, m) => sum + m.seconds, 0) + BREAK_SECONDS;
  return new Date(ms(start) + seconds * 1000);
}
