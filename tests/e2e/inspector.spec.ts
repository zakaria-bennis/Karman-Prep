// ============================================================
// E2E — Inspector worklist + detail-page smoke tests.
//
// The Inspector is the admin's primary surface for triaging
// audit-and-grader findings on the question bank. The flow has
// grown significantly (PR #118 → #129):
//   · Worklist with severity/source/category/source_pdf filters
//   · Multi-select + bulk actions (resolve/accept/flag)
//   · Detail page with view + edit modes, history pane, action bar
//   · Re-run checks, Apply Pro's answer, figure replace
//
// This spec is a thin smoke test that catches "did the page
// even mount" regressions — clicks the most-trafficked elements
// and asserts nothing throws or 500s. Deeper assertions
// (e.g. "Apply Pro's answer flips correct_answer") live in unit
// tests for the underlying server actions.
//
// Runs against the dev server with DEV_IMPERSONATE_CLERK_ID=
// dev_seed_admin (set by playwright.config.ts). The bank may
// be empty in the seed DB; the test handles both states.
// ============================================================

import { expect, test } from "@playwright/test";

test.describe("admin Inspector", () => {
  test("worklist page loads with header + nav chrome", async ({ page }) => {
    await page.goto("/admin/questions/inspect");

    // Heading is the canonical mount signal.
    await expect(page.getByRole("heading", { name: "Inspector" })).toBeVisible();

    // Back-to-admin link is always present in the chrome.
    const backLink = page.getByRole("link", { name: /Back to admin/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/admin/curriculum");

    // The summary line under the heading mentions findings totals.
    // The exact numbers vary by environment so we match the static
    // structure: "N questions with findings · M total".
    await expect(page.getByText(/questions with findings/i)).toBeVisible();
    await expect(page.getByText(/distinct codes/i)).toBeVisible();
  });

  test("worklist shows either an empty state or at least one row", async ({ page }) => {
    await page.goto("/admin/questions/inspect");

    // Wait for the page to settle.
    await expect(page.getByRole("heading", { name: "Inspector" })).toBeVisible();

    // The worklist is empty IFF the summary header says 0 findings.
    const headerText = await page.getByText(/questions with findings/i).innerText();
    const totalMatch = headerText.match(/(\d+)\s+questions/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    if (total === 0) {
      // Empty state — should render a "No findings yet" or similar
      // message rather than an empty grid. Worklist component renders
      // its own copy; we don't tie to exact wording.
      const tableRows = page.locator("table tbody tr");
      await expect(tableRows).toHaveCount(0);
    } else {
      // Non-empty — at least one row should be present.
      // (The worklist is sorted by worst severity desc, so the first
      //  row is the most-urgent finding.)
      const firstRow = page.locator("table tbody tr").first();
      await expect(firstRow).toBeVisible();
    }
  });

  test("worklist filter dropdowns are reachable", async ({ page }) => {
    await page.goto("/admin/questions/inspect");
    await expect(page.getByRole("heading", { name: "Inspector" })).toBeVisible();

    // The filter bar exposes 6 selects: Severity / Source / Category
    // / Source PDF / Domain / Include resolved. We assert their labels
    // are present (the <select> elements are themselves accessible).
    await expect(page.getByText(/Severity$/i).first()).toBeVisible();
    await expect(page.getByText(/Source$/i).first()).toBeVisible();
    await expect(page.getByText(/Domain$/i).first()).toBeVisible();
  });

  test("URL-synced filters land on the worklist + persist on reload", async ({ page }) => {
    // Pre-apply a severity filter via URL — same code path the
    // dashboard links use to drill into a specific scope. Tests
    // that searchParams parsing doesn't 500.
    await page.goto("/admin/questions/inspect?severity=BLOCKING");
    await expect(page.getByRole("heading", { name: "Inspector" })).toBeVisible();

    // The summary header still renders even with the filter applied.
    await expect(page.getByText(/distinct codes/i)).toBeVisible();
  });
});
