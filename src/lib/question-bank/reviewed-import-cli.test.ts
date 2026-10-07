// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REVIEWED_DIFFICULTY_RUBRIC_VERSION } from "./reviewed-difficulty";
import { canonicalJson, sha256Hex } from "../../../scripts/pdf-pipeline/frozen-reviewed-input";

function run(
  overrides: Record<string, unknown>,
  dryRun = true,
  pinMode: "valid" | "none" | "stale-json" | "stale-pdf" | "stale-manifest" = "valid",
  entrypoint: "wrapper" | "direct" = "wrapper"
) {
  const directory = mkdtempSync(join(tmpdir(), "karman-reviewed-cli-"));
  try {
    const pdf = join(directory, "synthetic.pdf");
    const json = join(directory, "synthetic.json");
    const manifestPath = join(directory, "frozen-inputs.json");
    writeFileSync(pdf, "%PDF-synthetic-local-identity-fixture");
    const row = {
      stable_question_id: "synthetic-math-m2-q4",
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
      source_version: {
        content_sha256: "c".repeat(64),
        student_content_sha256: "b".repeat(64),
      },
      ...overrides,
    };
    const jsonBytes = Buffer.from(JSON.stringify([row]));
    const pdfBytes = Buffer.from("%PDF-synthetic-local-identity-fixture");
    writeFileSync(json, jsonBytes);
    const source = row.source_version as {
      content_sha256: string;
      student_content_sha256: string;
    };
    const manifestBytes = Buffer.from(
      JSON.stringify({
        schema_version: 1,
        reviewed_json_sha256: sha256Hex(jsonBytes),
        source_pdf_sha256: sha256Hex(pdfBytes),
        rows: [
          {
            stable_question_id: row.stable_question_id,
            row_sha256: sha256Hex(canonicalJson(row)),
            content_sha256: source.content_sha256,
            student_content_sha256: source.student_content_sha256,
          },
        ],
      })
    );
    writeFileSync(manifestPath, manifestBytes);
    const approvedManifestSha256 = sha256Hex(manifestBytes);
    if (pinMode === "stale-json") writeFileSync(json, `${jsonBytes.toString("utf8")} `);
    if (pinMode === "stale-pdf") writeFileSync(pdf, "%PDF-replaced-source");
    if (pinMode === "stale-manifest")
      writeFileSync(manifestPath, `${manifestBytes.toString("utf8")} `);
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    return spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(
          entrypoint === "wrapper"
            ? "scripts/pdf-pipeline/import-reviewed-questions.ts"
            : "scripts/pdf-pipeline/import-json-direct.ts"
        ),
        json,
        pdf,
        ...(entrypoint === "direct" ? ["--reviewed-difficulty", "--require-source-identity"] : []),
        ...(dryRun ? ["--dry-run"] : []),
        ...(pinMode === "none"
          ? []
          : ["--frozen-inputs", manifestPath, "--frozen-inputs-sha256", approvedManifestSha256]),
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
  it("requires a separately pinned manifest before constructing a database client", () => {
    const missing = run({}, false, "none");
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("frozen-inputs");
    expect(missing.stderr).not.toContain("Missing NEXT_PUBLIC_SUPABASE_URL");

    const valid = run({}, false);
    expect(valid.status).toBe(1);
    expect(valid.stderr).toContain("Missing NEXT_PUBLIC_SUPABASE_URL");
  });
  it("also guards direct reviewed importer invocation", () => {
    const missing = run({}, false, "none", "direct");
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("frozen input manifest");
    expect(missing.stderr).not.toContain("Missing NEXT_PUBLIC_SUPABASE_URL");
  });
  it("holds a pinned write with no approved concept tag", () => {
    const result = run({ concept_slug: null }, false);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("concept tag");
    expect(result.stderr).not.toContain("Missing NEXT_PUBLIC_SUPABASE_URL");
  });
  it.each(["stale-json", "stale-pdf", "stale-manifest"] as const)(
    "rejects %s before database access",
    (mode) => {
      const result = run({}, false, mode);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("No questions were written");
      expect(result.stderr).not.toContain("Missing NEXT_PUBLIC_SUPABASE_URL");
    }
  );
});
