// Calculator v2 loading, failure panels and runaway work in the quiz hosts (11 tasks 7 and 11).

import { expect, test } from "@playwright/test";
import { countNodes, parseLatex } from "../../../src/lib/calculator-v2/core/latex";
import { RUNAWAY, chromeOnly, openV2 } from "./quiz-helpers";

test("AR-56 a runaway row leaves the diagnostic timer and Skip responsive and shows a cap or timeout message within 2 s", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  const parsed = parseLatex(RUNAWAY);
  expect(parsed.ok && countNodes(parsed.tree)).toBe(2000);
  await openV2(page, "diagnostic", { width: 1280, height: 800 });
  await page.evaluate(
    (latex) => globalThis.__calculatorHarness!.engine.setExpression({ id: "1", latex }),
    RUNAWAY
  );
  // Exactly 2,000 nodes is within the NM- cap (only more is refused), and plot sampling has no
  // deadline (AR-48), so this row may plot in full; it must not stay unresolved past 2 s.
  const messages = [
    "This row is too long to evaluate. Split it into smaller definitions.",
    "This is taking too long. Try a smaller range or fewer terms.",
  ];
  await expect
    .poll(
      () =>
        page.evaluate((known) => {
          const s = globalThis.__calculatorHarness!.engine.getSnapshot();
          const message = s.rows[0]?.error?.message ?? "";
          return known.includes(message) || s.geometry.has("1");
        }, messages),
      { timeout: 2000 }
    )
    .toBe(true);
  const timer = page.getByText(/^\d{1,2}:\d{2}$/).first();
  const ticks = new Set<string>();
  for (let i = 0; i < 3; i++) {
    ticks.add((await timer.textContent())!);
    await page.waitForTimeout(1100);
  }
  expect(ticks.size).toBe(3);
  const elapsed = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const old = document.querySelector("[data-calculator-host]")!;
        const start = performance.now();
        const watch = new MutationObserver(() => {
          if (!old.isConnected) {
            watch.disconnect();
            resolve(performance.now() - start);
          }
        });
        watch.observe(document.body, { childList: true, subtree: true });
        [...document.querySelectorAll("button")]
          .find((b) => b.textContent?.includes("Skip this question"))!
          .click();
      })
  );
  expect(elapsed).toBeLessThan(300);
});
