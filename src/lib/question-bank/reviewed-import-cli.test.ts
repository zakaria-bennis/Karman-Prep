// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REVIEWED_DIFFICULTY_RUBRIC_VERSION } from "./reviewed-difficulty";

function run(overrides: Record<string, unknown>, dryRun = true) {
  const directory = mkdtempSync(join(tmpdir(), "karman-reviewed-cli-"));
  try {
    const pdf = join(directory, "synthetic.pdf");
    const json = join(directory, "synthetic.json");
    writeFileSync(pdf, "%PDF-synthetic-local-identity-fixture");
    writeFileSync(
      json,
      JSON.stringify([
        {
          question_text: "Solve x + 2 = 5.",
          correct_answer: "3",
          domain: "algebra",
          question_format: "numeric_entry",
          concept_slug: "linear-equations-one-variable",
          difficulty_level: 7,
          difficulty_rationale: "Synthetic boundary test, not a real assessment.",
          difficulty_confidence: 0.95,
          difficulty_rubric_version: REVIEWED_DIFFICULTY_RUBRIC_VERSION,
          difficulty_solution_sha256: "a".repeat(64),
          difficulty_content_sha256: "b".repeat(64),
          difficulty_uncertain: false,
          skill_uncertain: false,
          difficulty_selectable_for_downstream: true,
          skill_selectable_for_downstream: true,
          source_exam_readiness_withdrawn: false,
          source_quality_hold: false,
          current_version: true,
          website_import_ready: true,
          source_provider: "box",
          source_document_id: "synthetic-doc",
          source_provider_version_id: "synthetic-version",
          section: "math",
          module_number: 2,
          question_number: 4,
          occurrence_index: 1,
          ...overrides,
        },
      ])
    );
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    return spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve("scripts/pdf-pipeline/import-reviewed-questions.ts"),
        json,
        pdf,
        ...(dryRun ? ["--dry-run"] : []),
      ],
      { encoding: "utf8", env, timeout: 15000 }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("reviewed import CLI boundary", () => {
  it("validates numeric difficulty and source identity without DB credentials", () => {
    const result = run({});
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"database_accessed": false');
    expect(result.stdout).toContain('"difficulty_level": 7');
  });
  it("rejects missing identity before any DB construction", () => {
    const result = run({ module_number: null });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Import preflight failed");
    expect(result.stderr).not.toContain("Missing NEXT_PUBLIC_SUPABASE_URL");
  });
  it("holds withdrawn and preview-only exports on the write path", () => {
    for (const overrides of [
      { source_exam_readiness_withdrawn: true },
      { website_import_ready: false },
    ]) {
      const result = run(overrides, false);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("No questions were written");
      expect(result.stderr).not.toContain("Missing NEXT_PUBLIC_SUPABASE_URL");
    }
  });
});
