// ============================================================
// E2E — the admin CRM (/admin/crm).
//
// Runs as dev_seed_admin (playwright.config.ts) against the
// seed:dev personas. Opens the CRM, switches to the pipeline,
// opens the Mid Student persona (a live Pro subscription, so the
// card sits in Enrolled) and adds a note, which must still be
// there after a reload. The note is deleted at the end so the
// test can run again on the same database.
// ============================================================

import { expect, test } from "@playwright/test";

// Each route compiles on first visit under `next dev`, which can take most of a minute in CI.
test.describe.configure({ timeout: 180_000 });

test.describe("admin CRM", () => {
  test("list, pipeline, contact page and a saved note", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/admin/crm");
    await expect(page.getByRole("heading", { name: "CRM", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "People by stage" })).toBeVisible();

    // ── Pipeline view ─────────────────────────────────────
    await page.getByRole("link", { name: "Pipeline", exact: true }).click();
    await expect(page).toHaveURL(/view=board/);
    const enrolled = page.locator("section.crm-col[data-stage='enrolled']");
    await expect(enrolled.getByRole("heading", { name: "Enrolled" })).toBeVisible();
    for (const stage of ["Lead", "Talking", "Deposit", "Churned"]) {
      await expect(page.getByRole("heading", { name: stage, exact: true })).toBeVisible();
    }

    // ── Open a contact from its card ──────────────────────
    const card = enrolled.getByRole("link", { name: "Mid Student", exact: true });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/admin\/crm\/u-[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Mid Student" }).first()).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Stage" })).toBeVisible();

    // ── Add a note; it is saved, so it survives a reload ──
    const text = `E2E note ${Date.now()}`;
    await page.getByLabel("New note").fill(text);
    await page.getByRole("button", { name: "Save note" }).click();
    const note = page.locator(".crm-notes li", { hasText: text });
    await expect(note).toBeVisible();
    await expect(page.getByLabel("New note")).toHaveValue("");

    await page.reload();
    await expect(note).toBeVisible();

    // ── Clean up ──────────────────────────────────────────
    await note.getByRole("button", { name: "Delete" }).click();
    await expect(note).toHaveCount(0);
  });
});
