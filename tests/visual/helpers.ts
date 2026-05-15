// ============================================================
// Shared Playwright helpers for the visual harness.
//
// Used by snapshots.spec.ts, a11y.spec.ts, tokens.spec.ts, and
// timing.spec.ts. Centralized so a fix like the cross-engine
// scroll-into-view (audit finding M2) only has to be made once.
// ============================================================

import { expect, type Page } from "@playwright/test";

/** Click the Impersonate button on /admin/users for the user
 *  whose email matches `email`. Waits for the impersonation
 *  banner to appear before returning, so callers can assume the
 *  cookies are set when the function resolves.
 *
 *  The admin Users table is not responsive on mobile (audit
 *  finding S1) — the Impersonate button is clipped off the right
 *  edge of its `overflow-hidden` parent at < ~600px, so
 *  `scrollIntoViewIfNeeded()` alone can't recover it. We widen
 *  the viewport to desktop, click, then restore the original
 *  viewport before returning. The impersonation state lives in
 *  cookies, so the subsequent navigation + screenshot run at
 *  the test's intended viewport. Remove this hack once S1 is
 *  fixed and the button is reachable on mobile. */
export async function impersonateByEmail(page: Page, email: string): Promise<void> {
  // Dialog handler must be set BEFORE the click that produces it.
  // Firefox is strict about this; Chromium tolerates late handlers.
  page.on("dialog", (d) => void d.accept());
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/users");
  const row = page.locator("tr", { hasText: email });
  // Click + wait-for-navigation as one operation. Without the
  // explicit navigation wait, Firefox occasionally moves on
  // before the server-action redirect finishes.
  await Promise.all([
    page.waitForURL(/dashboard|tutor|learn/),
    row.getByRole("button", { name: /Impersonate/i }).click(),
  ]);
  await expect(page.getByRole("status")).toBeVisible();
  if (originalViewport) {
    await page.setViewportSize(originalViewport);
  }
}

/** Clear an active impersonation by clicking the banner's × button.
 *  No-op when no banner is present (e.g., the test is already at
 *  the admin's home view). */
export async function clearImpersonation(page: Page): Promise<void> {
  const banner = page.getByRole("status");
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole("button", { name: /Exit impersonation/i }).click();
  }
}
