/*
 * Simulates full adaptive exams to check the engine end to end, with no real students:
 *
 *   npx tsx scripts/sat-engine/validate.ts
 *
 * 1. Builds a synthetic question pool shaped like the release exams, where each question's true
 *    parameters differ from Karman's 1-7 rating guess (cold start).
 * 2. Assembles standard and hard full-length forms (Module 1 plus easier and harder Module 2).
 * 3. Simulated students with known ability answer from the true parameters.
 * 4. Scores them three ways: with cold-start parameters, after calibrating on a first group of
 *    students, and with the true parameters (the best possible). Reports the error against the
 *    score each student truly deserves, how often routing matches, and path checks.
 *
 * Writes scripts/sat-engine/out/validate-report.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assemblePanels, type AssembledModule, type SectionPanel } from "@/lib/sat-engine/assemble";
import { calibrate, type Answer } from "@/lib/sat-engine/calibrate";
import type { ItemParams } from "@/lib/sat-engine/irt";
import { coldStartParams, type EngineItem, type Section } from "@/lib/sat-engine/params";
import { routeHarder } from "@/lib/sat-engine/routing";
import { sectionScaleScore } from "@/lib/sat-engine/scale";
import { scoreSection } from "@/lib/sat-engine/scoring";
import { answer, normal, rng, syntheticPool } from "@/lib/sat-engine/simulate";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const STUDENTS = Number(process.env.STUDENTS ?? 2000);
const CALIBRATION_STUDENTS = Number(process.env.CALIBRATION_STUDENTS ?? 1500);

type Sitting = {
  person: string;
  theta: number;
  module1: { item: EngineItem; correct: boolean }[];
  module2: { item: EngineItem; correct: boolean }[];
  route: "harder" | "easier";
  idealRoute: "harder" | "easier";
};

const operational = (m: AssembledModule) => m.slots.filter((s) => !s.pretest).map((s) => s.item);

/** One student sits one section. Routing uses the parameters the engine believes. */
function sit(
  panel: SectionPanel,
  theta: number,
  person: string,
  truth: Map<string, ItemParams>,
  believed: (i: EngineItem) => ItemParams,
  random: () => number
): Sitting {
  const take = (items: EngineItem[]) =>
    items.map((item) => ({ item, correct: answer(random, truth.get(item.id)!, theta) }));
  const module1 = take(operational(panel.module1));
  const harder = routeHarder(
    module1.map((r) => ({ item: believed(r.item), correct: r.correct })),
    panel.routing
  );
  const route = harder ? "harder" : "easier";
  return {
    person,
    theta,
    module1,
    module2: take(operational(harder ? panel.harder : panel.easier)),
    route,
    idealRoute: theta >= panel.routing.thetaCut ? "harder" : "easier",
  };
}

function score(section: Section, s: Sitting, params: (i: EngineItem) => ItemParams) {
  const withParams = (rs: Sitting["module1"]) =>
    rs.map((r) => ({
      item: { ...r.item, calibrated: { params: params(r.item), responses: 1e9 } },
      correct: r.correct,
    }));
  return scoreSection({
    section,
    module1: withParams(s.module1),
    module2: withParams(s.module2),
    route: s.route,
  });
}

function summarise(errors: number[]) {
  const n = errors.length;
  const mean = errors.reduce((a, e) => a + e, 0) / n;
  return {
    meanAbsError: +(errors.reduce((a, e) => a + Math.abs(e), 0) / n).toFixed(1),
    rmse: +Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / n).toFixed(1),
    bias: +mean.toFixed(1),
    within30: +(errors.filter((e) => Math.abs(e) <= 30).length / n).toFixed(3),
  };
}

function main() {
  const { items, truth } = syntheticPool({ seed: 7, perSkill: 45, truthNoise: 0.5 });
  const panels = assemblePanels(items, {
    count: 2,
    levels: ["standard", "hard"],
    seed: "validate",
  });
  const random = rng(11);
  const report: Record<string, unknown>[] = [];

  for (const panel of panels) {
    for (const sp of panel.sections) {
      const section = sp.section;
      const cold = (i: EngineItem) => coldStartParams(i);
      const truthOf = (i: EngineItem) => truth.get(i.id)!;

      // A first group of students sits the form; their answers calibrate its questions.
      const first = Array.from({ length: CALIBRATION_STUDENTS }, (_, k) =>
        sit(sp, normal(random), `c${k}`, truth, cold, random)
      );
      const answers: Answer[] = first.flatMap((s) =>
        [...s.module1, ...s.module2].map((r) => ({
          person: s.person,
          item: r.item.id,
          correct: r.correct,
        }))
      );
      const formItems = [...new Set([sp.module1, sp.easier, sp.harder].flatMap(operational))];
      const fitted = calibrate(
        formItems.map((i) => ({ id: i.id, start: cold(i), fixC: i.format === "student-produced" })),
        answers
      );
      const calibrated = (i: EngineItem) => fitted.items.get(i.id)?.params ?? cold(i);

      const results = { cold: [] as number[], calibrated: [] as number[], truth: [] as number[] };
      let routeMatches = 0;
      let insideRange = 0;
      const easierScores: number[] = [];
      for (let k = 0; k < STUDENTS; k++) {
        const theta = normal(random);
        const deserved = sectionScaleScore(section, theta);
        const s = sit(sp, theta, `s${k}`, truth, calibrated, random);
        if (s.route === s.idealRoute) routeMatches++;
        const coldScore = score(section, s, cold);
        const calScore = score(section, s, calibrated);
        results.cold.push(coldScore.score - deserved);
        results.calibrated.push(calScore.score - deserved);
        results.truth.push(score(section, s, truthOf).score - deserved);
        if (deserved >= calScore.low && deserved <= calScore.high) insideRange++;
        if (s.route === "easier") easierScores.push(calScore.score);
      }
      const shortfall = [sp.module1, sp.easier, sp.harder].reduce((a, m) => a + m.shortfall, 0);
      report.push({
        form: panel.form,
        level: panel.level,
        section,
        routingCut: {
          theta: +sp.routing.thetaCut.toFixed(2),
          module1NumberRight: sp.routing.numberRight,
        },
        moduleSizes: [sp.module1, sp.easier, sp.harder].map((m) => operational(m).length),
        shortfall,
        coldStart: summarise(results.cold),
        afterCalibration: { students: CALIBRATION_STUDENTS, ...summarise(results.calibrated) },
        trueParameters: summarise(results.truth),
        routingMatchesTrueAbility: +(routeMatches / STUDENTS).toFixed(3),
        shareInsideReportedRange: +(insideRange / STUDENTS).toFixed(3),
        highestEasierPathScore: Math.max(...easierScores),
      });
    }
  }
  mkdirSync(path.join(HERE, "out"), { recursive: true });
  writeFileSync(
    path.join(HERE, "out/validate-report.json"),
    JSON.stringify(report, null, 1) + "\n"
  );
  console.log(JSON.stringify(report, null, 1));
}

main();
