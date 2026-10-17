import { readFileSync } from "node:fs";
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
