import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { ImportQuestionInput } from "./import-core";
import { canonicalEvidence, importAnswerEvidence } from "./import-provenance";

type Client = SupabaseClient<Database>;

/** Complete an interrupted import without changing reviewed answer decisions. */
export async function reconcileImport(
  supabase: Client,
  questionId: string,
  row: ImportQuestionInput,
  expectedHashV2: string
): Promise<string[]> {
  const errors: string[] = [];
  const { data: question, error: questionError } = await supabase
    .from("quiz_questions")
    .select(
      "id, content_hash_v2, raw_question_text, correct_answer, answer_format, selected_official_answer, answer_key_status, image_url, publish_status"
    )
    .eq("id", questionId)
    .single();
  if (questionError || !question)
    return [`question lookup: ${questionError?.message ?? "missing"}`];
  if (
    question.content_hash_v2 !== expectedHashV2 ||
    question.raw_question_text !== (row.raw_question_text ?? row.question_text) ||
    question.correct_answer !== row.correct_answer ||
    question.answer_format !== (row.question_format ?? "multiple_choice")
  ) {
    return ["existing question conflicts with import input"];
  }
  const missingChoices: Database["public"]["Tables"]["answer_choices"]["Insert"][] = [];

  if ((row.question_format ?? "multiple_choice") === "multiple_choice") {
    const expected = (["A", "B", "C", "D"] as const).map((letter) => ({
      question_id: questionId,
      letter,
      choice_text: String(
        { A: row.choice_a, B: row.choice_b, C: row.choice_c, D: row.choice_d }[letter] ?? ""
      ),
      raw_choice_text: String(
        row.raw_choice_texts?.[letter] ??
          { A: row.choice_a, B: row.choice_b, C: row.choice_c, D: row.choice_d }[letter] ??
          ""
      ),
      is_correct: letter === row.correct_answer.trim().toUpperCase(),
    }));
    const { data: choices, error: choiceReadError } = await supabase
      .from("answer_choices")
      .select("letter, choice_text, raw_choice_text, is_correct")
      .eq("question_id", questionId);
    if (choiceReadError) errors.push(`answer_choices lookup: ${choiceReadError.message}`);
    else {
      for (const choice of expected) {
        const matches = choices?.filter((item) => item.letter === choice.letter) ?? [];
        if (matches.length > 1) {
          errors.push(`duplicate answer choice ${choice.letter} requires review`);
          continue;
        }
        const found = matches[0];
        if (found) {
          if (
            found.choice_text !== choice.choice_text ||
            found.raw_choice_text !== choice.raw_choice_text ||
            found.is_correct !== choice.is_correct
          ) {
            errors.push(`answer choice ${choice.letter} conflicts with import input`);
          }
        } else {
          missingChoices.push(choice);
        }
      }
      if ((choices?.length ?? 0) > 4) errors.push("unexpected extra answer choices");
    }
  }

  const { data: keyEntries, error: keyReadError } = await supabase
    .from("answer_key_entries")
    .select("id, printed_answer, selected_official_answer, status, raw_model_response")
    .eq("question_id", questionId);
  const generated = row.reviewed_answer?.kind === "independently_confirmed_generated";
  const expectedPrinted = generated
    ? null
    : (row.reviewed_answer?.printed_answer ?? row.correct_answer.trim());
  const expectedStatus = generated ? "missing_answer_key" : "printed_key_used_no_correction";
  const expectedEvidence = importAnswerEvidence(row);
  const needKey = !keyReadError && !keyEntries?.length;
  if (keyReadError) errors.push(`answer_key_entries lookup: ${keyReadError.message}`);
  else if ((keyEntries?.length ?? 0) > 1) errors.push("multiple answer key entries require review");
  else if (keyEntries?.length) {
    const key = keyEntries[0];
    if (
      key.printed_answer !== expectedPrinted ||
      canonicalEvidence(key.raw_model_response) !== canonicalEvidence(expectedEvidence) ||
      (key.status !== expectedStatus && key.status !== "corrected_key_verified") ||
      (key.status !== "corrected_key_verified" && key.selected_official_answer !== expectedPrinted)
    )
      errors.push("answer key evidence conflicts with import input");
  }
  const needMirror = !question.answer_key_status && !question.selected_official_answer;
  if (
    !needMirror &&
    ((question.answer_key_status !== expectedStatus &&
      question.answer_key_status !== "corrected_key_verified") ||
      (question.answer_key_status !== "corrected_key_verified" &&
        question.selected_official_answer !== expectedPrinted))
  )
    errors.push("answer key mirror conflicts with import input");
  if (needKey && question.answer_key_status === "corrected_key_verified")
    errors.push("missing corrected key evidence requires review");

  let needAsset = false;
  if (row.image_url) {
    if (question.image_url !== row.image_url) {
      errors.push("image URL conflicts with import input");
    } else {
      const { data: assets, error: assetReadError } = await supabase
        .from("source_assets")
        .select(
          "public_url, asset_path, crop_complete, relevance, use_in_solving, validation_status"
        )
        .eq("question_id", questionId)
        .eq("asset_type", "figure_crop");
      if (assetReadError) errors.push(`source_assets lookup: ${assetReadError.message}`);
      else {
        const match = assets?.find((asset) => asset.public_url === row.image_url);
        if (match) {
          if (
            match.asset_path !== (row.image_storage_path || row.image_url) ||
            match.crop_complete !== true ||
            match.relevance !== "required" ||
            match.use_in_solving !== true ||
            match.validation_status !== "imported_from_v1"
          ) {
            errors.push("figure source evidence conflicts with import input");
          }
        } else if (assets?.length)
          errors.push("figure source evidence conflicts with import input");
        else needAsset = true;
      }
    }
  }
  if (errors.length) return errors;
  if (
    question.publish_status === "publish_ready" ||
    question.publish_status === "publish_ready_with_verified_repair"
  ) {
    return missingChoices.length || needKey || needMirror || needAsset
      ? ["published question has incomplete import evidence; review required"]
      : [];
  }

  for (const choice of missingChoices) {
    const { error } = await supabase.from("answer_choices").insert(choice);
    if (error) errors.push(`answer choice ${choice.letter}: ${error.message}`);
  }
  if (needKey) {
    const { error } = await supabase.from("answer_key_entries").insert({
      question_id: questionId,
      printed_answer: expectedPrinted,
      printed_answer_crossed_out: false,
      manual_correction_present: false,
      selected_official_answer: expectedPrinted,
      selection_reason: generated
        ? "independently_confirmed_generated_official_mapping_unavailable"
        : row.reviewed_answer
          ? "preserved_printed_key_with_separate_independent_solution"
          : "phase1_seed_from_printed_correct_answer",
      status: expectedStatus,
      section: row.source_section ?? null,
      module: row.source_module ?? null,
      source_question_number: row.source_question_number ?? null,
      source_version: row.source_version ?? null,
      source_occurrence: row.source_occurrence ?? null,
      raw_model_response: expectedEvidence,
      review_required: Boolean(
        row.reviewed_answer && expectedPrinted !== row.correct_answer.trim()
      ),
      review_reason: generated
        ? "Independent reviews agree; official answer mapping remains unavailable"
        : expectedPrinted !== row.correct_answer.trim()
          ? "Independent solution differs from preserved printed key"
          : null,
    });
    if (error) errors.push(`answer_key_entries insert: ${error.message}`);
  }
  if (needMirror) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({ selected_official_answer: expectedPrinted, answer_key_status: expectedStatus })
      .eq("id", questionId)
      .is("answer_key_status", null);
    if (error) errors.push(`answer key mirror: ${error.message}`);
  }
  if (needAsset && row.image_url) {
    const { error } = await supabase.from("source_assets").insert({
      question_id: questionId,
      source_pdf: row.source_pdf || null,
      page_number: row.source_page == null ? null : Number(row.source_page),
      asset_type: "figure_crop",
      asset_path: row.image_storage_path || row.image_url,
      public_url: row.image_url,
      crop_complete: true,
      relevance: "required",
      use_in_solving: true,
      validation_status: "imported_from_v1",
    });
    if (error) errors.push(`source_assets insert: ${error.message}`);
  }
  return errors;
}
