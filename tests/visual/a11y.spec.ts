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

// ── Coverage ──────────────────────────────────────────────────
// Each persona scans the pages they actually land on after auth.
// Public pages (landing, privacy, etc.) are scanned with the
// `public` persona (no impersonation).
//
// New page? Add a row. Skip dynamic routes that need a seeded
// resource id (e.g. /admin/cohorts/[id]) — those need fixture
// data and belong in the e2e flow.
const PAGES_TO_SCAN = [
  // Public / unauth
  { persona: "public", url: "/", email: null },
  { persona: "public", url: "/faq", email: null },
  { persona: "public", url: "/privacy", email: null },
  { persona: "public", url: "/terms", email: null },
  { persona: "public", url: "/refunds", email: null },
  { persona: "public", url: "/guarantee", email: null },
  { persona: "public", url: "/about", email: null },
  { persona: "public", url: "/blog", email: null },
  // Admin
  { persona: "admin", url: "/admin/users", email: null },
  { persona: "admin", url: "/admin/cohorts", email: null },
  { persona: "admin", url: "/admin/curriculum", email: null },
  { persona: "admin", url: "/admin/jobs", email: null },
  { persona: "admin", url: "/admin/revenue", email: null },
  { persona: "admin", url: "/admin/moderation", email: null },
  { persona: "admin", url: "/admin/questions/review", email: null },
  { persona: "admin", url: "/admin/questions/import", email: null },
  // Student (mid persona)
  { persona: "student_mid", url: "/dashboard/student", email: "dev-seed-mid@karman.local" },
  {
    persona: "student_mid",
    url: "/dashboard/student/schedule",
    email: "dev-seed-mid@karman.local",
  },
  {
    persona: "student_mid",
    url: "/dashboard/student/progress",
    email: "dev-seed-mid@karman.local",
  },
  { persona: "student_mid", url: "/dashboard/student/chat", email: "dev-seed-mid@karman.local" },
  {
    persona: "student_mid",
    url: "/dashboard/student/mastered",
    email: "dev-seed-mid@karman.local",
  },
  {
    persona: "student_mid",
    url: "/dashboard/student/predicted-sat",
    email: "dev-seed-mid@karman.local",
  },
  { persona: "student_mid", url: "/learn", email: "dev-seed-mid@karman.local" },
  { persona: "student_mid", url: "/learn/math", email: "dev-seed-mid@karman.local" },
  { persona: "student_mid", url: "/learn/reading", email: "dev-seed-mid@karman.local" },
  // Tutor
  { persona: "tutor", url: "/tutor", email: "dev-seed-tutor@karman.local" },
  { persona: "tutor", url: "/tutor/schedule", email: "dev-seed-tutor@karman.local" },
  { persona: "tutor", url: "/tutor/earnings", email: "dev-seed-tutor@karman.local" },
  { persona: "tutor", url: "/tutor/payouts", email: "dev-seed-tutor@karman.local" },
  { persona: "tutor", url: "/tutor/settings/booking", email: "dev-seed-tutor@karman.local" },
  { persona: "tutor", url: "/tutor/settings/payment", email: "dev-seed-tutor@karman.local" },
  // Parent
  { persona: "parent", url: "/dashboard/parent", email: "dev-seed-parent@karman.local" },
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
            // Compact summary — node count only. To debug a specific
            // violation, temporarily enrich to capture per-node
            // target+failureSummary+html, run once, revert. We did
            // that pass during PR #139's a11y cleanup; the catalog
            // is clean enough that the count is the steady-state
            // signal worth tracking long-term.
            nodes: v.nodes.length,
          })),
        },
        null,
        2
      )
    );
  });
}
