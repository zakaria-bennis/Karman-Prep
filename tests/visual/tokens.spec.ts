// ============================================================
// Design-token drift checker. Reads the computed CSS of headings
// + the floating banner and emits a JSON report of what doesn't
// match docs/design-tokens.md. Catches "an h1 silently became
// 28px" or "a hex code crept in outside the palette."
//
// This spec NEVER fails the suite — drift goes into a report.
// Tighten with explicit expect()s once the catalog is clean.
// ============================================================

import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { impersonateByEmail, clearImpersonation } from "./helpers";

const REPORT = path.resolve(process.cwd(), "tests", "visual", "snapshots", "tokens");

// Mirror of docs/design-tokens.md → type scale. Keep in lockstep.
const EXPECTED_TYPE = {
  h1: { fontSize: "32px", lineHeight: "36.8px" }, // 32 × 1.15
  h2: { fontSize: "24px", lineHeight: "28.8px" }, // 24 × 1.2
  h3: { fontSize: "18px", lineHeight: "22.5px" }, // 18 × 1.25
};

// One page per persona that exercises typography + glassy surfaces +
// gradient palettes. Skipping dynamic routes that need a seeded
// resource id — those belong in flow tests, not the drift scan.
const PAGES_TO_AUDIT = [
  // Public marketing surfaces — heavy on landing typography + cards.
  { persona: "public", url: "/", email: null },
  { persona: "public", url: "/faq", email: null },
  { persona: "public", url: "/guarantee", email: null },
  // Admin tools — densest pages, most h2/h3.
  { persona: "admin", url: "/admin/users", email: null },
  { persona: "admin", url: "/admin/cohorts", email: null },
  { persona: "admin", url: "/admin/revenue", email: null },
  { persona: "admin", url: "/admin/curriculum", email: null },
  // Student surfaces.
  { persona: "student_mid", url: "/dashboard/student", email: "dev-seed-mid@karman.local" },
  {
    persona: "student_mid",
    url: "/dashboard/student/progress",
    email: "dev-seed-mid@karman.local",
  },
  { persona: "student_mid", url: "/learn", email: "dev-seed-mid@karman.local" },
  // Tutor surfaces.
  { persona: "tutor", url: "/tutor", email: "dev-seed-tutor@karman.local" },
  { persona: "tutor", url: "/tutor/earnings", email: "dev-seed-tutor@karman.local" },
  // Parent surface.
  { persona: "parent", url: "/dashboard/parent", email: "dev-seed-parent@karman.local" },
];

test.describe.configure({ mode: "serial" });

for (const { persona, url, email } of PAGES_TO_AUDIT) {
  test(`tokens · ${persona} · ${url}`, async ({ page }) => {
    if (email) await impersonateByEmail(page, email);
    else await clearImpersonation(page);
    await page.goto(url);
    await page.waitForLoadState("networkidle").catch(() => {});

    // Pull computed font-size + line-height for every heading and
    // every unique color used as text or background. Done inside
    // the page so we don't pay N round-trips for N elements.
    const result = await page.evaluate((expected) => {
      const drift: Array<{
        kind: string;
        selector: string;
        text: string;
        expected?: string;
        actual: string;
      }> = [];

      function classify(el: Element): string {
        const tag = el.tagName.toLowerCase();
        if (tag === "h1" || tag === "h2" || tag === "h3") return tag;
        return "";
      }

      for (const el of document.querySelectorAll("h1, h2, h3")) {
        const kind = classify(el) as "h1" | "h2" | "h3";
        const exp = expected[kind];
        const cs = window.getComputedStyle(el);
        const actual = {
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
        };
        if (actual.fontSize !== exp.fontSize) {
          drift.push({
            kind: `${kind} font-size`,
            selector: `${kind}${el.id ? `#${el.id}` : ""}`,
            text: (el.textContent ?? "").trim().slice(0, 60),
            expected: exp.fontSize,
            actual: actual.fontSize,
          });
        }
        if (actual.lineHeight !== "normal" && actual.lineHeight !== exp.lineHeight) {
          drift.push({
            kind: `${kind} line-height`,
            selector: `${kind}${el.id ? `#${el.id}` : ""}`,
            text: (el.textContent ?? "").trim().slice(0, 60),
            expected: exp.lineHeight,
            actual: actual.lineHeight,
          });
        }
      }

      // Detect raw hex / non-token colors. Tailwind compiles to
      // rgb()/rgba(), so any inline style with a literal "#" hex
      // in `color` or `background-color` is suspicious.
      const styleNodes = document.querySelectorAll<HTMLElement>("[style*='#']");
      for (const el of styleNodes) {
        const inline = el.getAttribute("style") ?? "";
        if (/#[0-9a-fA-F]{3,8}/.test(inline)) {
          drift.push({
            kind: "raw hex in inline style",
            selector: el.tagName.toLowerCase(),
            text: (el.textContent ?? "").trim().slice(0, 60),
            actual: inline.slice(0, 120),
          });
        }
      }

      return drift;
    }, EXPECTED_TYPE);

    await mkdir(REPORT, { recursive: true });
    const slug = url.replace(/^\//, "").replace(/\//g, "_") || "root";
    const file = path.join(REPORT, `${persona}__${slug}.json`);
    await writeFile(
      file,
      JSON.stringify(
        {
          url,
          persona,
          driftCount: result.length,
          drift: result,
        },
        null,
        2
      )
    );
  });
}
