// ============================================================
// Page pictures for the founder's review (2026-11-12). Lives only on the
// claude/page-shots branch, never merged. Takes a full-page picture of every
// site page and portal screen against the seeded test personas (no real
// people), and writes shots/manifest.json for the review page.
// ============================================================

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 900_000 });

const OUT = join(process.cwd(), "shots");
const MANIFEST = join(OUT, "manifest.json");
type Shot = { section: string; label: string; path: string; file: string; mode: string };

function record(shot: Shot) {
  const list: Shot[] = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : [];
  list.push(shot);
  writeFileSync(MANIFEST, JSON.stringify(list, null, 2));
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  // Hide the Next.js dev badge so it doesn't sit on top of the pictures.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.waitForTimeout(2500);
}

let n = 0;
async function shoot(
  page: Page,
  section: string,
  label: string,
  path: string | null,
  mode = "light desktop"
) {
  try {
    if (path) {
      const res = await page.goto(path, { timeout: 180_000 });
      if (res && res.status() >= 400) console.log(`! ${path} answered ${res.status()}`);
    }
    await settle(page);
  } catch (error) {
    console.log(`! ${section} · ${label}: ${error instanceof Error ? error.message : error}`);
    return;
  }
  n += 1;
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const file = `${section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${String(n).padStart(3, "0")}-${slug}-${mode.replace(/ /g, "-")}.jpg`;
  mkdirSync(dirname(join(OUT, file)), { recursive: true });
  await page.screenshot({
    path: join(OUT, file),
    fullPage: true,
    type: "jpeg",
    quality: 72,
    animations: "disabled",
  });
  record({ section, label, path: new URL(page.url()).pathname, file, mode });
  console.log(`✓ ${section} · ${label} (${mode})`);
}

async function impersonate(page: Page, email: string) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/users", { timeout: 180_000 });
  const row = page.locator("tr", { hasText: email });
  await expect(row).toBeVisible({ timeout: 60_000 });
  await row.getByRole("button", { name: /Impersonate/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Admin viewing as" })).toBeVisible({
    timeout: 60_000,
  });
}

const SITE: [string, string][] = [
  ["Home", "/"],
  ["Program", "/program"],
  ["Private tutoring", "/private-tutoring"],
  ["Pricing", "/pricing"],
  ["Guarantee", "/guarantee"],
  ["About", "/about"],
  ["FAQ", "/faq"],
  ["Research", "/research"],
  ["Schools", "/schools"],
  ["For tutors", "/for-tutors"],
  ["Free practice test", "/free-practice-test"],
  ["Terms", "/terms"],
  ["Refunds", "/refunds"],
  ["Privacy", "/privacy"],
  ["Cookies", "/cookies"],
];

test.use({ viewport: { width: 1440, height: 900 } });

test("site pages", async ({ page }) => {
  for (const [label, path] of SITE) await shoot(page, "Site", label, path);
  await page.emulateMedia({ colorScheme: "dark" });
  for (const [label, path] of [SITE[0], SITE[3]])
    await shoot(page, "Site", label, path, "dark desktop");
});

test("site pages on a phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  for (const [label, path] of [SITE[0], SITE[1], SITE[3]])
    await shoot(page, "Site", label, path, "light phone");
  await context.close();
});

test("cookie note", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "cf-ipcountry": "DE" },
  });
  const page = await context.newPage();
  await page.goto("/about", { timeout: 180_000 });
  await settle(page);
  n += 1;
  const file = `site/${String(n).padStart(3, "0")}-cookie-note-light-desktop.jpg`;
  mkdirSync(join(OUT, "site"), { recursive: true });
  await page.screenshot({ path: join(OUT, file), type: "jpeg", quality: 72 });
  record({
    section: "Site",
    label: "Cookie note (EU visitor)",
    path: "/about",
    file,
    mode: "light desktop",
  });
  await context.close();
});

