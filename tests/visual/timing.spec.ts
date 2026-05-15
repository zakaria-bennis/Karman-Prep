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

async function writeTimingReport(slug: string, target: string, deltaMs: number) {
  await mkdir(REPORT, { recursive: true });
  await writeFile(
    path.join(REPORT, `${slug}.json`),
    JSON.stringify(
      {
        target,
        deltaMs,
        slow: deltaMs > SLOW_THRESHOLD_MS,
        threshold: SLOW_THRESHOLD_MS,
        note:
          deltaMs === -1
            ? "no transition fired (target has no transition-* CSS, or selector missed)"
            : deltaMs > SLOW_THRESHOLD_MS
              ? "exceeds docs/design-tokens.md threshold; reduce duration or simplify easing"
              : "within expected range",
      },
      null,
      2
    )
  );
}

test.describe.configure({ mode: "serial" });

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

  await writeTimingReport("impersonate-hover", "Impersonate button hover", delta ?? -1);
});

// ─── Card hover → background tint transition ────────────────────
// /admin/cohorts table rows have `transition-colors` on hover.
// Tests the "data row tinting on hover" pattern that's repeated
// across all admin tables.
test("timing · cohort row hover transition", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/cohorts");
  // First clickable row (whichever cohort name comes first).
  const firstRow = page.locator("tr[aria-label^='Open']").first();
  await firstRow.waitFor({ state: "visible" }).catch(() => {});
  const handle = await firstRow.elementHandle();
  if (!handle) {
    await writeTimingReport("cohort-row-hover", "Cohort row hover (no rows found)", -1);
    return;
  }
  await handle.evaluate((el) => el.setAttribute("data-timing-probe", "cohort-row"));
  const delta = await measureFirstTransition(page, "[data-timing-probe='cohort-row']", async () => {
    await page.locator("[data-timing-probe='cohort-row']").hover();
  });
  await writeTimingReport("cohort-row-hover", "Cohort row hover", delta ?? -1);
});

// ─── Role-filter pill click → active state transition ───────────
// /admin/users has a row of role filter pills (All/Student/Tutor/…).
// Clicking should swap border + bg via a `transition-colors`.
test("timing · role filter pill click transition", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/users");
  // The first inactive pill — "Tutor" while "All" is selected.
  const tutorPill = page.getByRole("button", { name: /^Tutor\s*\d/i }).first();
  await tutorPill.waitFor({ state: "visible" }).catch(() => {});
  const handle = await tutorPill.elementHandle();
  if (!handle) {
    await writeTimingReport("role-pill-click", "Role pill click (not found)", -1);
    return;
  }
  await handle.evaluate((el) => el.setAttribute("data-timing-probe", "role-pill"));
  const delta = await measureFirstTransition(page, "[data-timing-probe='role-pill']", async () => {
    await page.locator("[data-timing-probe='role-pill']").click();
  });
  await writeTimingReport("role-pill-click", "Role pill click", delta ?? -1);
});

// ─── Landing CTA hover → background gradient shift ──────────────
// Public landing page primary CTA. Catches if the landing page
// gradient transition drifts beyond the threshold.
test("timing · landing primary CTA hover transition", async ({ page }) => {
  await page.goto("/");
  // First link in the hero — the "Start free trial" or equivalent.
  const heroCta = page
    .locator("a")
    .filter({ hasText: /start|begin|try|sign up|get started/i })
    .first();
  const handle = await heroCta.elementHandle().catch(() => null);
  if (!handle) {
    await writeTimingReport("landing-cta-hover", "Landing CTA (not found)", -1);
    return;
  }
  await handle.evaluate((el) => el.setAttribute("data-timing-probe", "landing-cta"));
  const delta = await measureFirstTransition(
    page,
    "[data-timing-probe='landing-cta']",
    async () => {
      await page.locator("[data-timing-probe='landing-cta']").hover();
    }
  );
  await writeTimingReport("landing-cta-hover", "Landing primary CTA hover", delta ?? -1);
});
