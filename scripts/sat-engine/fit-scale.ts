/*
 * Fits the theta-to-scale curve for each section from College Board's official raw-score
 * conversion tables for the paper (linear) practice tests, then checks it by leaving each test
 * out in turn.
 *
 *   npx tsx scripts/sat-engine/fit-scale.ts
 *
 * Reads scripts/sat-engine/official-tables/test*.json. Writes
 * src/lib/sat-engine/data/scale-knots.json and scripts/sat-engine/out/fit-report.json.
 *
 * Method: a model linear form (blueprint difficulty mix, cold-start parameters) gives the
 * flat-prior EAP theta for each raw score. Pairing that theta with the official score (middle of the official
 * range) for every test gives points on the theta-to-scale curve; the knots average the tests.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { THETA_MIN, UNIFORM_GRID, summedScoreEap, type ItemParams } from "@/lib/sat-engine/irt";
import type { Section } from "@/lib/sat-engine/params";
import { linearForm } from "./reference-forms";

type Row = { raw: number; low: number; high: number };
type Table = { test: number; RW: Row[]; Math: Row[] };

const HERE = path.dirname(new URL(import.meta.url).pathname);
const KNOTS = Array.from({ length: 41 }, (_, i) => THETA_MIN + i * 0.25);

/**
 * Theta for each raw score on a linear form: the EAP under the flat prior on [-5, 5] that the
 * Digital SAT uses for routing. In the middle of the range this matches maximum likelihood;
 * unlike maximum likelihood it stays sensible for raw scores below the guessing floor.
 */
function rawToTheta(items: readonly ItemParams[]): number[] {
  return summedScoreEap(items, UNIFORM_GRID).map((e) => e.theta);
}

/**
 * Loads the official tables, keeping one copy of tables that are printed identically (Practice
 * Tests 1-4 share one table), so a shared table isn't counted four times or validated on itself.
 */
export function loadTables(): (Table & { tests: number[] })[] {
  const dir = path.join(HERE, "official-tables");
  const all = readdirSync(dir)
    .filter((f) => /^test\d+\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Table)
    .sort((p, q) => p.test - q.test);
  const byContent = new Map<string, Table & { tests: number[] }>();
  for (const t of all) {
    const key = JSON.stringify([t.RW, t.Math]);
    const seen = byContent.get(key);
    if (seen) seen.tests.push(t.test);
    else byContent.set(key, { ...t, tests: [t.test] });
  }
  return [...byContent.values()];
}

const rowsOf = (t: Table, s: Section) => (s === "reading" ? t.RW : t.Math);
const mid = (r: Row) => (r.low + r.high) / 2;

/** Official score at `theta` for one test, interpolating between that test's raw scores. */
function officialAt(thetas: number[], rows: Row[], theta: number): number {
  if (theta <= thetas[0]) return mid(rows[0]);
  for (let r = 1; r < thetas.length; r++) {
    if (theta <= thetas[r]) {
      const t = (theta - thetas[r - 1]) / (thetas[r] - thetas[r - 1]);
      return mid(rows[r - 1]) + t * (mid(rows[r]) - mid(rows[r - 1]));
    }
  }
  return mid(rows[rows.length - 1]);
}

export function fitKnots(tables: Table[], section: Section) {
  const curves = tables.map((t) => {
    const rows = rowsOf(t, section);
    const thetas = rawToTheta(linearForm(section, rows.length - 1));
    return { thetas, rows };
  });
  const scale = KNOTS.map((k) => {
    const v = curves.reduce((s, c) => s + officialAt(c.thetas, c.rows, k), 0) / curves.length;
    return Math.round(v * 10) / 10;
  });
  return { theta: KNOTS, scale };
}

function interpolate(knots: { theta: number[]; scale: number[] }, x: number) {
  const { theta, scale } = knots;
  if (x <= theta[0]) return scale[0];
  for (let i = 1; i < theta.length; i++)
    if (x <= theta[i])
      return (
        scale[i - 1] + ((x - theta[i - 1]) / (theta[i] - theta[i - 1])) * (scale[i] - scale[i - 1])
      );
  return scale[scale.length - 1];
}

const round10 = (x: number) => Math.max(200, Math.min(800, Math.round(x / 10) * 10));

/** Leave one test out: predict its table from the others and compare to the official one. */
export function leaveOneOut(tables: (Table & { tests: number[] })[], section: Section) {
  return tables.map((held) => {
    const knots = fitKnots(
      tables.filter((t) => t !== held),
      section
    );
    const rows = rowsOf(held, section);
    const thetas = rawToTheta(linearForm(section, rows.length - 1));
    const errors = rows.map((r, i) => round10(interpolate(knots, thetas[i])) - mid(r));
    const inRange = rows.filter((r, i) => {
      const p = round10(interpolate(knots, thetas[i]));
      return p >= r.low && p <= r.high;
    }).length;
    const width = rows.reduce((sum, r) => sum + r.high - r.low, 0) / rows.length;
    return {
      tests: (held as Table & { tests: number[] }).tests,
      officialRangeWidth: +width.toFixed(1),
      meanAbsError: +(errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length).toFixed(1),
      maxAbsError: Math.max(...errors.map(Math.abs)),
      shareInsideOfficialRange: +(inRange / rows.length).toFixed(3),
    };
  });
}

function main() {
  const tables = loadTables();
  if (!tables.length) throw new Error("No official tables in scripts/sat-engine/official-tables");
  const knots = {
    note: `Fitted by scripts/sat-engine/fit-scale.ts from College Board paper practice tests ${tables
      .flatMap((t) => t.tests)
      .join(", ")}.`,
    reading: fitKnots(tables, "reading"),
    math: fitKnots(tables, "math"),
  };
  writeFileSync(
    path.join(HERE, "../../src/lib/sat-engine/data/scale-knots.json"),
    JSON.stringify(knots, null, 1) + "\n"
  );
  const report = {
    tables: tables.map((t) => t.tests),
    reading: leaveOneOut(tables, "reading"),
    math: leaveOneOut(tables, "math"),
  };
  mkdirSync(path.join(HERE, "out"), { recursive: true });
  writeFileSync(path.join(HERE, "out/fit-report.json"), JSON.stringify(report, null, 1) + "\n");
  console.log(JSON.stringify(report, null, 1));
}

if (process.argv[1]?.endsWith("fit-scale.ts")) main();
