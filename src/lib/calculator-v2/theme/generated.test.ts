import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import ts from "typescript";
import { expect, it } from "vitest";
import {
  GENERATED_FILES,
  generateSkinColorFiles,
  syncSkinColorFiles,
} from "../../../../scripts/calculator-v2/generate-skin-colors";
import { SITE_THEMES } from "../../themes/palettes";
import { CHROME_VARS, type ChromeRole } from "./roles";
import { SKIN_COLORS } from "./skin-colors.generated";
import { SKIN_IDS, type SkinId } from "./skins";

const ROOT = resolve(__dirname, "../../../..");
const GENERATOR = "scripts/calculator-v2/generate-skin-colors.ts";

/**
 * Repo-relative paths reached from `entry` through top-level relative imports and re-exports
 * whose clause is not type-only (the entry included).
 */
function valueImportClosure(entry: string): string[] {
  const visited = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const path = queue.shift() as string;
    if (visited.has(path)) continue;
    visited.add(path);
    const source = readFileSync(join(ROOT, path), "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    for (const statement of file.statements) {
      let specifier: ts.Expression | undefined;
      let typeOnly = false;
      if (ts.isImportDeclaration(statement)) {
        specifier = statement.moduleSpecifier;
        typeOnly = statement.importClause?.isTypeOnly ?? false;
      } else if (ts.isExportDeclaration(statement)) {
        specifier = statement.moduleSpecifier;
        typeOnly = statement.isTypeOnly;
      }
      if (!specifier || !ts.isStringLiteral(specifier) || typeOnly) continue;
      if (!specifier.text.startsWith(".")) continue;
      const target = resolve(ROOT, dirname(path), `${specifier.text}.ts`);
      queue.push(relative(ROOT, target).split(sep).join("/"));
    }
  }
  return [...visited];
}

/** The rule blocks of a stylesheet, comments stripped, with each block's declarations. */
function cssBlocks(sheet: string): { sel: string; decls: Record<string, string> }[] {
  const text = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => {
    const decls: Record<string, string> = {};
    for (const part of match[2].split(";")) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      decls[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
    }
    return { sel: match[1].trim(), decls };
  });
}

function expected(skin: SkinId): Record<string, string> {
  const roles = SKIN_COLORS[skin].normal.roles;
  return Object.fromEntries(
    (Object.keys(CHROME_VARS) as ChromeRole[]).map((role) => [CHROME_VARS[role], roles[role]])
  );
}

it("TH-5 the generator's value imports never reach skin-colors.generated.ts, so it runs when that file is missing", () => {
  const visited = valueImportClosure(GENERATOR);
  expect(visited).toContain("src/lib/calculator-v2/theme/vars.ts");
  expect(visited).toContain("src/lib/calculator-v2/theme/derive.ts");
  for (const path of visited) {
    expect(path.endsWith("skin-colors.generated.ts"), path).toBe(false);
    expect(path.endsWith("theme/roles.ts"), path).toBe(false);
  }
});

it("TH-5 the checked-in table and chrome sheet match a fresh generation from palettes.ts", async () => {
  const files = await generateSkinColorFiles();
  expect(Object.keys(files).sort()).toEqual([
    GENERATED_FILES.chromeCss,
    GENERATED_FILES.skinColors,
  ]);
  for (const path of Object.keys(files)) {
    expect(readFileSync(join(ROOT, path), "utf8"), path).toBe(files[path]);
  }
}, 60_000);

it("TH-5 SKIN_IDS are the palettes.ts themes in order", () => {
  expect([...SKIN_IDS]).toEqual(SITE_THEMES.map((t) => t.id));
});

it("TH-5 the chrome sheet holds only the seven chrome roles for the 12 skins and the ivory and observatory fallback", () => {
  const sheet = readFileSync(join(ROOT, GENERATED_FILES.chromeCss), "utf8");
  const blocks = cssBlocks(sheet);
  expect(blocks.map((b) => b.sel)).toEqual([
    ":root",
    ":root",
    ...SKIN_IDS.map((id) => 'html[data-theme="' + id + '"]'),
  ]);
  expect(sheet).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:root \{/);
  expect(blocks[0].decls).toEqual(expected("ivory"));
  expect(blocks[1].decls).toEqual(expected("observatory"));
  SKIN_IDS.forEach((id, i) => {
    expect(blocks[i + 2].decls, id).toEqual(expected(id));
  });
  expect(gzipSync(sheet).length).toBeLessThan(10_240);
});

it("TH-5 check mode reports drift and write mode repairs it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "karman-skins-"));
  try {
    const both = [GENERATED_FILES.chromeCss, GENERATED_FILES.skinColors].sort();
    expect((await syncSkinColorFiles(dir, "write")).sort()).toEqual(both);
    await expect(syncSkinColorFiles(dir, "check")).resolves.toEqual([]);
    writeFileSync(join(dir, GENERATED_FILES.chromeCss), "/* edited */\n");
    await expect(syncSkinColorFiles(dir, "check")).resolves.toEqual([GENERATED_FILES.chromeCss]);
    expect((await syncSkinColorFiles(dir, "write")).sort()).toEqual(both);
    await expect(syncSkinColorFiles(dir, "check")).resolves.toEqual([]);
    expect(readFileSync(join(dir, GENERATED_FILES.chromeCss), "utf8")).toBe(
      (await generateSkinColorFiles())[GENERATED_FILES.chromeCss]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 60_000);
