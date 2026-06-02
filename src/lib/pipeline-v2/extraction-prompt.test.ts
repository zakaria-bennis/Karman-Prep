// @vitest-environment node
//
// Invariant tests for the Stage 1 extractor prompts, loaded from
// question-imports/prompts/ by scripts/lib/extraction-prompt.mjs.
//
// The prompts drive a model call we can't test end-to-end without
// spending API tokens, so the value here is locking the invariants
// downstream code DEPENDS ON:
//
//   1. The 95 / 42 / 52 count floors in the user prompt must match
//      extraction-coverage.mjs — separate copies that must not drift.
//   2. CONTINUATION PAGES + do-not-fabricate must survive rewrites
//      (the literal fixes for the 202406asiav2.pdf misses).
//   3. {{source_pdf}} must interpolate, and must not leak as a literal.
//   4. The Stage 1 output contract is exactly { "questions": [...] } —
//      the old extraction_summary / page_coverage scaffolding (which
//      contradicted the runner suffix and the Kimi call) must stay gone.
//   5. The system prompt is extraction-only (forbids downstream content)
//      and injects the canonical taxonomy.
//
// These read the real prompt files from disk (node env).

import { describe, expect, it } from "vitest";
import {
  buildUserPrompt,
  loadStage1SystemPrompt,
} from "../../../scripts/lib/extraction-prompt.mjs";
import { FLOORS } from "../../../scripts/lib/extraction-coverage.mjs";

describe("buildUserPrompt — basic shape", () => {
  it("returns a substantial string", () => {
    const p = buildUserPrompt("202406asiav2.pdf");
    expect(typeof p).toBe("string");
    expect(p.length).toBeGreaterThan(5_000);
  });

  it("interpolates the source PDF filename", () => {
    const p = buildUserPrompt("test-pdf-name.pdf");
    expect(p).toContain("test-pdf-name.pdf");
  });

  it("does not leak the {{source_pdf}} placeholder", () => {
    expect(buildUserPrompt("anything.pdf")).not.toContain("{{source_pdf}}");
  });
});

describe("buildUserPrompt — single { questions } contract, no metadata scaffolding", () => {
  const p = buildUserPrompt("any.pdf");

  it("declares the single questions output contract", () => {
    expect(p).toContain('{ "questions": [ ... ] }');
  });

  it("does not ask for extraction_summary / page_coverage keys", () => {
    // The Stage 1 Kimi call only consumes { questions: [...] }. The old
    // scaffolding wasted output tokens and contradicted the runner
    // suffix — it must stay removed.
    expect(p).not.toMatch(/extraction_summary"\s*:/);
    expect(p).not.toMatch(/page_coverage"\s*:/);
    expect(p).not.toMatch(/If the response schema (allows|does not allow)/i);
  });
});

describe("buildUserPrompt — floors stay in sync with the runtime guard", () => {
  const p = buildUserPrompt("smoke.pdf");
  it("references the total floor", () => expect(p).toContain(`< ${FLOORS.total}`));
  it("references the math floor", () => expect(p).toContain(`< ${FLOORS.math}`));
  it("references the rw floor", () => expect(p).toContain(`< ${FLOORS.rw}`));
});

describe("buildUserPrompt — critical sections survive", () => {
  const p = buildUserPrompt("any.pdf");

  it("includes the CONTINUATION PAGES section (task #109 fix)", () => {
    expect(p).toMatch(/CONTINUATION PAGES/);
    expect(p).toMatch(/same figure or repeated top section/);
    expect(p).toMatch(/Do not skip page N\+1 just because the top looks duplicated/);
  });

  it("includes the do-not-fabricate guard", () => {
    expect(p).toMatch(/do NOT fabricate questions/);
    expect(p).toMatch(/not permission to invent rows/);
  });

  it("reads the answer key and never copies the student's on-page selection", () => {
    // The official answer key (a per-module list at the end) is the source
    // of truth → answer_source = "extracted". A highlighted on-page choice
    // is the student's (often wrong) selection and must never be copied.
    // Solving is the fallback only when no key exists.
    expect(p).toMatch(/answer key/i);
    expect(p).toMatch(/NEVER copy it/i);
    expect(p).toMatch(/answer_source = "extracted"/);
    expect(p).toMatch(/answer_source = "inferred"/);
  });

  it("forbids generating downstream content", () => {
    expect(p).toMatch(/Do NOT extract or generate/);
    expect(p).toMatch(/desmos_strategy/);
    expect(p).toMatch(/explanation_text/);
  });
});

describe("buildUserPrompt — example shows non-anchoring enum defaults", () => {
  const p = buildUserPrompt("any.pdf");

  it("does not show empty-string defaults for enum fields", () => {
    expect(p).not.toMatch(/"domain":\s*""/);
    expect(p).not.toMatch(/"topic_cluster":\s*""/);
    expect(p).not.toMatch(/"concept_slug":\s*""/);
  });
});

describe("loadStage1SystemPrompt — extraction-only role + taxonomy", () => {
  const s = loadStage1SystemPrompt();

  it("states the extraction-only role and single contract", () => {
    expect(s).toMatch(/Stage 1 question extractor/);
    expect(s).toMatch(/ONLY job/);
    expect(s).toContain('{ "questions": [ ... ] }');
  });

  it("forbids downstream content (explanations / hints / Desmos / CSV / images)", () => {
    expect(s).toMatch(/STRICTLY OUT OF SCOPE/);
    expect(s).toMatch(/explanation_text/);
    expect(s).toMatch(/hints/);
    expect(s).toMatch(/Desmos/);
    expect(s).toMatch(/base64/);
  });

  it("does not claim strict schema enforcement (Kimi json_object is loose)", () => {
    expect(s).toMatch(/does NOT enforce/);
    expect(s).toMatch(/post-extraction validat/i);
  });

  it("injects the canonical taxonomy (8 domains, 89 slugs)", () => {
    expect(s).toMatch(/8 DOMAINS/);
    expect(s).toMatch(/89 CONCEPT SLUGS/);
    expect(s).toContain("advanced_math");
    expect(s).toContain("linear-equations-one-variable");
  });

  it("states the fixed small enums", () => {
    expect(s).toMatch(/"multiple_choice"\s*\|\s*"numeric_entry"/);
    expect(s).toMatch(/"extracted"\s*\|\s*"inferred"\s*\|\s*"hand_corrected"/);
    expect(s).toMatch(/"ok"\s*\|\s*"needs_review"/);
  });
});
