// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("paid question processing retirement", () => {
  it("removes launchers while preserving the new workflow's foundations", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    expect(pkg.scripts["pdf:extract"]).toBeUndefined();
    expect(pkg.scripts["pdf:grade"]).toBeUndefined();
    expect(pkg.scripts["questions:preflight"]).toContain("preflight-import-json.ts");
    for (const path of [
      "scripts/lib/llm-providers.mjs",
      ".github/workflows/process-pdf.yml",
      ".github/workflows/grade-only.yml",
      "scripts/pdf-pipeline/orchestrate.mjs",
    ])
      expect(existsSync(resolve(path)), path).toBe(false);
    for (const path of [
      "src/lib/question-bank/import-core.ts",
      "src/lib/question-bank/import-provenance.ts",
      "scripts/pdf-pipeline/import-json-direct-row.ts",
      "scripts/pdf-pipeline/preflight-import-json.ts",
      "scripts/lib/math-equivalence.mjs",
      "scripts/lib/page-render.mjs",
    ])
      expect(existsSync(resolve(path)), path).toBe(true);
  });
  it("keeps the generated taxonomy reference without starting a model client", () => {
    const result = spawnSync("python3", [resolve("question-imports/stage2_classify.py")], {
      encoding: "utf8",
      env: { ...process.env, GEMINI_API_KEY: "inert-local-only" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Paid exam classification is retired");
    const reference = readFileSync(resolve("question-imports/stage2_classify.py"), "utf8");
    expect(reference).toContain("AUTOGEN-BEGIN:taxonomy");
    expect(reference).not.toContain("genai.Client");
  });
});
