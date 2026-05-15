// ============================================================
// Visual state harness — captures hover / focus / active states
// of interactive components. preview_screenshot only ever sees
// the resting state; this spec drives the state explicitly with
// Playwright primitives and snapshots each one.
//
// Add a new block when you add a new component worth visually
// regression-testing.
// ============================================================

import { test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "tests", "visual", "snapshots", "states");

async function snap(page: Page, name: string) {
  await mkdir(ROOT, { recursive: true });
  await page.screenshot({ path: path.join(ROOT, `${name}.png`), type: "png", fullPage: false });
}

test.describe.configure({ mode: "serial" });

test.describe("interactive states", () => {
  test("ImpersonationBanner — resting + hover on close button", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/users");
    const midRow = page.locator("tr", { hasText: "dev-seed-mid@karman.local" });
    await midRow.getByRole("button", { name: /Impersonate/i }).click();
    const banner = page.getByRole("status");
    await banner.waitFor({ state: "visible" });

    await snap(page, "banner-resting");
    const closeBtn = banner.getByRole("button", { name: /Exit impersonation/i });
    await closeBtn.hover();
    await snap(page, "banner-hover-close");

    await closeBtn.click(); // restore state
  });

  test("admin Impersonate button — resting + hover + focus", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/users");
    const midRow = page.locator("tr", { hasText: "dev-seed-mid@karman.local" });
    const btn = midRow.getByRole("button", { name: /Impersonate/i });

    await btn.scrollIntoViewIfNeeded();
    await snap(page, "impersonate-resting");
    await btn.hover();
    await snap(page, "impersonate-hover");
    await btn.focus();
    await snap(page, "impersonate-focus");
  });
});
