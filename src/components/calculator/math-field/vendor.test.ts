import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { getFileInfo } from "prettier";
import { expect, it } from "vitest";

it("AR-5 vendor/mathquill is excluded from ESLint and Prettier", async () => {
  const eslint = new ESLint({ cwd: process.cwd() });
  for (const file of ["vendor/mathquill/mathquill.js", "vendor/mathquill/mathquill.d.ts"])
    expect(await eslint.isPathIgnored(file), file).toBe(true);
  for (const file of ["vendor/mathquill/mathquill.js", "vendor/mathquill/README.md"])
    expect((await getFileInfo(file, { ignorePath: ".prettierignore" })).ignored, file).toBe(true);
  expect(readFileSync(".prettierignore", "utf8").split("\n")).toContain("vendor/");
});

const VENDOR = "vendor/mathquill";
const FULL_SHA = "1cbc1c4128ec87db3733bc99965522f7d62cde75";
const PATCH_FILES = [
  "0001-es-module-export.patch",
  "0002-no-window-global.patch",
  "0003-shadow-root-focus.patch",
  "0004-aria-label-is-the-name.patch",
  "0005-selection-latex.patch",
  "0006-strict-bracket-matching.patch",
  "0007-ellipsis-in-square-brackets.patch",
  "0008-math-font-stack.patch",
  "0009-autocommand-yields-to-operator-name.patch",
  "0011-subscript-keeps-what-is-typed.patch",
  "0012-revert-releases-focus-blur.patch",
];
// files in vendor/mathquill/ that are not upstream build output, so have no sha256 row
const UNHASHED = ["PATCHES.md", "README.md", "mathquill.d.ts", "patches"];
const read = (file: string) => readFileSync(path.join(VENDOR, file), "utf8");
const sha256 = (file: string) =>
  createHash("sha256")
    .update(readFileSync(path.join(VENDOR, file)))
    .digest("hex");
// declarations of every CSS rule whose comma-separated selector list contains `selector`
function declarationsFor(css: string, selector: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) =>
      m[1]
        .split(",")
        .map((s) => s.trim())
        .includes(selector)
    )
    .map((m) => m[2]);
}

it("AR-5 README records the upstream URL, the full SHA of 1cbc1c4128 and the exact build command", () => {
  const readme = read("README.md");
  expect(readme).toContain("Upstream: https://github.com/mathquill/mathquill");
  const sha = /^Commit: ([0-9a-f]{40})$/m.exec(readme)?.[1];
  expect(sha?.startsWith("1cbc1c4128")).toBe(true);
  expect(sha).toBe(FULL_SHA);
  expect(readme).toContain(`git -C "$MQ" checkout ${FULL_SHA}`);
  expect(readme).toContain("make js css OMIT_FONT_FACE=true NO_INSTALL=1");
});
it("AR-5 every vendored file's sha256 matches the README", () => {
  const rows = [...read("README.md").matchAll(/^\| (\S+) +\| ([0-9a-f]{64}) +\|$/gm)];
  // derived, not listed: a new output file without a row, or a row naming no file, fails here
  const vendored = readdirSync(VENDOR)
    .filter((f) => !UNHASHED.includes(f) && !f.startsWith("."))
    .sort();
  expect(vendored).toEqual(expect.arrayContaining(["LICENSE", "mathquill.css", "mathquill.js"]));
  expect(rows.map((r) => r[1]).sort()).toEqual(vendored);
  for (const [, file, hash] of rows) expect(sha256(file), file).toBe(hash);
});
it("AR-5 PATCHES.md lists every local change and nothing else", () => {
  const listed = [...read("PATCHES.md").matchAll(/patches\/(\d{4}-[a-z0-9-]+\.patch)/g)];
  expect(readdirSync(path.join(VENDOR, "patches")).sort()).toEqual(PATCH_FILES);
  expect([...new Set(listed.map((m) => m[1]))].sort()).toEqual(PATCH_FILES);
  expect(read("PATCHES.md")).toContain("OMIT_FONT_FACE=true");
});
it("AR-5 the vendored output carries the patches", () => {
  const js = read("mathquill.js");
  const css = read("mathquill.css");
  expect(js.trimEnd().endsWith("export default MathQuillModule;")).toBe(true);
  expect(js).not.toMatch(/window\.MathQuill|noConflict/);
  expect(js).toContain("selectionLatex");
  expect(js).toContain("endsLongerOperatorName"); // patches/0009
  expect(js).toContain("A subscript keeps whatever is typed in it"); // patches/0011
  expect(js).not.toMatch(/insRightOf\(this\.parent\);\s*cmd\.createLeftOf/); // patches/0011
  expect(css).not.toMatch(/@font-face|url\(/);
  expect(css).not.toMatch(/font(-family)?\s*:[^;}]*Symbola/);
  expect(css).not.toMatch(/KaTeX/);
  expect(declarationsFor(css, ".mq-math-mode").join(";")).toMatch(
    /font-family: var\(--kc-font-math, "Times New Roman", serif\)/
  );
  const variables = declarationsFor(css, ".mq-math-mode var").join(";");
  expect(variables).toMatch(/font-family: var\(--kc-font-math, "Times New Roman", serif\)/);
  expect(variables).toMatch(/font-style: italic/);
});

