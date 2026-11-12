import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankItem } from "./forms";
import { MODULE_BLUEPRINT } from "./forms";
import type { RunRecord, RunResponse } from "./run-types";

const m = vi.hoisted(() => ({
  findOpenRun: vi.fn(),
  latestFinishedRun: vi.fn(),
  answeredInRuns: vi.fn(),
  insertRun: vi.fn(),
  loadResponses: vi.fn(),
  updateRun: vi.fn(),
  loadAdmittedBank: vi.fn(),
  loadQuizAccess: vi.fn(),
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  updates: [] as { table: string; row: Record<string, unknown> }[],
  assigned: [] as { id: string }[],
}));

vi.mock("./run-store", () => ({
  findOpenRun: m.findOpenRun,
  latestFinishedRun: m.latestFinishedRun,
  answeredInRuns: m.answeredInRuns,
  insertRun: m.insertRun,
  loadResponses: m.loadResponses,
  updateRun: m.updateRun,
}));
vi.mock("./bank", () => ({
  loadAdmittedBank: m.loadAdmittedBank,
  skillsInSection: (section: string) => [`${section}-skills`],
}));
vi.mock("./plan-gate", async () => {
  class PlanLimitError extends Error {}
  return { PlanLimitError, loadQuizAccess: m.loadQuizAccess };
});
// The view is the run machinery's own (tested with it); here it echoes the record.
vi.mock("./run-view", async (actual) => ({
  ...(await actual<typeof import("./run-view")>()),
  buildView: (r: RunRecord) => ({ id: r.id, sections: r.form.sections }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        not: () => chain,
        lte: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: m.assigned, error: null }),
        insert: (row: Record<string, unknown>) => {
          m.inserts.push({ table, row });
          return Promise.resolve({ error: null });
        },
        update: (row: Record<string, unknown>) => {
          m.updates.push({ table, row });
          return chain;
        },
      };
      return chain;
    },
  }),
}));

import { PlanLimitError } from "./plan-gate";
import { finishTimeTrial, loadTrialStatus, startTimeTrial, trialRoundOf } from "./time-trial-run";

function readingBank(): { items: BankItem[]; snapshots: Map<string, unknown> } {
  const items: BankItem[] = [];
  for (const { domainId } of MODULE_BLUEPRINT.reading)
    for (let q = 0; q < 12; q++) {
      items.push({
        id: `${domainId}-${q}`,
        skillId: `${domainId}-skill-${q % 3}`,
        domainId,
        section: "reading",
        difficulty: (q % 5) + 1,
        family: `${domainId}-${q}`,
      });
    }
  return { items, snapshots: new Map(items.map((i) => [i.id, { id: i.id }])) };
}

const run = (over: Partial<RunRecord> = {}): RunRecord => ({
  id: "11111111-1111-4111-8111-111111111111",
  studentId: "student-1",
  kind: "time-trial",
  runKey: "time-trial:reading:x",
  scope: "reading",
  form: {
    title: "Time trial",
    grading: "end",
    trial: { round: 2, multiplier: 1.2, referenceAccuracy: 0.7 },
    sections: [
      {
        key: "rw1",
        title: "Reading and Writing, round 2",
        subject: "reading",
        seconds: 853,
        questionIds: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"],
      },
    ],
  },
  snapshots: [],
  sequence: [],
  startedAt: "2026-11-12T08:00:00.000Z",
  completedAt: null,
  result: null,
  ...over,
});

const answer = (questionId: string, isCorrect: boolean, studentAnswer = "A"): RunResponse => ({
  ordinal: 0,
  sectionKey: "rw1",
  questionId,
  skillId: "s",
  difficulty: 3,
  studentAnswer,
  isCorrect,
  usedHint: false,
  seconds: 60,
  answeredAt: "2026-11-12T08:30:00.000Z",
  levelBefore: null,
  levelAfter: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.inserts.length = 0;
  m.updates.length = 0;
  m.assigned = [];
  m.findOpenRun.mockResolvedValue(null);
  m.latestFinishedRun.mockResolvedValue(null);
  m.answeredInRuns.mockResolvedValue(new Map());
  m.loadResponses.mockResolvedValue([]);
  m.loadAdmittedBank.mockResolvedValue(readingBank());
  m.loadQuizAccess.mockResolvedValue({ questionsLeft: null, maxDifficulty: 5 });
  m.insertRun.mockImplementation(async (input) => ({
    ...run(),
    ...input,
    id: "22222222-2222-4222-8222-222222222222",
    startedAt: "2026-11-12T09:00:00.000Z",
    completedAt: null,
    result: null,
  }));
});