test("student portal", async ({ page }) => {
  await impersonate(page, "maya.johnson@karman.local");
  const S: [string, string][] = [
    ["Today", "/dashboard/student"],
    ["Progress", "/dashboard/student/progress"],
    ["Library", "/dashboard/student/library"],
    ["Rewards", "/dashboard/student/rewards"],
    ["Homework", "/dashboard/student/homework"],
    ["Schedule", "/dashboard/student/schedule"],
    ["Settings", "/dashboard/student/settings"],
    ["Daily 10", "/learn/daily-ten"],
    ["Time trial", "/learn/time-trial"],
    ["Diagnostic", "/learn/diagnostic"],
  ];
  for (const [label, path] of S) await shoot(page, "Student portal", label, path);
  await page.emulateMedia({ colorScheme: "dark" });
  await shoot(page, "Student portal", "Today", "/dashboard/student", "dark desktop");
  await shoot(page, "Student portal", "Progress", "/dashboard/student/progress", "dark desktop");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await shoot(page, "Student portal", "Today", "/dashboard/student", "light phone");
  await shoot(page, "Student portal", "Library", "/dashboard/student/library", "light phone");
});

test("parent portal", async ({ page }) => {
  await impersonate(page, "rachel.johnson@karman.local");
  await page.goto("/dashboard/parent", { timeout: 180_000 });
  await page.waitForURL(/\/dashboard\/parent\/[0-9a-f-]{36}/, { timeout: 120_000 });
  const week = new URL(page.url()).pathname.replace(/\/$/, "");
  await shoot(page, "Parent portal", "The week", null);
  for (const [label, sub] of [
    ["Daily report", "/report"],
    ["Daily email preview", "/report/email"],
    ["Progress", "/progress"],
    ["Sessions", "/sessions"],
    ["Recap", "/recap"],
    ["Billing", "/billing"],
  ] as const)
    await shoot(page, "Parent portal", label, `${week}${sub}`);
  await shoot(page, "Parent portal", "Settings", "/dashboard/parent/settings");
  await page.emulateMedia({ colorScheme: "dark" });
  await shoot(page, "Parent portal", "Daily report", `${week}/report`, "dark desktop");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await shoot(page, "Parent portal", "Daily report", `${week}/report`, "light phone");
});

test("tutor portal", async ({ page }) => {
  await impersonate(page, "david@karman.local");
  await shoot(page, "Tutor portal", "Your students", "/tutor");
  const student = page.locator('a[href^="/tutor/"]:not([href^="/tutor/cohort"])').first();
  const href = await student.getAttribute("href").catch(() => null);
  if (href) {
    await shoot(page, "Tutor portal", "One student", href);
    await shoot(page, "Tutor portal", "Session briefing", `${href}/briefing`);
  }
});

test("school portal", async ({ page }) => {
  await impersonate(page, "thomas.wright@karman.local");
  await shoot(page, "School portal", "School home", "/school");
  await shoot(
    page,
    "School portal",
    "Class: Period 3",
    "/school/classes/5c400000-0000-4000-8000-000000000003"
  );
  await shoot(page, "School portal", "Billing", "/school/billing");
});

test("admin", async ({ page }) => {
  for (const [label, path] of [
    ["Home", "/admin"],
    ["Users", "/admin/users"],
    ["Revenue", "/admin/revenue"],
    ["Revenue (sample data)", "/admin/revenue?sample=1"],
    ["CRM list", "/admin/crm"],
    ["CRM pipeline", "/admin/crm?view=board"],
    ["Analytics", "/admin/analytics"],
    ["Analytics (sample data)", "/admin/analytics?sample=1"],
    ["Plans", "/admin/plans"],
  ] as const)
    await shoot(page, "Admin", label, path);
  await page.goto("/admin/crm", { timeout: 180_000 });
  const contact = page.locator('a[href^="/admin/crm/u-"]').first();
  const href = await contact.getAttribute("href").catch(() => null);
  if (href) await shoot(page, "Admin", "CRM contact", href);
  await page.emulateMedia({ colorScheme: "dark" });
  await shoot(page, "Admin", "Revenue", "/admin/revenue", "dark desktop");
});
