// Calculator loading, failure panels and runaway work in the quiz hosts (11 tasks 7 and 11).

import { expect, test } from "@playwright/test";
import { countNodes, parseLatex } from "../../src/lib/calculator/core/latex";
import { MOUNT_FAILED_COPY } from "../../src/components/calculator/CalculatorLoader";
import {
  RUNAWAY,
  chromeOnly,
  openCalculator,
  phoneSized,
  rowItem,
  side,
  trigger,
  calculatorRequests,
} from "./quiz-helpers";

/** RUNAWAY with one more `xy` term: 2,004 nodes, over the NM- cap of 2,000 (NM-42). */
const OVER_CAP = RUNAWAY.replace("=", "+xy=");

test("AR-56 a runaway row leaves the diagnostic timer and Skip responsive and shows a cap or timeout message within 2 s", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  const parsed = parseLatex(RUNAWAY);
  expect(parsed.ok && countNodes(parsed.tree)).toBe(2000);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  // RUNAWAY is exactly 2,000 nodes, within the NM- cap (only more is refused), and plot sampling
  // has no deadline (AR-47, AR-48), so it is the work load and plots without a message; the row
  // beside it is the same equation one term longer, which the NM- cap refuses before evaluation.
  const overCap = parseLatex(OVER_CAP);
  expect(!overCap.ok && overCap.error.code).toBe("too-many-nodes");
  await page.evaluate(
    (rows) => globalThis.__calculatorHarness!.engine.setExpressions(rows),
    [
      { id: "1", latex: RUNAWAY },
      { id: "2", latex: OVER_CAP },
    ]
  );
  // R-2: the marker shows in the gutter and its tooltip (hidden until hovered) holds the message.
  const host = page.locator("[data-calculator-host]");
  await expect(host.locator('li[data-row-id="2"] .kc-row-warning')).toBeVisible({
    timeout: 2000,
  });
  await expect(host.locator('[role="tooltip"]#kc-row-2-error')).toHaveText(
    /^(This row is too long to evaluate\. Split it into smaller definitions\.|This is taking too long\. Try a smaller range or fewer terms\.)$/
  );
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

test("AR-30 no calculator module loads on a fresh page or a Reading page; pointer-enter and focus on the trigger prefetch", async ({
  page,
}, info) => {
  test.skip(/ios|android/.test(info.project.name), "hover and focus prefetch need a fine pointer");
  const urls = calculatorRequests(page);
  const requested = () => urls.some((u) => u.includes("/calculator/host/quiz-host"));
  await page.goto("/?flow=practice");
  await page.waitForLoadState("networkidle");
  expect(urls).toEqual([]);
  await page.goto("/?flow=practice&subject=reading");
  await page.waitForLoadState("networkidle");
  expect(urls).toEqual([]);
  await page.goto("/?flow=practice");
  await trigger(page).hover();
  await expect.poll(requested).toBe(true);
  urls.length = 0;
  await page.goto("/?flow=diagnostic");
  await trigger(page).focus();
  await expect.poll(requested).toBe(true);
});

test("AR-31 a failed chunk shows the reload panel, stays failed for the page and recovers after Reload page (OI-28)", async ({
  page,
}) => {
  const hostModule = /\/calculator\/host\/quiz-host\.ts/;
  await page.route(hostModule, (route) => route.abort());
  await page.goto("/?flow=diagnostic");
  const open = () => (phoneSized(page) ? side(page) : trigger(page)).click();
  const panel = page.getByText("The calculator could not load. Reload the page to try again.");
  await open();
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await open();
  await expect(panel).toBeVisible();
  await page.unroute(hostModule);
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Reload page" }).click(),
  ]);
  await open();
  // MathQuill keeps the row's textarea at 0 x 0, so visibility is read on its list item.
  await expect(rowItem(page)).toBeVisible();
});

test("AR-31 a mount failure shows Retry, which mounts from the module already loaded (OI-28)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let failed = false;
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      if (!failed && this.hasAttribute("data-calculator-host")) {
        failed = true;
        throw new Error("fixture mount failure");
      }
      return attach.call(this, init);
    };
  });
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/calculator/host/quiz-host")) requests++;
  });
  await page.goto("/?flow=diagnostic");
  await (phoneSized(page) ? side(page) : trigger(page)).click();
  await expect(page.getByText("The calculator could not load.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(rowItem(page)).toBeVisible();
  expect(requests).toBe(1);
});

test("AR-53 a window render error shows a window-sized fallback with Retry and Close, and the question stays visible and clickable", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  // An unknown mode makes the window's render throw on every attempt, Retry included.
  const breakWindow = () =>
    page.evaluate(() =>
      (
        globalThis as unknown as { __calculatorWindowStore: { set(patch: object): void } }
      ).__calculatorWindowStore.set({ mode: "broken", restoreMode: "broken" })
    );
  await breakWindow();
  const message = page.getByText(MOUNT_FAILED_COPY, { exact: true });
  const fallback = page.getByRole("dialog", { name: "Karman calculator" });
  await expect(message).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(message).toBeVisible();
  const box = (await fallback.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(880);
  expect(box.height).toBeLessThan(400);
  const skip = page.getByRole("button", { name: "Skip this question" });
  await expect(page.getByText(/^Question \d+/).first()).toBeVisible();
  // A trial click runs every actionability check, the hit test included, without skipping.
  await skip.click({ trial: true });
  await fallback.getByRole("button", { name: "Close calculator", exact: true }).click();
  await expect(message).toBeHidden();
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
});
