/*
 * Searches the settings (how hard the paper tests are vs the blueprint, difficulty spread,
 * discrimination) for the
 * ones that make the engine agree best with both College Board sources at once:
 *  - the official paper conversion tables (leave-one-test-out error), and
 *  - published Bluebook results (scripts/sat-engine/bluebook/datapoints.json).
 * For every setting the scale curve is refitted from the paper tables, exactly as fit-scale.ts does.
 *
 *   npx tsx scripts/sat-engine/tune-bluebook.ts
 *
 * Prints the best settings; writes scripts/sat-engine/out/tune-report.json. Changes nothing in src.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import knotsJson from "@/lib/sat-engine/data/scale-knots.json";
import { COLD_START_A, COLD_START_B, type Section } from "@/lib/sat-engine/params";
import { ROUTING_MEDIAN_SCORE } from "@/lib/sat-engine/routing";
import { predict, type DataPoint } from "./compare-bluebook";
import { fitKnots, leaveOneOut, loadTables } from "./fit-scale";
import { PAPER_FORM_SHIFT } from "./reference-forms";

const BASE_SHIFT = { ...PAPER_FORM_SHIFT };

const HERE = path.dirname(new URL(import.meta.url).pathname);
const BASE_B = { ...COLD_START_B };
const BASE_A = { ...COLD_START_A };
const ROUTING_BASE = { ...ROUTING_MEDIAN_SCORE };
const KNOTS = knotsJson as unknown as Record<Section, { theta: number[]; scale: number[] }>;
const SECTIONS: Section[] = ["reading", "math"];

const points = (
  JSON.parse(readFileSync(path.join(HERE, "bluebook/datapoints.json"), "utf8")) as DataPoint[]
).filter((p) => p.score != null || (p.score_low != null && p.score_high != null));
const official = (p: DataPoint) => p.score ?? (p.score_low! + p.score_high!) / 2;
const tables = loadTables();

/** Bluebook error for one point: deliberate all-wrong Module 2 runs use the engine's own MLE. */
function bluebookError(p: DataPoint): number | null {
  const got = predict(p);
  if (!got) return null;
  const allWrong = p.m2_correct === 0;
  return (allWrong ? got.best : got.count) - official(p);
}

function evaluate(section: Section, spread: number, aScale: number, median: number, shift = 0) {
  PAPER_FORM_SHIFT[section] = shift;
  for (const [k, v] of Object.entries(BASE_B)) COLD_START_B[+k] = v * spread;
  COLD_START_A[section] = BASE_A[section] * aScale;
  ROUTING_MEDIAN_SCORE[section] = median;
  KNOTS[section] = fitKnots(tables, section);
  const paper = leaveOneOut(tables, section);
  const paperMae = paper.reduce((s, r) => s + r.meanAbsError, 0) / paper.length;
  const errors = points
    .filter((p) => (p.section === "rw") === (section === "reading"))
    .map(bluebookError)
    .filter((e): e is number => e !== null);
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const bias = errors.reduce((s, e) => s + e, 0) / errors.length;
  return {
    shift,
    spread,
    aScale,
    median,
    paperMae: +paperMae.toFixed(1),
    bluebookMae: +mae.toFixed(1),
    bluebookBias: +bias.toFixed(1),
    n: errors.length,
  };
}

function main() {
  const report: Record<string, unknown> = {};
  for (const section of SECTIONS) {
    const results = [];
    for (const shift of [0, 0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5])
      for (const spread of [0.9, 1, 1.15])
        for (const aScale of [0.85, 1, 1.15])
          results.push(evaluate(section, spread, aScale, ROUTING_BASE[section], shift));
    results.sort((p, q) => p.bluebookMae + p.paperMae - (q.bluebookMae + q.paperMae));
    const current = evaluate(section, 1, 1, ROUTING_BASE[section], BASE_SHIFT[section]);
    report[section] = { current, best: results.slice(0, 10) };
    // Leave the section at its current settings for the next one.
    evaluate(section, 1, 1, ROUTING_BASE[section], BASE_SHIFT[section]);
  }
  mkdirSync(path.join(HERE, "out"), { recursive: true });
  writeFileSync(path.join(HERE, "out/tune-report.json"), JSON.stringify(report, null, 1) + "\n");
  console.log(JSON.stringify(report, null, 1));
}

main();
