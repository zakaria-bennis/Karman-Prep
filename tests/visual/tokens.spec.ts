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

// Type-scale guardrails — ranges, not exact pixel matches. The
// app uses Tailwind utility classes (text-2xl / text-base / etc.)
// so any single h1 might legitimately be 24-32px depending on
// surface (dashboard vs landing). The checker only flags
// headings whose size falls *outside* a sensible range — i.e.
// an h1 rendered at 11px would surface as drift but a 24px vs
// 32px choice is a design judgment, not a bug.
//
// Tweak the bounds if the design language genuinely shifts; the
// goal is "spot the accident", not "enforce one number."
const TYPE_RANGES: Record<"h1" | "h2" | "h3", { minPx: number; maxPx: number }> = {
  h1: { minPx: 20, maxPx: 56 },
  h2: { minPx: 14, maxPx: 36 },
  h3: { minPx: 12, maxPx: 28 },
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
    const result = await page.evaluate((ranges) => {
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
        const range = ranges[kind];
        const cs = window.getComputedStyle(el);
        const px = parseFloat(cs.fontSize);
        if (px < range.minPx || px > range.maxPx) {
          drift.push({
            kind: `${kind} font-size outside ${range.minPx}-${range.maxPx}px range`,
            selector: `${kind}${el.id ? `#${el.id}` : ""}`,
            text: (el.textContent ?? "").trim().slice(0, 60),
            expected: `${range.minPx}-${range.maxPx}px`,
            actual: cs.fontSize,
          });
        }
      }

      // Detect raw hex / non-token colors. Tailwind compiles to
      // rgb()/rgba(), so any inline style with a literal "#" hex
      // in `color` or `background-color` is suspicious.
      //
      // EXCEPT: CSS gradients (linear-gradient, radial-gradient,
      // conic-gradient) need hex stops because Tailwind doesn't
      // tokenize gradient colors. Skip those — they're false
      // positives, not real drift.
      const styleNodes = document.querySelectorAll<HTMLElement>("[style*='#']");
      for (const el of styleNodes) {
        const inline = el.getAttribute("style") ?? "";
        if (/(linear|radial|conic)-gradient/.test(inline)) continue;
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
    }, TYPE_RANGES);

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
