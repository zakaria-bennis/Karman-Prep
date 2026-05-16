// ============================================================
// Shared Playwright helpers for the visual harness.
//
// Used by snapshots.spec.ts, a11y.spec.ts, tokens.spec.ts, and
// regression.spec.ts. Centralized so a fix or selector change
// only has to happen once.
//
// Historical note: an earlier version of these specs widened the
// viewport to 1440x900 before clicking Impersonate, because the
// admin Users table was `overflow-hidden` on mobile and clipped
// the button off-screen (audit S1). PRs #73 + #74 replaced the
// tables with a stacked card layout at < md, so the button is
// always visible. The viewport-widen workaround is no longer
// needed and not present here.
// ============================================================

import { expect, type Page } from "@playwright/test";

/** Click the Impersonate button on /admin/users for the user
 *  whose email matches `email`. Waits for the impersonation
 *  banner to appear before returning, so callers can assume the
 *  cookies are set when the function resolves. Works at every
 *  viewport now that the table goes card-layout at < md. */
export async function impersonateByEmail(page: Page, email: string): Promise<void> {
  // Dialog handler must be set BEFORE the click that produces it.
  // Firefox is strict about this; Chromium tolerates late handlers.
  page.on("dialog", (d) => void d.accept());
  await page.goto("/admin/users");
  // PR #73 added a mobile card layout: at < md the rows are <li>
  // cards, at md+ they're <tr>s in a table. BOTH copies render in
  // the DOM — one is `display:none` per the breakpoint. The
  // `li:visible, tr:visible` selector picks whichever copy is
  // actually rendered at the current viewport.
  const row = page.locator("li:visible, tr:visible").filter({ hasText: email });
  await row.getByRole("button", { name: /Impersonate/i }).click();
  // Wait for the banner — confirms cookies are set and we're on
  // the impersonated page.
  await expect(page.getByRole("status")).toBeVisible();
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
