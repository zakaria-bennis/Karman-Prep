#!/usr/bin/env -S npx tsx
// `k qa normalize`: check every planned Bluebook text fix with the app's own code and reseal it.
// For each row (the live row in full, the new text of its changed fields, and the answer key
// evidence with the normalization history added):
//   before  the row must be served as it is now: its catalog evidence reads
//           (readCatalogQuestionScope) and its payload seal is catalogQuestionPayloadHash of the
//           row; a reviewed numeric answer set accepts the row (reviewedNumericAnswers); the
//           stored content_hash_v2 is computeContentHashV2 of the row (import-core).
//   after   the new seal, the new numeric answer set text hashes and the new content_hash_v2 are
//           computed with the same functions, and the changed row must read again with them;
//           the display check (qa-check.ts checkRow and displaySegments, main's MathText split)
//           must find nothing new and draw the same segments with the same text once the
//           intended character swaps are set aside; a reviewed passage display stays the same.
// Usage: npx tsx scripts/import-tools/ts/normalize-check.ts <normalize-input.json>
// Input {"rows": [{"row": <live row with answer_choices and answer_key_entries>,
//        "question": {field: new text}, "choices": {letter: new text}, "raw_after": {...}|null}]}
// Prints {"rows": [{id, ok, error?, seal_before, seal_after, content_hash_v2_after,
//        raw_after, served}]}.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";
import { computeContentHashV2 } from "@/lib/question-bank/import-core";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import { reviewedPassageForQuestion } from "@/lib/question-bank/reviewed-passage";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { checkRow, displaySegments, displayText } from "./qa-check";

type Obj = Record<string, unknown>;
type Item = {
  row: Obj;
  question: Record<string, string>;
  choices: Record<string, string>;
  raw_after: Obj | null;
};

const LETTERS = ["A", "B", "C", "D"] as const;
const PASSAGES = new Set(["passage", "passage_a", "passage_b"]);
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const obj = (v: unknown): Obj | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
/** Where readCatalogQuestionScope reads the tags. */
const scopeRoot = (raw: Obj): Obj =>
  raw?.kind === "independently_confirmed_generated" ? ((raw.evidence ?? {}) as Obj) : raw;
/** Where numericAnswerSetFromEvidence reads the set. */
const setRoot = (raw: Obj): Obj => obj(raw.evidence) ?? raw;
const asQuestion = (q: Obj) => q as unknown as QuizQuestionWithChoices;

/** computeContentHashV2 over a stored row, the fields import-core passes at import. */
export function contentHashV2(q: Obj): string {
  const choices = (q.answer_choices ?? []) as Obj[];
  const by = (l: string) => choices.find((c) => c.letter === l);
  const text = (l: string) => (by(l)?.choice_text as string | undefined) ?? undefined;
  const tables = Object.fromEntries(
    LETTERS.filter((l) => by(l)?.choice_table_data != null).map((l) => [
      l,
      by(l)!.choice_table_data,
    ])
  );
  const s = (v: unknown) => (v == null ? undefined : String(v));
  return computeContentHashV2({
    subject: String(q.subject),
    domain: String(q.domain),
    answer_format: String(q.answer_format),
    passage_intro: s(q.passage_intro),
    passage: s(q.passage),
    passage_a: s(q.passage_a),
    passage_b: s(q.passage_b),
    question_text: String(q.question_text ?? ""),
    choice_a: text("A"),
    choice_b: text("B"),
    choice_c: text("C"),
    choice_d: text("D"),
    choice_tables: Object.keys(tables).length ? (tables as never) : null,
    figure_table_data: (q.figure_table_data ?? null) as never,
    figure_chart_data: (q.figure_chart_data ?? null) as never,
    figure_geometry_data: (q.figure_geometry_data ?? null) as never,
    figure_svg: (q.figure_svg ?? null) as string | null,
  });
}

/** A field's display text with the intended character swaps set aside. */
export function fold(s: string): string {
  return s
    .replace(
      /While researching a topic, a student (?:has taken|took) the following notes[.:]/g,
      "N:"
    )
    .replace(/_{2,}[ \t]?blank\b/gi, "_____")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\frac\{(\w+)\}\{(\w+)\}/g, "$1/$2")
    .replace(/\((\w+) ?\/ ?(\w+)\)/g, "$1/$2")
    .replace(/(\w) \/ (\w)/g, "$1/$2")
    .replace(/\{,\}/g, ",")
    .replace(/(?<=\d),(?=\d{3})/g, "")
    .replace(/(?<=\d)\s*percent\b/g, "%")
    .replace(/^[ \t]*[•\-−][ \t]*/gm, "")
    .replace(/[—–−‐]|-+/g, "-")
    .replace(/\s+/g, "");
}

function fields(q: Obj): Array<[string, string, boolean, boolean]> {
  const math = q.subject === "math";
  const out: Array<[string, string, boolean, boolean]> = [];
  for (const name of ["passage_intro", "passage", "passage_a", "passage_b"])
    if (q[name]) out.push([name, String(q[name]), false, PASSAGES.has(name)]);
  if (q.question_text) out.push(["question_text", String(q.question_text), math, false]);
  for (const c of (q.answer_choices ?? []) as Obj[])
    if (c.choice_text) out.push([`choice ${String(c.letter)}`, String(c.choice_text), math, false]);
  return out;
}

