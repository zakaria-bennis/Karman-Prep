// Bounded local draft import. No production target or publication is allowed.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { preflightImportRows } from "./import-json-direct-row";
import {
  importQuestion,
  computeContentHashV2,
  subjectFromDomain,
} from "@/lib/question-bank/import-core";
const api = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(api, "http://127.0.0.1:54321");
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY);
const [jsonPath, pdfPath, outputPath] = process.argv.slice(2);
assert.ok(jsonPath && pdfPath && outputPath);
const input = JSON.parse(readFileSync(jsonPath, "utf8"));
assert.equal(input.local_only, true);
assert.equal(input.publication_allowed, false);
assert.equal(input.questions.length, 8);
const version = createHash("sha256").update(readFileSync(pdfPath)).digest("hex");
const { inputs, errors } = preflightImportRows(input.questions, "202506asiav2.pdf", version, true);
assert.deepEqual(errors, []);
const db = createClient(api, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
async function main() {
  const ids: string[] = [];
  let inserted = 0;
  let initiallySkipped = 0;
  // Check exact local content-hash matches under other source identities before writes.
  for (const row of inputs) {
    const hash = computeContentHashV2({
      ...row,
      subject: subjectFromDomain(row.domain),
      answer_format: row.question_format ?? "multiple_choice",
    });
    const { data: matches, error } = await db
      .from("quiz_questions")
      .select(
        "id,source_version,source_question_number,source_section,source_module,source_occurrence"
      )
      .eq("content_hash_v2", hash);
    assert.ifError(error);
    for (const match of matches ?? [])
      assert.ok(
        match.source_version === row.source_version &&
          match.source_question_number === row.source_question_number &&
          match.source_section === row.source_section &&
          match.source_module === row.source_module &&
          match.source_occurrence === row.source_occurrence,
        "Local duplicate from a different source identity requires review"
      );
  }
  for (const row of inputs) {
    assert.equal(row.import_status, "needs_review");
    assert.ok(row.reviewed_answer);
    const result = await importQuestion(db, row);
    assert.deepEqual(result.errors, []);
    if (result.inserted) inserted++;
    else {
      assert.equal(result.duplicate_skipped, true);
      initiallySkipped++;
    }
    const { data: stored, error } = await db
      .from("quiz_questions")
      .select("*,answer_choices(*),answer_key_entries(*)")
      .eq("source_version", row.source_version!)
      .eq("source_section", row.source_section!)
      .eq("source_module", row.source_module!)
      .eq("source_question_number", row.source_question_number!)
      .eq("source_occurrence", row.source_occurrence!)
      .single();
    assert.ifError(error);
    assert.ok(stored);
    ids.push(stored.id);
    assert.equal(stored.publish_status, "needs_human_review");
    assert.equal(stored.question_text, row.question_text);
    assert.equal(stored.raw_question_text, row.raw_question_text);
    assert.equal(stored.correct_answer, row.correct_answer);
    assert.equal(stored.verified_answer, row.reviewed_answer.independently_verified_answer);
    assert.equal(stored.source_document_id, row.source_document_id);
    assert.equal(stored.source_provider_version_id, row.source_provider_version_id);
    assert.deepEqual(stored.source_regions, row.source_regions);
    assert.deepEqual(stored.figure_table_data, row.figure_table_data ?? null);
    const key = stored.answer_key_entries;
    assert.equal(key.length, 1);
    assert.equal(key[0].printed_answer, row.reviewed_answer.printed_answer);
    assert.equal(key[0].selected_official_answer, row.reviewed_answer.printed_answer);
    assert.deepEqual(key[0].raw_model_response, row.reviewed_answer.evidence);
    assert.equal(key[0].source_version, version);
    assert.equal(key[0].source_question_number, row.source_question_number);
    if (row.question_format === "numeric_entry") assert.equal(stored.answer_choices.length, 0);
    else {
      assert.equal(stored.answer_choices.length, 4);
      for (const c of stored.answer_choices) {
        const letter = c.letter as "A" | "B" | "C" | "D";
        assert.deepEqual(c.choice_table_data, row.choice_tables?.[letter] ?? null);
        assert.equal(
          c.raw_choice_text,
          row.raw_choice_texts?.[letter] ?? row[`choice_${letter.toLowerCase()}` as "choice_a"]
        );
      }
    }
    const retry = await importQuestion(db, row);
    assert.equal(retry.duplicate_skipped, true);
    assert.deepEqual(retry.errors, []);
  }
  const { data: visible, error } = await db
    .from("quiz_questions")
    .select("id")
    .in("id", ids)
    .eq("is_live", true)
    .in("publish_status", ["publish_ready", "publish_ready_with_verified_repair"]);
  assert.ifError(error);
  assert.equal(visible!.length, 0);
  const { data: view, error: viewError } = await db
    .from("quiz_questions_live")
    .select("id")
    .in("id", ids);
  assert.ifError(viewError);
  assert.equal(view!.length, 0);
  const changed = await importQuestion(db, {
    ...inputs[0],
    raw_question_text: inputs[0].raw_question_text + " altered source",
  });
  assert.equal(changed.inserted, false);
  assert.equal(changed.duplicate_skipped, false);
  assert.match(changed.errors.join(" "), /source identity conflict/);
  const report = {
    local_only: true,
    api,
    source_version: version,
    rows: 8,
    inserted,
    initially_skipped: initiallySkipped,
    exact_retry_skipped: 8,
    raw_and_corrected_text_preserved: true,
    printed_and_verified_answers_separate: true,
    frozen_evidence_roundtrip: true,
    native_table_roundtrip: true,
    numeric_entry_without_choices: true,
    changed_original_rejected: true,
    student_selector_visible: 0,
    publication_view_visible: 0,
    ids,
    retained_in_disposable_volume: true,
    limitations: [
      "Exact local content-hash comparison only; production and semantic deduplication pending",
      "Publication/source-asset gates and production schema/security pending",
      "See per-item current_presentation_decision for local visual status; physical phone/Safari not certified",
    ],
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
