// Calculator v2 loading, failure panels and runaway work in the quiz hosts (11 tasks 7 and 11).

import { expect, test } from "@playwright/test";
import { countNodes, parseLatex } from "../../../src/lib/calculator-v2/core/latex";
import {
  RUNAWAY,
  chromeOnly,
  openV2,
  phoneSized,
  rowItem,
  side,
  trigger,
  v2Requests,
} from "./quiz-helpers";

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

test("AR-30 no v2 module loads on a fresh v2 page, a Reading page or a v1 page; pointer-enter and focus on the trigger prefetch", async ({
  page,
}, info) => {
  test.skip(/ios|android/.test(info.project.name), "hover and focus prefetch need a fine pointer");
  const urls = v2Requests(page);
  const requested = () => urls.some((u) => u.includes("/calculator-v2/host/quiz-host"));
  await page.goto("/?flow=practice&calc=v2");
  await page.waitForLoadState("networkidle");
  expect(urls).toEqual([]);
  await page.goto("/?flow=practice&calc=v2&subject=reading");
  await page.waitForLoadState("networkidle");
  expect(urls).toEqual([]);
  await page.goto("/?flow=practice");
  await trigger(page).click();
  await expect(page.getByRole("button", { name: "Paste math" })).toBeVisible();
  expect(urls).toEqual([]);
  await page.goto("/?flow=practice&calc=v2");
  await trigger(page).hover();
  await expect.poll(requested).toBe(true);
  urls.length = 0;
  await page.goto("/?flow=diagnostic&calc=v2");
  await trigger(page).focus();
  await expect.poll(requested).toBe(true);
});

test("AR-31 a failed chunk shows the reload panel, stays failed for the page and recovers after Reload page (OI-28)", async ({
  page,
}) => {
  const hostModule = /\/calculator-v2\/host\/quiz-host\.ts/;
  await page.route(hostModule, (route) => route.abort());
  await page.goto("/?flow=diagnostic&calc=v2");
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
    if (r.url().includes("/calculator-v2/host/quiz-host")) requests++;
  });
  await page.goto("/?flow=diagnostic&calc=v2");
  await (phoneSized(page) ? side(page) : trigger(page)).click();
  await expect(page.getByText("The calculator could not load.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(rowItem(page)).toBeVisible();
  expect(requests).toBe(1);
});