describe("startTimeTrial", () => {
  it("starts round one at 1.25 times one real module", async () => {
    const view = await startTimeTrial("student-1", "reading");
    const input = m.insertRun.mock.calls[0][0];
    expect(input).toMatchObject({ kind: "time-trial", scope: "reading" });
    expect(input.form.trial).toEqual({ round: 1, multiplier: 1.25, referenceAccuracy: null });
    expect(input.form.grading).toBe("end");
    expect(input.form.sections[0].questionIds).toHaveLength(27);
    expect(input.form.sections[0].seconds).toBe(2400);
    expect(view.sections[0]).toMatchObject({
      title: "Reading and Writing, round 1",
      seconds: 2400,
    });
  });

  it("takes the next round's pace from the latest finished round", async () => {
    const done = run({ completedAt: "2026-11-11T10:00:00.000Z" });
    done.result = {
      right: 9,
      total: 10,
      sections: [],
      skills: [],
      tokens: 0,
      trial: trialRoundOf(done, [], 0)!,
    };
    done.result.trial = { ...done.result.trial!, nextMultiplier: 1.15, nextReferenceAccuracy: 0.9 };
    m.latestFinishedRun.mockResolvedValue(done);
    await startTimeTrial("student-1", "reading");
    const input = m.insertRun.mock.calls[0][0];
    expect(input.form.trial).toEqual({ round: 3, multiplier: 1.15, referenceAccuracy: 0.9 });
    expect(input.form.sections[0].seconds).toBe(2208);
  });

  it("resumes an open round instead of starting another", async () => {
    m.findOpenRun.mockResolvedValue(run());
    const view = await startTimeTrial("student-1", "reading");
    expect(m.insertRun).not.toHaveBeenCalled();
    expect(view.id).toBe(run().id);
  });

  it("keeps the per-question pace when the Free plan has fewer questions left", async () => {
    m.loadQuizAccess.mockResolvedValue({ questionsLeft: 9, maxDifficulty: 5 });
    await startTimeTrial("student-1", "reading");
    const section = m.insertRun.mock.calls[0][0].form.sections[0];
    expect(section.questionIds).toHaveLength(9);
    expect(section.seconds).toBe(800);
  });

  it("stops at the end of the Free plan and rejects unknown sections", async () => {
    m.loadQuizAccess.mockResolvedValue({ questionsLeft: 0, maxDifficulty: 5 });
    await expect(startTimeTrial("student-1", "reading")).rejects.toBeInstanceOf(PlanLimitError);
    await expect(startTimeTrial("student-1", "science")).rejects.toThrow();
  });
});

describe("loadTrialStatus", () => {
  it("shows round one for both sections with no history", async () => {
    const status = await loadTrialStatus("student-1");
    expect(status.map((s) => [s.section, s.standing.round, s.standing.multiplier, s.open])).toEqual(
      [
        ["reading", 1, 1.25, false],
        ["math", 1, 1.25, false],
      ]
    );
  });
});

describe("finishTimeTrial", () => {
  const finished = () =>
    run({
      completedAt: "2026-11-12T08:40:00.000Z",
      result: { right: 8, total: 10, sections: [], skills: [], tokens: 0 },
    });

  it("stores the round with the run and tightens the pace when accuracy holds", async () => {
    const rows = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"].map((id, i) =>
      answer(id, i < 8)
    );
    m.assigned = [{ id: "33333333-3333-4333-8333-333333333333" }];
    const out = await finishTimeTrial(finished(), rows, 600);
    expect(out.result?.trial).toMatchObject({
      round: 2,
      multiplier: 1.2,
      accuracy: 0.8,
      held: true,
      nextMultiplier: 1.15,
      elapsedSeconds: 600,
      timeUp: false,
    });
    expect(m.updateRun).toHaveBeenCalledWith(out.id, "student-1", { result: out.result });
    const history = m.inserts.find((i) => i.table === "time_trial_runs")!.row;
    expect(history).toMatchObject({
      section: "reading",
      target_seconds: 853,
      goal_seconds: 533,
      next_target_seconds: 818,
      beat: true,
      reason: "beat",
      assignment_id: "33333333-3333-4333-8333-333333333333",
    });
    expect(m.updates.find((u) => u.table === "student_assignments")).toBeTruthy();
  });

  it("scores what was answered at time-up and keeps the pace", async () => {
    const rows = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"].map((id, i) =>
      answer(id, i < 6, i < 7 ? "A" : "")
    );
    const out = await finishTimeTrial(finished(), rows, 2500);
    expect(out.result?.trial).toMatchObject({
      answered: 7,
      correct: 6,
      elapsedSeconds: 853,
      timeUp: true,
      held: false,
      nextMultiplier: 1.2,
    });
    expect(m.inserts[0].row).toMatchObject({ reason: "unfinished", finished: false });
  });

  it("does nothing twice", async () => {
    const once = await finishTimeTrial(finished(), [answer("q1", true)], 100);
    await finishTimeTrial(once, [answer("q1", true)], 100);
    expect(m.updateRun).toHaveBeenCalledTimes(1);
  });
});
