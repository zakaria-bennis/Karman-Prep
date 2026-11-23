import { describe, expect, it } from "vitest";
import {
  BREAK_SECONDS,
  GRACE_SECONDS,
  acceptsAnswers,
  closeModule,
  currentModule,
  endTime,
  latestEnd,
  newPlan,
  routeModule2,
  sittingPlanSchema,
  stageOf,
  startAfterBreak,
  type FormItems,
} from "./plan";

const ids = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) =>
    `${prefix}${String(i).padStart(4, "0")}-0000-4000-8000-000000000000`.slice(0, 36)
  );
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const block = (start: number, size: number) => ({
  questionIds: Array.from({ length: size }, (_, i) => uuid(start + i)),
  trialIds: [uuid(start + 3), uuid(start + 7)],
});
const ITEMS: FormItems = {
  reading: { module1: block(0, 27), easier: block(100, 27), harder: block(200, 27) },
  math: { module1: block(300, 22), easier: block(400, 22), harder: block(500, 22) },
};
const T0 = new Date("2026-11-28T15:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

function fresh(accommodation = 1) {
  return newPlan({ form: 3, level: "standard", items: ITEMS, accommodation, startedAt: T0 });
}

describe("an exam sitting's clock", () => {
  it("starts with Reading and Writing Module 1 and checks against its schema", () => {
    const plan = fresh();
    expect(sittingPlanSchema.parse(plan)).toEqual(plan);
    expect(ids("a", 1)).toHaveLength(1);
    const stage = stageOf(plan, at(1));
    expect(stage.stage).toBe("module");
    if (stage.stage === "module") {
      expect(stage.module.key).toBe("rw1");
      expect(stage.deadline.toISOString()).toBe(at(32).toISOString());
    }
  });

  it("gives extra time with an accommodation", () => {
    expect(fresh(1.5).modules.map((m) => m.seconds)).toEqual([2880, 2880, 3150, 3150]);
  });

  it("routes Module 2, which starts when Module 1 ends", () => {
    let plan = closeModule(fresh(), "rw1", at(20));
    expect(stageOf(plan, at(20)).stage).toBe("route");
    plan = routeModule2(plan, "rw2", "harder", ITEMS);
    const stage = stageOf(plan, at(21));
    expect(stage.stage).toBe("module");
    if (stage.stage === "module") {
      expect(stage.module.questionIds).toEqual(ITEMS.reading.harder.questionIds);
      expect(stage.deadline.toISOString()).toBe(at(52).toISOString());
    }
  });

  it("closes a module that ran out of time, at its deadline, after the grace", () => {
    const plan = fresh();
    expect(stageOf(plan, new Date(at(32).getTime() + GRACE_SECONDS * 1000)).stage).toBe("module");
    const late = stageOf(plan, at(40));
    expect(late.stage).toBe("close");
    if (late.stage === "close") expect(late.at.toISOString()).toBe(at(32).toISOString());
    expect(endTime(plan.modules[0], at(40)).toISOString()).toBe(at(32).toISOString());
    expect(endTime(plan.modules[0], at(10)).toISOString()).toBe(at(10).toISOString());
    expect(acceptsAnswers(plan.modules[0], at(31))).toBe(true);
    expect(acceptsAnswers(plan.modules[0], at(40))).toBe(false);
  });

  it("takes a 10-minute break after Reading and Writing, then starts Math", () => {
    let plan = routeModule2(closeModule(fresh(), "rw1", at(30)), "rw2", "easier", ITEMS);
    plan = closeModule(plan, "rw2", at(60));
    const onBreak = stageOf(plan, at(61));
    expect(onBreak.stage).toBe("break");
    if (onBreak.stage === "break")
      expect(onBreak.endsAt.getTime()).toBe(at(60).getTime() + BREAK_SECONDS * 1000);
    // Ending the break early starts Math now.
    const early = startAfterBreak(plan, at(65));
    expect(early.modules[2].startedAt).toBe(at(65).toISOString());
    // Coming back late starts Math when the break ran out.
    expect(stageOf(plan, at(75)).stage).toBe("start-math");
    const late = startAfterBreak(plan, at(75));
    expect(late.modules[2].startedAt).toBe(at(70).toISOString());
  });

  it("is done after Math Module 2, and knows its latest possible end", () => {
    let plan = routeModule2(closeModule(fresh(), "rw1", at(32)), "rw2", "harder", ITEMS);
    plan = startAfterBreak(closeModule(plan, "rw2", at(64)), at(74));
    plan = routeModule2(closeModule(plan, "m1", at(109)), "m2", "easier", ITEMS);
    plan = closeModule(plan, "m2", at(144));
    expect(currentModule(plan)).toBeNull();
    expect(stageOf(plan, at(145)).stage).toBe("done");
    expect(latestEnd(fresh())?.toISOString()).toBe(at(144).toISOString());
  });
});
