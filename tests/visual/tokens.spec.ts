// ============================================================
// Design-token drift checker. Reads the computed CSS of headings
// + the floating banner and emits a JSON report of what doesn't
// match docs/design-tokens.md. Catches "an h1 silently became
// 28px" or "a hex code crept in outside the palette."
//
// This spec NEVER fails the suite — drift goes into a report.
// Tighten with explicit expect()s once the catalog is clean.
// ============================================================

import { test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REPORT = path.resolve(process.cwd(), "tests", "visual", "snapshots", "tokens");

// Mirror of docs/design-tokens.md → type scale. Keep in lockstep.
const EXPECTED_TYPE = {
  h1: { fontSize: "32px", lineHeight: "36.8px" }, // 32 × 1.15
  h2: { fontSize: "24px", lineHeight: "28.8px" }, // 24 × 1.2
  h3: { fontSize: "18px", lineHeight: "22.5px" }, // 18 × 1.25
};

const PAGES_TO_AUDIT = [
  { persona: "admin", url: "/admin/users", email: null },
  { persona: "student_mid", url: "/dashboard/student", email: "dev-seed-mid@karman.local" },
];

async function impersonateByEmail(page: Page, email: string) {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/users");
  const row = page.locator("tr", { hasText: email });
  await row.getByRole("button", { name: /Impersonate/i }).click();
  await page.waitForURL(/dashboard|tutor|learn|admin/);
}

async function clearImpersonation(page: Page) {
  const banner = page.getByRole("status");
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole("button", { name: /Exit impersonation/i }).click();
  }
}

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
