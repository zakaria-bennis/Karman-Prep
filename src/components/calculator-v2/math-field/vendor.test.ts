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
  "0008-katex-fonts.patch",
  "0009-autocommand-yields-to-operator-name.patch",
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
  expect(css).not.toMatch(/@font-face|url\(/);
  expect(css).not.toMatch(/font(-family)?\s*:[^;}]*Symbola/);
  expect(declarationsFor(css, ".mq-math-mode").join(";")).toMatch(
    /font-family: KaTeX_Main, "Times New Roman", serif/
  );
  expect(declarationsFor(css, ".mq-math-mode var").join(";")).toMatch(
    /font-family: KaTeX_Math, "Times New Roman", serif/
  );
});
