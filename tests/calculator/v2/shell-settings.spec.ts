// Calculator v2 shell settings browser tests (10 Task 13): the assembled path from 09's Settings
// controls through 07's engine, S-6's per-question angle default and NM-29's same-task generation
// switch, on the harness page /v2/calculator.html. Both are package gate checks.

import { expect, test } from "@playwright/test";
import { CORPUS } from "../../../src/lib/calculator-v2/core/corpus";
import { evaluateLatex } from "../../../src/lib/calculator-v2/core/eval/compile";
import { formatValue } from "../../../src/lib/calculator-v2/core/eval/format";
import { announced, enc, openSettings, openShell, rows, useConsoleGuard } from "./shell-helpers";
import { postedLog, switchAndTime } from "./shell-probes";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

test("S-6 angle defaults to radians on every question; Degrees updates dependent rows and is announced", async ({
  page,
}) => {
  await openShell(page, `?w=800&h=600&rows=${enc(["\\sin(30)", "y=\\sin x"])}`);
  await openSettings(page);
  await expect(page.getByRole("radio", { name: "Radians" })).toBeChecked();
  await page.getByRole("radio", { name: "Degrees" }).click();
  await expect.poll(async () => (await rows(page))[0].valueText).toBe("0.5");
  await expect.poll(() => announced(page)).toContainEqual(expect.stringMatching(/degrees/i));
  await page.evaluate(() => globalThis.__shell!.remount());
  await openSettings(page);
  await expect(page.getByRole("radio", { name: "Radians" })).toBeChecked();
});
test("NM-29 angle and complex switches post a new generation in the same task; 20 rows and curves update within 250 ms; nothing stale lands", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "calculator-chrome",
    "the 250 ms budget is set for the desktop CI profile"
  );
  // ids 1 to 17: 04's NM-25 to NM-28, NM-18 and NM-19 cases; no imaginary unit, so no chips (07 Decision 5)
  const values = [
    "\\sin(30)",
    "\\cos(60)",
    "\\tan(45)",
    "\\sin(180)",
    "\\cos(90)",
    "\\sin(3630)",
    "\\tan(90)",
    "\\csc(30)",
    "\\sec(90)",
    "\\sin(30^{\\circ})",
    "30^{\\circ}",
    "\\arcsin(0.5)",
    "\\arctan(1)",
    "\\arccos(-1)",
    "\\operatorname{arccot}(-1)",
    "\\sqrt{-4}",
    "(-8)^{\\frac{1}{2}}",
  ];
  // ids 18 to 20: 07's graph.ts cases graph-9, graph-1 and graph-10, the corpus curves that depend on the angle unit
  const curves = ["y=\\sin x", "y=\\tan x", "y=\\sin(100x)"];
  for (const l of [...values, ...curves]) {
    expect(
      CORPUS.some((c) => "latex" in c.input && c.input.latex === l),
      l
    ).toBe(true);
  }
  const expected = (complex: boolean) =>
    values.map((l) =>
      formatValue(evaluateLatex(l, { settings: { angleMode: "degrees", complex } }))
    );
  await page.addInitScript(postedLog);
  await openShell(page, `?w=800&h=600&rows=${enc([...values, ...curves])}`);
  await openSettings(page);
  for (const [control, want] of [
    [page.getByRole("radio", { name: "Degrees" }), expected(false)],
    [page.getByRole("checkbox", { name: "Complex mode" }), expected(true)],
  ] as const) {
    const t = await control.evaluate(switchAndTime, want);
    expect([t.sameTask, t.stale, t.changes, t.ms <= 250]).toEqual([true, [], [1, 1, 1], true]);
    // degree ranges on [-10, 10]; see Step 1
    const [sin, tan, sin100] = t.curves;
    expect([sin.maxAbsY < 0.18, tan.maxAbsY < 0.18, sin100.bands, sin100.maxY > 0.95]).toEqual([
      true,
      true,
      0,
      true,
    ]);
  }
});
