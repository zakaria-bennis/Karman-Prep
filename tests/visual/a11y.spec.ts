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
import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { impersonateByEmail } from "./helpers";

const ROOT = path.resolve(process.cwd(), "tests", "visual", "snapshots", "a11y");

const PAGES_TO_SCAN = [
  { persona: "admin", url: "/admin/users", email: null },
  { persona: "admin", url: "/admin/cohorts", email: null },
  { persona: "student_mid", url: "/dashboard/student", email: "dev-seed-mid@karman.local" },
  { persona: "student_mid", url: "/learn", email: "dev-seed-mid@karman.local" },
  { persona: "student_mid", url: "/learn/math", email: "dev-seed-mid@karman.local" },
  { persona: "student_mid", url: "/learn/reading", email: "dev-seed-mid@karman.local" },
  { persona: "tutor", url: "/tutor", email: "dev-seed-tutor@karman.local" },
];

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
            nodes: v.nodes.length,
          })),
        },
        null,
        2
      )
    );
  });
}
