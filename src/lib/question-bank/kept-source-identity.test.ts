// @vitest-environment node
//
// A QA correction may keep a QA-hidden live row's stored source identity
// (module "UNSPECIFIED", section "writing" on the 2023-03 / 2023-05 imports);
// a new row never can, and a correction naming another identity is refused.

import { describe, expect, it } from "vitest";
import {
  importQuestion,
  preflightImportRows,
  rowToImportInput,
} from "../../../scripts/pdf-pipeline/import-json-direct-row";
import { recordingClient, type RecordedWrite } from "../../../scripts/import-tools/ts/stage-rows";
import { parseKeptIdentities, type KeptSourceIdentity } from "./kept-source-identity";

const version = "c".repeat(64);

function legacyRow(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stable_question_id: "2023-03_UNSPECIFIED_V1_Writing_MUNSPECIFIED_Q21",
    question_text: "Which choice completes the text so that it conforms to the conventions?",
    correct_answer: "B",
    domain: "expression_ideas",
    choice_a: "however",
    choice_b: "however,",
    choice_c: "however;",
    choice_d: "however:",
    difficulty: 3,
    question_format: "multiple_choice",
    answer_source: "extracted",
    import_status: "ok",
    source_section: "writing",
    source_module: "UNSPECIFIED",
    source_question_number: 21,
    source_occurrence: 1,
    ...extra,
  };
}

const live: KeptSourceIdentity[] = [
  {
    source_version: version,
    source_section: "writing",
    source_module: "UNSPECIFIED",
    source_question_number: 21,
  },
];

describe("kept source identity (QA corrections of legacy live rows)", () => {
  it("a correction naming the live row's UNSPECIFIED identity keeps it verbatim", async () => {
    const { inputs, errors } = preflightImportRows([legacyRow()], "f.pdf", version, true, live);
    expect(errors).toEqual([]);
    expect(inputs[0]).toMatchObject({
      source_version: version,
      source_section: "writing",
      source_module: "UNSPECIFIED",
      source_question_number: 21,
      source_occurrence: 1,
      source_identity_kept: true,
      import_status: "ok",
    });
    // The importer accepts it (no section/domain mismatch) and writes the identity as stored.
    const writes: RecordedWrite[] = [];
    const result = await importQuestion(recordingClient(writes), inputs[0]);
    expect(result.errors).toEqual([]);
    const question = writes.find((w) => w.table === "quiz_questions" && w.op === "insert");
    expect(question?.values).toMatchObject({
      source_section: "writing",
      source_module: "UNSPECIFIED",
      source_question_number: 21,
      source_occurrence: 1,
    });
    expect(question?.values).not.toHaveProperty("source_identity_kept");
  });

  it("the same identity on a new row (no live row supplied) is refused", () => {
    expect(preflightImportRows([legacyRow()], "f.pdf", version, true).errors).toEqual([
      "row 1: missing stable source identity",
    ]);
    expect(preflightImportRows([legacyRow()], "f.pdf", version, true, []).errors).toEqual([
      "row 1: missing stable source identity",
    ]);
  });

  it("a correction whose identity differs from the live row is refused", () => {
    for (const extra of [
      { source_module: "MNone" },
      { source_section: "reading" },
      { source_question_number: 22 },
      { source_module: "unspecified" },
    ]) {
      const { errors } = preflightImportRows([legacyRow(extra)], "f.pdf", version, true, live);
      expect(errors).toEqual(["row 1: missing stable source identity"]);
    }
    // Another source file version never matches.
    const other = preflightImportRows([legacyRow()], "f.pdf", "d".repeat(64), true, live);
    expect(other.errors).toEqual(["row 1: missing stable source identity"]);
  });

  it("strict identities are unchanged when live identities are supplied", () => {
    const out = rowToImportInput(
      legacyRow({ domain: "algebra", source_section: "math", source_module: "M2" }),
      "f.pdf",
      version,
      live
    );
    expect(out).toMatchObject({ source_section: "math", source_module: "M2" });
    expect(out).not.toHaveProperty("source_identity_kept", true);
  });

  it("parses the keep-identities file and rejects malformed entries", () => {
    expect(parseKeptIdentities(live)).toEqual(live);
    expect(() => parseKeptIdentities({})).toThrow(/JSON array/);
    expect(() => parseKeptIdentities([{ ...live[0], source_module: "" }])).toThrow(/entry 1/);
    expect(() => parseKeptIdentities([{ ...live[0], source_question_number: "21" }])).toThrow(
      /entry 1/
    );
  });
});
