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

/**
 * The corpus checks what each row gives, not how fast: no case's recorded outcome is a timeout.
 * The executor's clock therefore runs at a tenth of real time, so the AR-48 row budget (250 ms)
 * becomes 2.5 s of wall time. A cold JIT on a busy CI runner took over 250 ms for f(9999) and
 * failed the recursion case on unrelated pull requests; a real runaway still stops, just later.
 * The budget itself is tested in core/deadline.test.ts and worker/slice.test.ts.
 */
const BREAK_CLOCK_SLOWDOWN = 10;
const breakTiming = { now: () => performance.now() / BREAK_CLOCK_SLOWDOWN };

export async function runBreakCase(c: Pick<BreakCase, "rows" | "settings">): Promise<Outcome[]> {
  const errors: unknown[] = [];
  const t = createTestEngine(
    { onError: (e) => errors.push(e) },
    { backend: "main-thread", timing: breakTiming }
  );
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
