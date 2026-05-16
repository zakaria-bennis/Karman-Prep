// ============================================================
// Visual regression — diffs the current render of each persona ×
// viewport × page against a committed baseline PNG and fails the
// test if more than 100 pixels drift. Catches the silent kind of
// visual regression that no other gate (tsc / eslint / unit
// tests / a11y / tokens) can see — e.g. a Tailwind class rename
// that accidentally collapses a grid, a typo in a CSS variable
// that breaks dark-mode contrast, a layout shift from a stray
// padding change.
//
// Storage: baselines live under
//   tests/visual/regression.spec.ts-snapshots/
// (committed to git). They're the source of truth — any drift
// from these PNGs fails the test.
//
// Update flow when a visual change is INTENDED:
//   $ npx playwright test tests/visual/regression.spec.ts --update-snapshots
//   $ git diff --stat tests/visual/regression.spec.ts-snapshots/
//   $ git commit tests/visual/regression.spec.ts-snapshots/ -m "..."
//
// IMPORTANT: review every PNG in `git diff` before committing —
// the suite's whole job is to surface visual changes for you to
// approve or reject, NOT to auto-accept them.
//
// Scope: Chromium-only at three viewports (mobile / tablet /
// desktop). Cross-browser regression (firefox / webkit) is a
// follow-up — adding them would triple the baseline count and
// most cross-engine drift surfaces in snapshots.spec.ts already.
//
// Tolerance: maxDiffPixels: 100. Enough to absorb sub-pixel
// anti-aliasing and font-rendering noise but small enough to
// catch real layout shifts. Tighten once baselines stabilize.
//
// What's masked: nothing yet. Seed data is deterministic
// (scripts/seed-dev.mjs) so most content is stable. If you start
// seeing false positives from a specific element, add it to the
// `mask` array on the relevant assertion.
// ============================================================

import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const PERSONAS = [
  {
    key: "admin",
    email: null,
    pages: ["/admin/users", "/admin/cohorts", "/admin/jobs"],
  },
  {
    key: "student_mid",
    email: "dev-seed-mid@karman.local",
    pages: ["/dashboard/student", "/learn", "/dashboard/student/progress"],
  },
  {
    key: "student_stuck",
    email: "dev-seed-stuck@karman.local",
    pages: ["/dashboard/student"],
  },
  {
    key: "tutor",
    email: "dev-seed-tutor@karman.local",
    pages: ["/tutor", "/tutor/schedule"],
  },
] as const;

async function impersonateByEmail(page: Page, email: string) {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/users");
  const row = page.locator("tr", { hasText: email });
  await row.getByRole("button", { name: /Impersonate/i }).click();
  await expect(page.getByRole("status")).toBeVisible();
}

async function clearImpersonation(page: Page) {
  const banner = page.getByRole("status");
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole("button", { name: /Exit impersonation/i }).click();
  }
}

test.describe.configure({ mode: "serial" });

for (const persona of PERSONAS) {
  test.describe(`regression: ${persona.key}`, () => {
    for (const viewport of VIEWPORTS) {
      for (const url of persona.pages) {
        const label = url.replace(/^\//, "").replace(/\//g, "_") || "root";
        const snapshotName = `${persona.key}-${viewport.name}-${label}.png`;

        test(`${viewport.name} · ${url}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          if (persona.email) {
            await impersonateByEmail(page, persona.email);
          } else {
            await clearImpersonation(page);
          }

          await page.goto(url);
          await page.waitForLoadState("networkidle").catch(() => {});

          // Freeze in-flight transitions / animations so the diff
          // is deterministic. `animations: "disabled"` jumps every
          // CSS transition to its final state before the snapshot.
          await expect(page).toHaveScreenshot(snapshotName, {
            fullPage: false,
            animations: "disabled",
            maxDiffPixels: 100,
            // No threshold on per-pixel color delta — the maxDiff-
            // Pixels cap is the only signal we care about. Default
            // threshold (0.2 = ~10% color difference per pixel) is
            // fine.
          });
        });
      }
    }
  });
}
