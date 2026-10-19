// AR-43, AR-49 and AR-50 on the worker harness page (/harness/worker.html, 07 Task 14). Each test
// starts one scenario through window.__workerHarness, reads the engine through
// globalThis.__calculatorHarness and the live-worker count through
// globalThis.__karmanCalculatorCounters.
import { expect, test, type Page } from "@playwright/test";
import type { WorkerScenario } from "./fixture/harness/worker";

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

test.beforeEach(() => {
  consoleErrors.length = 0;
  pageErrors.length = 0;
});
test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

/** Opens the worker harness page, recording its console errors and uncaught page errors. */
async function harness(page: Page): Promise<void> {
  page.on("console", (message) => {
    // The AR-50 fixture workers throw on purpose; their reports come from blob: URLs.
    if (message.type() === "error" && !message.location().url.startsWith("blob:")) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/harness/worker.html");
}

/** The engine's snapshot as plain data: the backend kind, the rows and the geometry keys. */
async function snap(page: Page) {
  return page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return {
      backendKind: s.backendKind,
      rows: s.rows.map((r) => ({
        id: r.id,
        overrun: r.overrun,
        error: r.error?.message,
        valueText: r.valueText,
      })),
      geometry: [...s.geometry.keys()],
    };
  });
}

/** Loads the compute worker's modules once, so a later worker starts from a warm module graph. */
async function warmUp(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__workerHarness!.start("default");
    globalThis.__calculatorHarness!.engine.setExpression({ id: "1", latex: "y=x" });
  });
  await expect.poll(async () => (await snap(page)).geometry).toEqual(["1"]);
  await page.evaluate(() => window.__workerHarness!.stop());
}

/** Starts `scenario`, graphs y=x^2 and waits until the main-thread fallback has plotted it. */
async function fallsBack(page: Page, scenario: WorkerScenario): Promise<void> {
  await page.evaluate((s) => {
    window.__workerHarness!.start(s);
    globalThis.__calculatorHarness!.engine.setExpression({ id: "p", latex: "y=x^{2}" });
  }, scenario);
  await expect
    .poll(
      async () => {
        const s = await snap(page);
        return { backendKind: s.backendKind, geometry: s.geometry };
      },
      { timeout: 6000 }
    )
    .toEqual({ backendKind: "main-thread", geometry: ["p"] });
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers ?? 0)).toBe(0);
}

test("AR-43 each calculator runs one module worker named karman-calculator that destroy terminates", async ({
  page,
}) => {
  await harness(page);
  const workerEvent = page.waitForEvent("worker");
  await page.evaluate(() => window.__workerHarness!.start("default"));
  const w = await workerEvent;
  expect(w.url()).toContain("compute.worker");
  expect(await w.evaluate(() => self.name)).toBe("karman-calculator");
  expect(
    await w.evaluate(() => {
      try {
        (self as unknown as { importScripts(): void }).importScripts();
        return "classic";
      } catch (e) {
        return e instanceof TypeError ? "module" : "classic";
      }
    })
  ).toBe("module");
  await expect(page.getByTestId("probe")).toHaveText("ivory 1 worker");
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.setExpression({ id: "p", latex: "y=x^{2}" });
    e.setExpression({ id: "p", latex: "y=x^{3}" });
  });
  await expect.poll(async () => (await snap(page)).geometry).toContain("p");
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers)).toBe(1);
  const closed = new Promise((r) => w.once("close", r));
  await page.evaluate(() => window.__workerHarness!.stop());
  await closed;
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers)).toBe(0);
});
test("AR-49 a worker silent for 1,500 ms is replaced, the busy row shows the timeout message and the new worker answers within 300 ms", async ({
  page,
}) => {
  await harness(page);
  await warmUp(page); // start("default"), wait for a plot of y=x, stop()
  await page.evaluate(() => {
    window.__workerHarness!.start("hang-once");
    globalThis.__calculatorHarness!.engine.setExpressions([
      { id: "slow", latex: "x^{2}+y^{2}=25" },
      { id: "ok", latex: "y=x" },
    ]);
  });
  await expect
    .poll(async () => (await snap(page)).rows.find((r) => r.id === "slow")?.error, {
      timeout: 5000,
    })
    .toBe("This is taking too long. Try a smaller range or fewer terms.");
  const log = await page.evaluate(() => window.__workerHarness!.log());
  const o = log.findIndex((m) => m.type === "overrun" && m.rowId === "slow");
  const first = log.slice(o + 1).find((m) => ["analysis", "value", "plot"].includes(m.type))!;
  expect(first.t - log[o].t).toBeLessThanOrEqual(300);
  await expect.poll(async () => (await snap(page)).geometry).toEqual(["ok"]);
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers)).toBe(1);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({ id: "slow", latex: "x^{2}+y^{2}=16" })
  );
  await expect.poll(async () => (await snap(page)).geometry.sort()).toEqual(["ok", "slow"]);
});
test("AR-50 a Worker constructor that throws falls back to the main thread and graphs still render", async ({
  page,
}) => {
  await harness(page);
  await fallsBack(page, "constructor-throws");
});
test("AR-50 a worker that errors before ready falls back to the main thread and graphs still render", async ({
  page,
}) => {
  await harness(page);
  await fallsBack(page, "error-before-ready");
});
test("AR-50 a worker whose ready takes longer than 3,000 ms falls back to the main thread", async ({
  page,
}) => {
  await harness(page);
  const fell = fallsBack(page, "never-ready");
  // the engine posts at once, but no watchdog runs before ready (Task 7 Step 3): only the 3,000 ms ready timer decides
  await page.waitForTimeout(2500);
  expect((await snap(page)).backendKind).toBe("worker");
  await fell;
});
