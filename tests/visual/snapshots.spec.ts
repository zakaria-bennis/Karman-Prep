// ============================================================
// Visual snapshot harness — captures high-fidelity PNGs across
// personas × pages × viewports so I (the assistant) can read
// each file at full resolution via the Read tool, rather than
// squinting at compressed JPEGs from preview_screenshot.
//
// Run: `npm run test:visual`
//
// Output: tests/visual/snapshots/<persona>/<viewport>/<page>.png
//
// Pairs with the dev bypass + seed fixtures from PRs #52-#53.
// The default Playwright suite (test:e2e) already auto-starts
// the dev server as `dev_seed_admin`. This spec re-impersonates
// via the /admin/users Impersonate button before snapshotting
// student / tutor pages, mirroring how an admin would view
// another persona in real life.
// ============================================================

import { test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { impersonateByEmail, clearImpersonation } from "./helpers";

const ROOT = path.resolve(process.cwd(), "tests", "visual", "snapshots");

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const PERSONAS = [
  {
    key: "admin",
    email: null, // admin is the default landing persona — no Impersonate click needed
    pages: ["/admin/users", "/admin/cohorts", "/admin/jobs"],
  },
  {
    key: "student_mid",
    email: "dev-seed-mid@karman.local",
    pages: ["/dashboard/student", "/learn", "/dashboard/student/progress"],
  },
  {
    key: "student_stuck",
    email: "dev-seed-stuck@karman.local",
    pages: ["/dashboard/student"],
  },
  {
    key: "tutor",
    email: "dev-seed-tutor@karman.local",
    pages: ["/tutor", "/tutor/schedule"],
  },
] as const;

test.describe.configure({ mode: "serial" });

for (const persona of PERSONAS) {
  test.describe(`persona: ${persona.key}`, () => {
    for (const viewport of VIEWPORTS) {
      for (const url of persona.pages) {
        const label = url.replace(/^\//, "").replace(/\//g, "_") || "root";
        test(`${viewport.name} · ${url}`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          if (persona.email) {
            await impersonateByEmail(page, persona.email);
          } else {
            await clearImpersonation(page);
          }

          await page.goto(url);
          // Wait for the document to settle — most pages have a
          // small skeleton/loading state that vanishes within a
          // couple of frames.
          await page.waitForLoadState("networkidle").catch(() => {
            /* networkidle can hang on long-polling pages; fine */
          });

          // Path includes the project name so mobile-chrome and
          // mobile-safari don't clobber each other when running
          // the cross-engine matrix.
          const dir = path.join(ROOT, testInfo.project.name, persona.key, viewport.name);
          await mkdir(dir, { recursive: true });
          // Viewport-only (not fullPage) — long admin tables and
          // scrollable dashboards otherwise produce 30k+ px tall
          // PNGs that are unreadable when displayed at full size.
          // For "what does the gestalt look like" the visible top
          // of the page is what matters most.
          await page.screenshot({
            path: path.join(dir, `${label}.png`),
            fullPage: false,
            type: "png",
          });
        });
      }
    }
  });
}
