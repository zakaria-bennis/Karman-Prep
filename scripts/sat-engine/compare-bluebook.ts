/*
 * Compares the engine with Bluebook: for each published Bluebook result (test, section, which
 * Module 2, right answers per module, score), what would the same right-answer counts score on a
 * Karman form built to the release-exam blueprint?
 *
 *   npx tsx scripts/sat-engine/compare-bluebook.ts [datapoints.json]
 *
 * Reads scripts/sat-engine/bluebook/datapoints.json by default. Writes
 * scripts/sat-engine/out/bluebook-report.json.
 *
 * A Bluebook result gives counts, not which questions were right, so the prediction uses the
 * expected-pattern score for that count on the model panel (flat-prior EAP over Module 1 plus the
 * Module 2 the student saw). Real Karman scores also depend on which questions were missed.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  UNIFORM_GRID,
  mle,
  summedScoreEap,
  type ItemParams,
  type Response,
} from "@/lib/sat-engine/irt";
import type { Section } from "@/lib/sat-engine/params";
import { routingRule, medianCut } from "@/lib/sat-engine/routing";
import { sectionScaleScore } from "@/lib/sat-engine/scale";
import { adaptiveModule } from "./reference-forms";

export type DataPoint = {
  test: string | number | null;
  section: "rw" | "math";
  route: "harder" | "easier" | null;
  m1_correct: number | null;
  m1_total: number | null;
  m2_correct: number | null;
  m2_total: number | null;
  total_correct: number | null;
  score: number | null;
  score_low?: number | null;
  score_high?: number | null;
  kind: string;
  url: string;
  note?: string;
};

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SIZE: Record<Section, number> = { reading: 27, math: 22 };
const PRETEST = 2;

const sectionOf = (p: DataPoint): Section => (p.section === "rw" ? "reading" : "math");

/** Right answers among the scored questions, assuming pretest questions went like the rest. */
const scoredRight = (right: number, total: number) => (right * (total - PRETEST)) / total;

/** Linear interpolation of f over a fractional count. */
function atFraction(k: number, f: (n: number) => number) {
  const lo = Math.floor(k);
  const w = k - lo;
  return w === 0 ? f(lo) : (1 - w) * f(lo) + w * f(lo + 1);
}

/** Route from the Module 1 count when the source doesn't say. */
function inferRoute(p: DataPoint): "harder" | "easier" | null {
  if (p.route) return p.route;
  if (p.m1_correct == null) return null;
  const section = sectionOf(p);
  const total = p.m1_total ?? SIZE[section];
  const m1 = adaptiveModule(section, "module1", total - PRETEST);
  const right = scoredRight(p.m1_correct, total);
  return right >= routingRule(m1, medianCut(section)).numberRight ? "harder" : "easier";
}

/** Right on the k easiest questions of a module and wrong on the rest. */
function easiestRight(items: readonly ItemParams[], k: number, easyFirst: boolean): Response[] {
  const order = [...items].sort((p, q) => (easyFirst ? p.b - q.b : q.b - p.b));
  return order.map((item, i) => ({ item, correct: i < k }));
}

/**
 * Two predictions for the same counts on a model Karman panel:
 * - `count`: the expected score for that many right (flat-prior summed-score EAP);
 * - `best`/`worst`: the engine's own MLE when the misses are the hardest or the easiest questions.
 */
export function predict(p: DataPoint) {
  const section = sectionOf(p);
  const route = inferRoute(p);
  const n1 = p.m1_total ?? SIZE[section];
  const n2 = p.m2_total ?? SIZE[section];
  const total =
    p.total_correct ??
    (p.m1_correct != null && p.m2_correct != null ? p.m1_correct + p.m2_correct : null);
  if (route == null || total == null) return null;
  const m1 = adaptiveModule(section, "module1", n1 - PRETEST);
  const m2 = adaptiveModule(section, route, n2 - PRETEST);
  const items = [...m1, ...m2];
  const right = scoredRight(total, n1);
  const eapTheta = summedScoreEap(items, UNIFORM_GRID);
  const count = sectionScaleScore(
    section,
    atFraction(right, (n) => eapTheta[Math.min(n, items.length)].theta)
  );
  // Split the misses: by module when the source gives it, else in proportion to module size.
  const r1 =
    p.m1_correct != null ? scoredRight(p.m1_correct, n1) : (right * m1.length) / items.length;
  const r2 = right - r1;
  const pattern = (easyFirst: boolean) =>
    sectionScaleScore(
      section,
      atFraction(r1, (a) =>
        atFraction(
          Math.max(0, r2),
          (b) =>
            mle([
              ...easiestRight(m1, Math.min(a, m1.length), easyFirst),
              ...easiestRight(m2, Math.min(b, m2.length), easyFirst),
            ]).theta
        )
      )
    );
  return { route, right, count, best: pattern(true), worst: pattern(false) };
}