function sameDisplay(before: Obj, after: Obj): string | null {
  const a = new Map(fields(before).map((f) => [f[0], f]));
  const b = fields(after);
  if (b.length !== a.size) return "a field appeared or went empty";
  for (const [name, text, serialized, blankWord] of b) {
    const old = a.get(name);
    if (!old) return `${name}: not in the live row`;
    const x = displaySegments(old[1], serialized, blankWord);
    const y = displaySegments(text, serialized, blankWord);
    const kinds = (s: typeof x) => s.segments.map((g) => g.kind).join(",");
    if (kinds(x) !== kinds(y)) return `${name}: the screen splits it differently (${kinds(y)})`;
    if (y.problems.length > x.problems.length) return `${name}: ${y.problems[0]}`;
    if (fold(displayText(x.segments)) !== fold(displayText(y.segments)))
      return `${name}: the displayed text changes beyond the intended characters`;
  }
  return null;
}

function newFindings(before: ReturnType<typeof checkRow>, after: ReturnType<typeof checkRow>) {
  return Object.entries(after.checks)
    .filter(([check, details]) => details.length > (before.checks[check]?.length ?? 0))
    .map(([check, details]) => `${check}: ${details.at(-1)}`);
}

export function checkOne(item: Item) {
  const row = item.row;
  const keys = (row.answer_key_entries ?? []) as Obj[];
  if (keys.length > 1) throw new Error("more than one answer key entry");
  const raw = (keys[0]?.raw_model_response ?? null) as Obj | null;
  const tagged = raw != null && scopeRoot(raw)?.approved_tags != null;
  const sealBefore = catalogQuestionPayloadHash(asQuestion(row));
  let skill: string | null = null;
  let stable: string | null = null;
  if (tagged) {
    const scope = readCatalogQuestionScope(raw);
    if (scope.tags.question_payload_sha256 == null)
      throw new Error("the evidence carries no payload seal to recompute");
    if (scope.tags.question_payload_sha256 !== sealBefore)
      throw new Error("the live row's payload seal does not match it now (not served as it is)");
    skill = scope.skill.id;
    stable = scope.tags.stable_question_id;
  }
  const set = raw ? numericAnswerSetFromEvidence(raw) : undefined;
  const answersBefore =
    set === undefined ? undefined : reviewedNumericAnswers(asQuestion(row), set);
  if (contentHashV2(row) !== row.content_hash_v2)
    throw new Error("the stored content_hash_v2 is not computeContentHashV2 of the row");
  const passageBefore = reviewedPassageForQuestion(asQuestion(row));

  const after: Obj = {
    ...row,
    ...item.question,
    answer_choices: ((row.answer_choices ?? []) as Obj[]).map((c) =>
      item.choices[String(c.letter)] !== undefined
        ? { ...c, choice_text: item.choices[String(c.letter)] }
        : c
    ),
  };
  const sealAfter = catalogQuestionPayloadHash(asQuestion(after));
  let rawAfter: Obj | null = null;
  if (raw) {
    if (!item.raw_after) throw new Error("no new answer key evidence for a row that has one");
    rawAfter = JSON.parse(JSON.stringify(item.raw_after)) as Obj;
    if (tagged) (scopeRoot(rawAfter).approved_tags as Obj).question_payload_sha256 = sealAfter;
    if (set !== undefined) {
      const s = setRoot(rawAfter).numeric_answer_set as Obj;
      s.question_text_sha256 = sha(String(after.question_text));
      s.raw_question_text_sha256 = sha(String(after.raw_question_text ?? after.question_text));
    }
    after.answer_key_entries = [{ ...keys[0], raw_model_response: rawAfter }];
    if (tagged) {
      const scope = readCatalogQuestionScope(rawAfter);
      if (scope.skill.id !== skill || scope.tags.stable_question_id !== stable)
        throw new Error("the changed evidence reads as another skill or question");
      if (scope.tags.question_payload_sha256 !== catalogQuestionPayloadHash(asQuestion(after)))
        throw new Error("the new seal does not match the changed row");
    }
    if (set !== undefined) {
      const answers = reviewedNumericAnswers(
        asQuestion(after),
        numericAnswerSetFromEvidence(rawAfter)
      );
      if (!isDeepStrictEqual(answers, answersBefore))
        throw new Error("the reviewed numeric answers changed");
    }
  }
  if (
    passageBefore &&
    !isDeepStrictEqual(reviewedPassageForQuestion(asQuestion(after)), passageBefore)
  )
    throw new Error("app code binds this question's exact text (reviewed-passage.ts)");
  const display = sameDisplay(row, after);
  if (display) throw new Error(`display check: ${display}`);
  const checksBefore = checkRow(row);
  const checksAfter = checkRow(after);
  if (checksAfter.delivery !== checksBefore.delivery)
    throw new Error(
      `the catalog lane would read it as ${checksAfter.delivery}, not ${checksBefore.delivery}`
    );
  const found = newFindings(checksBefore, checksAfter);
  if (found.length) throw new Error(`display check: new finding ${found[0]}`);
  return {
    seal_before: sealBefore,
    seal_after: sealAfter,
    content_hash_v2_after: contentHashV2(after),
    raw_after: rawAfter,
    served: checksBefore.delivery,
  };
}

function main() {
  const [input] = process.argv.slice(2);
  if (!input) throw new Error("usage: normalize-check.ts <normalize-input.json>");
  const doc = JSON.parse(readFileSync(input, "utf8")) as { rows: Item[] };
  const rows = doc.rows.map((item) => {
    try {
      return { id: item.row.id, ok: true, ...checkOne(item) };
    } catch (error) {
      return { id: item.row.id, ok: false, error: (error as Error).message };
    }
  });
  process.stdout.write(JSON.stringify({ rows }) + "\n");
}

if (process.argv[1] && /normalize-check\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`normalize-check: ${(error as Error).message}\n`);
    process.exit(2);
  }
}
