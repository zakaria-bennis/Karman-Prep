// Test-only: runs one adversarial corpus case (break-corpus.json) through the engine on the
// main-thread backend, with the default view so every graphable row is plotted too, and returns
// each row's outcome. Never imported by production code.

import { engineOutcome, type Outcome } from "./break-outcome";
import { createTestEngine, TEST_VIEW } from "./test-engine";

export interface BreakCase {
  cat: string;
  rows: string[];
  settings?: { degreeMode?: boolean; allowComplex?: boolean };
  desmos: Outcome[];
  /** Why this engine still differs from Desmos here, and what it gives instead. */
  known?: { reason: string; ours: Outcome[] };
}

export async function runBreakCase(c: Pick<BreakCase, "rows" | "settings">): Promise<Outcome[]> {
  const errors: unknown[] = [];
  const t = createTestEngine({ onError: (e) => errors.push(e) }, { backend: "main-thread" });
  try {
    t.engine.setView(TEST_VIEW);
    t.engine.updateSettings({
      angleMode: c.settings?.degreeMode ? "degrees" : "radians",
      complex: c.settings?.allowComplex === true,
    });
    t.engine.setExpressions(c.rows.map((latex, i) => ({ id: `r${i}`, latex })));
    await t.settled();
    if (errors.length > 0) throw new Error(`engine reported ${String(errors[0])}`);
    const analysis = t.engine.expressionAnalysis;
    const texts = new Map(t.engine.getSnapshot().rows.map((r) => [r.id, r.valueText]));
    return c.rows.map((_, i) => engineOutcome(analysis[`r${i}`], texts.get(`r${i}`) ?? null));
  } finally {
    t.engine.destroy();
  }
}
