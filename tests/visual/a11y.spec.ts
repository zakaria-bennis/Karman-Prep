// ============================================================
// Accessibility scan — runs axe-core on each key page as the
// relevant persona and writes a violations report to
// tests/visual/snapshots/a11y/<persona>__<page>.json.
//
// Why a JSON report instead of failing the test: most legacy
// pages will have at least one violation. The PR exists to
// surface them, not to gate the build. Tighten the assertion
// once the catalog is clean.
// ============================================================

import AxeBuilder from "@axe-core/playwright";
import { test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "tests", "visual", "snapshots", "a11y");

const PAGES_TO_SCAN = [
  { persona: "admin", url: "/admin/users", email: null },
  { persona: "admin", url: "/admin/cohorts", email: null },
  { persona: "student_mid", url: "/dashboard/student", email: "dev-seed-mid@karman.local" },
  { persona: "student_mid", url: "/learn", email: "dev-seed-mid@karman.local" },
  { persona: "tutor", url: "/tutor", email: "dev-seed-tutor@karman.local" },
];

async function impersonateByEmail(page: Page, email: string) {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/users");
  const row = page.locator("tr", { hasText: email });
  await row.getByRole("button", { name: /Impersonate/i }).click();
  await page.waitForURL(/dashboard|tutor|learn|admin/);
}

test.describe.configure({ mode: "serial" });

for (const { persona, url, email } of PAGES_TO_SCAN) {
  test(`a11y · ${persona} · ${url}`, async ({ page }) => {
    if (email) await impersonateByEmail(page, email);
    await page.goto(url);
    await page.waitForLoadState("networkidle").catch(() => {});

    const results = await new AxeBuilder({ page })
      // WCAG 2 AA + best practices. Tweak the tag list if the
      // bar moves.
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    await mkdir(ROOT, { recursive: true });
    const slug = url.replace(/^\//, "").replace(/\//g, "_") || "root";
    const file = path.join(ROOT, `${persona}__${slug}.json`);
    await writeFile(
      file,
      JSON.stringify(
        {
          url,
          persona,
          violationCount: results.violations.length,
          violations: results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            // Per-node detail so when a violation surfaces we don't
            // need a separate debug spec to find the offending DOM
            // node — selector + offending HTML + failure summary are
            // captured here.
            nodes: v.nodes.map((n) => ({
              target: n.target,
              html: n.html.slice(0, 200),
              failureSummary: n.failureSummary?.split("\n").slice(0, 3).join(" / "),
            })),
          })),
        },
        null,
        2
      )
    );
  });
}
