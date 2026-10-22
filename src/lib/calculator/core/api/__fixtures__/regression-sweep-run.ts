// Test-only: runs one regression sweep case (regression-sweep.json, live Desmos 2026-10-22) through
// the engine on the main-thread backend and reduces every row to what was captured from Desmos:
// its error, whether it graphs, its value, and a regression's parameters, statistic, linearity,
// log-mode offer and residual name. Never imported by production code.

import type { ExpressionState } from "../types";
import { setLogMode } from "../row-commands";
import { createTestEngine, TEST_VIEW } from "./test-engine";

export type SweepStats = { RMSE: number } | { Rsquared: number } | { r: number; rsquared: number };
export interface SweepRow {
  error?: string; // in Karman's copy (messages.ts) for the error Desmos showed
  desmosText?: string; // Desmos's own wording, where Karman's copy differs
  graph: boolean;
  value?: number | number[];
  reg?: {
    params: Record<string, number>;
    stats: SweepStats;
    isLinear: boolean;
    logSuggested: boolean;
    residual: string;
  };
}
export interface SweepCase {
  group: string;
  name: string;
  rows: (ExpressionState & { logMode?: boolean })[];
  desmos: SweepRow[];
  /** Why this engine still differs from Desmos here, and what it gives instead. */
  known?: { reason: string; ours: SweepRow[] };
}

export async function runSweepCase(c: SweepCase): Promise<SweepRow[]> {
  const t = createTestEngine(undefined, { backend: "main-thread" });
  try {
    t.engine.setView(TEST_VIEW);
    t.engine.setExpressions(
      c.rows.map((row) => {
        const copy = { ...row };
        delete copy.logMode;
        return copy;
      })
    );
    for (const row of c.rows) if (row.logMode === true) setLogMode(t.engine, row.id, true);
    await t.settled();
    const analysis = t.engine.expressionAnalysis;
    const views = new Map(t.engine.getSnapshot().rows.map((r) => [r.id, r]));
    return c.rows.map(({ id }, i) => {
      const a = analysis[id];
      const out: SweepRow = { graph: a?.isGraphable === true };
      if (a?.isError) return { error: a.errorMessage ?? "", graph: false };
      const ev = a?.evaluation;
      if (c.desmos[i]?.value !== undefined && ev !== undefined) {
        if (ev.type === "number") out.value = ev.value;
        else if (ev.type === "list") out.value = ev.value;
      }
      const result = views.get(id)?.regression?.result;
      if (result?.ok) {
        out.reg = {
          params: Object.fromEntries(result.params.map((p) => [p.name, p.value])),
          stats:
            result.rmse !== null
              ? { RMSE: result.rmse }
              : result.r !== null
                ? { r: result.r, rsquared: result.r2 ?? NaN }
                : { Rsquared: result.r2 ?? NaN },
          isLinear: result.isLinear,
          logSuggested: result.logMode.available,
          residual: result.residualName,
        };
      }
      return out;
    });
  } finally {
    t.engine.destroy();
  }
}

const close = (a: number, b: number, rel: number, abs: number) =>
  Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));

/** The differences between `ours` and `expected`, as readable lines; empty when they match. */
export function sweepDiffs(ours: SweepRow[], expected: SweepRow[]): string[] {
  const diffs: string[] = [];
  expected.forEach((e, i) => {
    const o = ours[i] ?? { graph: false };
    const at = `row ${i}`;
    if (e.error !== o.error)
      diffs.push(`${at} error: ${o.error ?? "none"} (Desmos ${e.error ?? "none"})`);
    if (e.graph !== o.graph) diffs.push(`${at} graph: ${o.graph} (Desmos ${e.graph})`);
    if (e.value !== undefined) {
      const ev = [e.value].flat(),
        ov = o.value === undefined ? [] : [o.value].flat();
      if (ev.length !== ov.length || ev.some((v, j) => !close(v, ov[j], 1e-9, 1e-12)))
        diffs.push(`${at} value: ${JSON.stringify(o.value)} (Desmos ${JSON.stringify(e.value)})`);
    }
    if (e.reg === undefined || o.reg === undefined) {
      if (e.reg !== o.reg)
        diffs.push(`${at} fit: ${o.reg ? "fitted" : "none"} (Desmos ${e.reg ? "fitted" : "none"})`);
      return;
    }
    // Iterative fits agree to the digits Desmos shows; exact (linear) fits much more closely.
    const [rel, abs] = e.reg.isLinear ? [1e-7, 1e-9] : [1e-4, 1e-6];
    const en = Object.keys(e.reg.params),
      on = Object.keys(o.reg.params);
    if (en.join() !== on.join())
      diffs.push(
        `${at} parameters: ${on.join(", ") || "none"} (Desmos ${en.join(", ") || "none"})`
      );
    else
      for (const k of en)
        if (!close(e.reg.params[k], o.reg.params[k], rel, abs))
          diffs.push(`${at} ${k} = ${o.reg.params[k]} (Desmos ${e.reg.params[k]})`);
    const ek = Object.keys(e.reg.stats).join(),
      ok = Object.keys(o.reg.stats).join();
    if (ek !== ok) diffs.push(`${at} statistic: ${ok} (Desmos ${ek})`);
    else
      for (const [k, v] of Object.entries(e.reg.stats))
        if (!close(v, (o.reg.stats as Record<string, number>)[k], rel, abs))
          diffs.push(`${at} ${k} = ${(o.reg.stats as Record<string, number>)[k]} (Desmos ${v})`);
    if (e.reg.isLinear !== o.reg.isLinear)
      diffs.push(`${at} isLinear: ${o.reg.isLinear} (Desmos ${e.reg.isLinear})`);
    if (e.reg.logSuggested !== o.reg.logSuggested)
      diffs.push(`${at} log mode offered: ${o.reg.logSuggested} (Desmos ${e.reg.logSuggested})`);
    if (e.reg.residual !== o.reg.residual)
      diffs.push(`${at} residual: ${o.reg.residual} (Desmos ${e.reg.residual})`);
  });
  return diffs;
}
