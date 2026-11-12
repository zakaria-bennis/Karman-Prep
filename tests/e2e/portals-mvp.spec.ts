// ============================================================
// E2E — the overnight MVP click-through (2026-11-12).
//
// Walks every public page and every portal the way a visitor,
// student, parent, tutor and admin would, so a broken route or a
// page that throws shows up in CI before anyone opens a preview.
//
// The dev server boots as dev_seed_admin (playwright.config.ts).
// Each role is reached the way admins really do it: the
// Impersonate button on /admin/users, as in impersonation.spec.ts.
// ============================================================

import { expect, test, type Page } from "@playwright/test";

// Each portal test opens several routes, and each route compiles on first visit under `next dev`.
test.describe.configure({ timeout: 180_000 });

const SITE_PAGES = [
  "/",
  "/program",
  "/private-tutoring",
  "/pricing",
  "/guarantee",
  "/about",
  "/faq",
  "/research",
  "/schools",
  "/for-tutors",
  "/free-practice-test",
  "/terms",
  "/refunds",
  "/privacy",
  "/cookies",
];

/** Collect uncaught page errors so a page that renders but throws still fails. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function impersonate(page: Page, email: string) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/users");
  const row = page.locator("tr", { hasText: email });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Impersonate/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Admin viewing as" })).toBeVisible();
}

test.describe("public site", () => {
  for (const path of SITE_PAGES) {
    test(`${path} renders with one main heading`, async ({ page }) => {
      const errors = watchErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("cookie note", () => {
  // The note only shows where the law asks for opt-in (EU and the like).
  test.use({ extraHTTPHeaders: { "cf-ipcountry": "DE" } });

  test("Essentials only saves a no and the note leaves", async ({ page, context }) => {
    await page.goto("/about");
    const note = page.getByRole("dialog").filter({ hasText: "Cookies?" });
    await expect(note).toBeVisible();
    await expect(note.getByRole("button", { name: "Allow all" })).toBeVisible();
    await note.getByRole("button", { name: "Essentials only" }).click();
    await expect(note).toHaveCount(0);
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "karman_replay_consent")?.value).toBe("no");
  });

  test("Allow all saves a yes", async ({ page, context }) => {
    await page.goto("/faq");
    const note = page.getByRole("dialog").filter({ hasText: "Cookies?" });
    await note.getByRole("button", { name: "Allow all" }).click();
    await expect(note).toHaveCount(0);
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "karman_replay_consent")?.value).toBe("yes");
  });
});

test.describe("student portal", () => {
  test("Today, Progress, Library, time trials and Settings open", async ({ page }) => {
    const errors = watchErrors(page);
    await impersonate(page, "dev-seed-mid@karman.local");
    await expect(page).toHaveURL(/\/dashboard\/student/);
    await expect(page).toHaveTitle(/Today/);

    for (const [path, title] of [
      ["/dashboard/student/progress", /Progress/],
      ["/dashboard/student/library", /Library/],
      ["/learn/time-trial", /Time trial/],
      ["/dashboard/student/settings", /Settings/],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page).toHaveTitle(title);
    }
    await expect(page.getByRole("heading", { name: "Sound and motion" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("parent portal", () => {
  test("the week, the daily report and the email preview open", async ({ page }) => {
    const errors = watchErrors(page);
    await impersonate(page, "dev-seed-parent@karman.local");
    await page.goto("/dashboard/parent");
    await expect(page).toHaveURL(/\/dashboard\/parent\/[0-9a-f-]{36}$/);
    await expect(page.locator("body")).toContainText("Next sessions");
    const week = page.url();

    await page.goto(`${week}/report`);
    await expect(page).toHaveTitle(/Daily report/);
    await expect(page.getByRole("heading", { name: "Predicted score" })).toBeVisible();

    await page.goto(`${week}/report/email`);
    await expect(page).toHaveTitle(/Daily email/);
    await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("tutor portal", () => {
  test("the tutor sees their students", async ({ page }) => {
    await impersonate(page, "dev-seed-tutor@karman.local");
    await page.goto("/tutor");
    await expect(page).toHaveTitle(/Your students/);
    await expect(page.locator("body")).toContainText("Mid Student");
  });
});

test.describe("admin portal", () => {
  test("home and revenue open", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "People and money" })).toBeVisible();
    await page.goto("/admin/revenue");
    await expect(page.getByRole("heading", { name: "Revenue", exact: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