type Row = DataPoint &
  NonNullable<ReturnType<typeof predict>> & {
    official: number;
    karman: number;
    routeMatches: boolean;
  };

/**
 * The prediction compared with Bluebook: the expected score for the count, except for deliberate
 * runs with every Module 2 answer wrong, where the engine's own MLE (hardest Module 1 misses) is used,
 * since an expected score averages over answer patterns no real student produces.
 */
const karmanScore = (p: DataPoint, got: NonNullable<ReturnType<typeof predict>>) =>
  p.m2_correct === 0 ? got.best : got.count;

function summarize(rows: readonly Row[], key: (r: Row) => string) {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const g = (out[key(r)] ??= {
      n: 0,
      meanAbsError: 0,
      bias: 0,
      within20: 0,
      within40: 0,
      insidePatternRange: 0,
    });
    const error = r.karman - r.official;
    g.n++;
    g.meanAbsError += Math.abs(error);
    g.bias += error;
    if (Math.abs(error) <= 20) g.within20++;
    if (Math.abs(error) <= 40) g.within40++;
    if (r.official >= r.worst - 10 && r.official <= r.best + 10) g.insidePatternRange++;
  }
  for (const g of Object.values(out)) {
    for (const k of ["meanAbsError", "bias"]) g[k] = +(g[k] / g.n).toFixed(1);
    for (const k of ["within20", "within40", "insidePatternRange"]) g[k] = +(g[k] / g.n).toFixed(2);
  }
  return out;
}

function main() {
  const file = process.argv[2] ?? path.join(HERE, "bluebook/datapoints.json");
  const points = JSON.parse(readFileSync(file, "utf8")) as DataPoint[];
  const rows: Row[] = [];
  for (const p of points) {
    const official =
      p.score ??
      (p.score_low != null && p.score_high != null ? (p.score_low + p.score_high) / 2 : null);
    const got = predict(p);
    if (got && official != null)
      rows.push({
        ...p,
        ...got,
        official,
        karman: karmanScore(p, got),
        // Sources that forced a route our rule wouldn't take (by choosing which questions to miss).
        routeMatches: p.m1_correct == null || inferRoute({ ...p, route: null }) === p.route,
      });
  }
  // Routing: where a source gives both the Module 1 count and the route, would we route the same?
  const routed = points.filter((p) => p.route && p.m1_correct != null);
  const agree = routed.filter((p) => inferRoute({ ...p, route: null }) === p.route);
  const report = {
    routingAgreement: { points: routed.length, agree: agree.length },
    routingCut: {
      reading: routingRule(adaptiveModule("reading", "module1", 25), medianCut("reading"))
        .numberRight,
      math: routingRule(adaptiveModule("math", "module1", 20), medianCut("math")).numberRight,
    },
    points: rows.length,
    skipped: points.length - rows.length,
    overall: summarize(rows, () => "all"),
    sameRouteAsKarman: summarize(
      rows.filter((r) => r.routeMatches),
      () => "all"
    ),
    bySectionRoute: summarize(rows, (r) => `${r.section}-${r.route}`),
    byTest: summarize(rows, (r) => `${r.section}-test${r.test}`),
    rows: rows.map((r) => ({
      test: r.test,
      section: r.section,
      route: r.route,
      m1: r.m1_correct,
      m2: r.m2_correct,
      total: r.total_correct ?? (r.m1_correct ?? 0) + (r.m2_correct ?? 0),
      bluebook: r.official,
      karman: r.karman,
      routeMatches: r.routeMatches,
      karmanIfHardestMissed: r.best,
      karmanIfEasiestMissed: r.worst,
      kind: r.kind,
    })),
  };
  mkdirSync(path.join(HERE, "out"), { recursive: true });
  writeFileSync(
    path.join(HERE, "out/bluebook-report.json"),
    JSON.stringify(report, null, 1) + "\n"
  );
  const { rows: list, ...summary } = report;
  console.log(JSON.stringify(summary, null, 1));
  for (const r of list) console.log(JSON.stringify(r));
}

if (process.argv[1]?.endsWith("compare-bluebook.ts")) main();