// entry rules are exactly 60 "=" (the MPL-2.0 text has its own shorter "===" underline)
const RULE = /^={60}$/;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
// the entry from its header line up to the next header (a line followed by a "====" line)
function noticeBlock(text: string, header: RegExp): string | null {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => header.test(l));
  if (start < 0) return null;
  let end = start + 2;
  while (end < lines.length && !(lines[end + 1] !== undefined && RULE.test(lines[end + 1]))) end++;
  return lines.slice(start, end).join("\n");
}
function missingNotices(text: string): string[] {
  const missing: string[] = [];
  const mq = noticeBlock(text, /^mathquill 0\.10\.1 \(MPL-2\.0\)$/);
  if (
    !mq ||
    !mq.includes("https://github.com/mathquill/mathquill") ||
    !mq.includes(FULL_SHA) ||
    !norm(mq).includes(norm(read("LICENSE")))
  )
    missing.push("mathquill");
  return missing;
}
const NOTICES = "public/calculator-notices.txt";

it("AR-5 calculator-notices.txt has MathQuill and, with no math font served, no KaTeX entry", () => {
  const text = readFileSync(NOTICES, "utf8");
  expect(missingNotices(text)).toEqual([]);
  expect(text).not.toMatch(/katex/i);
});
it("AR-5 the notices check fails when an entry is missing", () => {
  const text = readFileSync(NOTICES, "utf8");
  expect(missingNotices(text.replace(/^mathquill 0\.10\.1 \(MPL-2\.0\)$/m, "x"))).toContain(
    "mathquill"
  );
});
it("AR-5 mathquill.d.ts declares only members MathField.ts calls", () => {
  const dts = read("mathquill.d.ts");
  const body = /interface EditableMathQuill \{([^}]*)\}/.exec(dts)![1];
  const members = [...new Set([...body.matchAll(/^\s+(\w+)\(/gm)].map((m) => m[1]))];
  const adapter = readFileSync("src/components/calculator/math-field/MathField.ts", "utf8");
  for (const name of [...members, "getInterface", "MathField"])
    expect(adapter, name).toMatch(new RegExp(`\\.${name}\\(`));
});
it("MathField.ts is the only module under src/ that imports vendor/mathquill, types included", () => {
  // static `from "…"`, side-effect `import "…"` and dynamic `import("…")` specifiers.
  // Test files and __fixtures__/ are skipped (the scan rules): the seam-boundaries.test.ts
  // and the worker/import-graph.test.ts hold vendor/mathquill import strings as synthetic input.
  const SPECIFIER = /(\bfrom|\bimport)\s*\(?\s*["'][^"']*vendor\/mathquill/;
  const importers = (readdirSync("src", { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => !/\.test\.tsx?$/.test(f) && !f.includes("__fixtures__"))
    .map((f) => path.join("src", f))
    .filter((f) => SPECIFIER.test(readFileSync(f, "utf8")));
  expect(importers).toEqual(["src/components/calculator/math-field/MathField.ts"]);
});
