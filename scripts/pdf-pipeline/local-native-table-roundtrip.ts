// Synthetic only. This runner refuses any non-loopback API target.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { importQuestion, type ImportQuestionInput } from "@/lib/question-bank/import-core";
const api = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(api, "http://127.0.0.1:54321");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(key);
const db = createClient(api, key, { auth: { persistSession: false } });
const table = {
  caption: "Synthetic data",
  header_row: ["x", "y"],
  rows: [
    ["1", "2"],
    ["3", "4"],
  ],
  footer_note: "Synthetic fixture only",
};
const marker = `synthetic-native-tables-${Date.now()}.pdf`;
const version = createHash("sha256").update(marker).digest("hex");
const base: ImportQuestionInput = {
  question_text: "Synthetic: choose the table with y = 2x.",
  correct_answer: "A",
  domain: "algebra",
  concept_slug: "linear-equations-two-variables",
  choice_a: "Table A",
  choice_b: "Table B",
  choice_c: "Table C",
  choice_d: "Table D",
  source_pdf: marker,
  source_version: version,
  source_section: "math",
  source_module: "M1",
  source_question_number: 1,
  source_occurrence: 1,
  import_status: "ok",
  source_provider: "local_synthetic",
  source_document_id: marker,
  source_regions: [{ page: 1 }],
  source_identity_required: true,
  figure_kind: "table",
  figure_table_data: table,
  choice_tables: {
    A: table,
    B: {
      ...table,
      rows: [
        ["1", "3"],
        ["3", "9"],
      ],
    },
    C: {
      ...table,
      rows: [
        ["1", "4"],
        ["3", "12"],
      ],
    },
    D: {
      ...table,
      rows: [
        ["1", "5"],
        ["3", "15"],
      ],
    },
  },
};
const ids: string[] = [];
async function main() {
  try {
    const result = await importQuestion(db, base);
    assert.equal(result.inserted, true, JSON.stringify(result));
    assert.ok(result.question_id);
    ids.push(result.question_id);
    const { data: rows, error } = await db
      .from("quiz_questions")
      .select(
        "id,publish_status,is_live,figure_kind,figure_table_data,answer_choices(letter,choice_table_data)"
      )
      .eq("id", result.question_id);
    assert.ifError(error);
    assert.equal(rows?.length, 1);
    const stored = rows![0];
    assert.equal(stored.publish_status, "draft");
    assert.equal(stored.figure_kind, "table");
    assert.deepEqual(stored.figure_table_data, table);
    assert.equal(stored.answer_choices.length, 4);
    for (const c of stored.answer_choices)
      assert.deepEqual(c.choice_table_data, base.choice_tables![c.letter as "A" | "B" | "C" | "D"]);
    const retry = await importQuestion(db, base);
    assert.equal(retry.duplicate_skipped, true, JSON.stringify(retry));
    const changed = await importQuestion(db, {
      ...base,
      choice_tables: {
        ...base.choice_tables,
        A: {
          ...table,
          rows: [
            ["1", "99"],
            ["3", "4"],
          ],
        },
      },
    });
    assert.equal(changed.duplicate_skipped, false);
    assert.equal(changed.inserted, false);
    assert.match(changed.errors.join(" "), /source identity conflict/);
    const numeric = await importQuestion(db, {
      ...base,
      question_text: "Synthetic: what is 2 + 3?",
      correct_answer: "5",
      question_format: "numeric_entry",
      source_question_number: 2,
      figure_kind: null,
      figure_table_data: null,
      choice_tables: null,
      choice_a: undefined,
      choice_b: undefined,
      choice_c: undefined,
      choice_d: undefined,
    });
    assert.equal(numeric.inserted, true, JSON.stringify(numeric));
    assert.ok(numeric.question_id);
    ids.push(numeric.question_id);
    const { data: numericChoices, error: ncErr } = await db
      .from("answer_choices")
      .select("id")
      .eq("question_id", numeric.question_id);
    assert.ifError(ncErr);
    assert.equal(numericChoices!.length, 0);
    const { data: visible, error: visErr } = await db
      .from("quiz_questions")
      .select("id")
      .in("id", ids)
      .eq("is_live", true)
      .in("publish_status", ["publish_ready", "publish_ready_with_verified_repair"]);
    assert.ifError(visErr);
    assert.equal(visible!.length, 0);
    const { data: viewRows, error: viewErr } = await db
      .from("quiz_questions_live")
      .select("id")
      .in("id", ids);
    assert.ifError(viewErr);
    assert.equal(viewRows!.length, 0);
    console.log(
      JSON.stringify({
        synthetic_only: true,
        target: api,
        inserted: ids.length,
        four_choice_tables_roundtrip: true,
        question_table_roundtrip: true,
        exact_retry_skipped: true,
        changed_cell_conflict: true,
        numeric_without_choices: true,
        student_selector_visible: 0,
        publication_view_visible: 0,
      })
    );
  } finally {
    if (ids.length) {
      const { error } = await db.from("quiz_questions").delete().in("id", ids);
      assert.ifError(error);
    }
    // answer_choices and answer_key_entries cascade on question deletion.
    console.log("Synthetic fixture cleanup complete.");
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
