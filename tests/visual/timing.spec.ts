// ============================================================
// Animation timing — measures how long observable transitions
// take. I can't *feel* whether 240ms feels right; I can flag
// "this is >500ms when the docs say it should be <300ms" so a
// human can decide.
//
// Pattern: trigger the interaction, sample `performance.now()`
// on both ends of an animation event (transitionrun /
// transitionend), record the delta to a JSON report.
// ============================================================

import { test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REPORT = path.resolve(process.cwd(), "tests", "visual", "snapshots", "timing");
const SLOW_THRESHOLD_MS = 500;

async function measureFirstTransition(
  page: Page,
  selector: string,
  trigger: () => Promise<void>
): Promise<number | null> {
  // Install a one-shot listener before triggering so we don't
  // race the event.
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    (window as unknown as { __transitionDelta?: Promise<number> }).__transitionDelta =
      new Promise<number>((resolve) => {
        let start: number | null = null;
        el.addEventListener(
          "transitionrun",
          () => {
            start = performance.now();
          },
          { once: true }
        );
        el.addEventListener(
          "transitionend",
          () => {
            if (start != null) resolve(performance.now() - start);
          },
          { once: true }
        );
        // Bail after 2 seconds if no transition fires.
        setTimeout(() => resolve(-1), 2_000);
      });
  }, selector);

  await trigger();

  return await page.evaluate(
    () =>
      (window as unknown as { __transitionDelta?: Promise<number> }).__transitionDelta ??
      Promise.resolve(-1)
  );
}

test("timing · Impersonate button hover transition", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/users");
  const midRow = page.locator("tr", { hasText: "dev-seed-mid@karman.local" });
  await midRow.scrollIntoViewIfNeeded();

  // Pick the first Impersonate button by its accessible name.
  const handle = await midRow.getByRole("button", { name: /Impersonate/i }).elementHandle();
  if (!handle) {
    test.fail(true, "Impersonate button not found — check seed fixtures");
    return;
  }
  // Build a unique CSS selector for the page.evaluate handler.
  await handle.evaluate((el) => el.setAttribute("data-timing-probe", "impersonate"));

  const delta = await measureFirstTransition(
    page,
    "[data-timing-probe='impersonate']",
    async () => {
      await page.locator("[data-timing-probe='impersonate']").hover();
    }
  );

  await mkdir(REPORT, { recursive: true });
  // delta is `null` only if measureFirstTransition itself failed
  // (selector missing). Treat that the same as the 2-second bail.
  const safeDelta = delta ?? -1;
  const noTransition = safeDelta === -1;
  await writeFile(
    path.join(REPORT, "impersonate-hover.json"),
    JSON.stringify(
      {
        target: "Impersonate button hover",
        deltaMs: safeDelta,
        // Two booleans is more honest than one: `slow` only makes
        // sense when a transition actually fired. `no_transition`
        // says we never saw a `transitionrun` event — usually
        // because the element has no `transition-*` CSS attached.
        no_transition: noTransition,
        slow: !noTransition && safeDelta > SLOW_THRESHOLD_MS,
        threshold: SLOW_THRESHOLD_MS,
        note: noTransition
          ? "no transition fired (button has no transition-* CSS, or selector missed)"
          : safeDelta > SLOW_THRESHOLD_MS
            ? "exceeds docs/design-tokens.md threshold; reduce duration or simplify easing"
            : "within expected range",
      },
      null,
      2
    )
  );
});
