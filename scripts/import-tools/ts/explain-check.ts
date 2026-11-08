#!/usr/bin/env -S npx tsx
// `k qa explain` / `k qa explain-check`: check every new explanation with the app's own code and
// reseal its live row.
// For each row (the live row in full, the new explanation_text, the explanation_per_choice it
// will carry, the answer the explanation states, the answer key evidence with the change
// recorded):
//   text    every text is drawn the way the review screens draw it (MathText: displayLineHyphens,
//           then splitMathText without serialized lines): the math the screen finds must be
//           exactly the writer's \( \) spans, inline, in order, and each span must parse with
//           KaTeX (throwOnError). explanationProblems() is exported for writers.
//   answer  multiple choice: every stated letter is the stored key. Numeric entry: every stated
//           value is graded correct by evaluateQuizAnswer with the row's reviewed numeric answers
//           (reviewedNumericAnswers), what a student typing it would get.
//   before  a row with catalog evidence must be served as it is now: the evidence reads
//           (readCatalogQuestionScope) and its payload seal is catalogQuestionPayloadHash of the row.
//   after   catalogQuestionPayloadHash of the row with the new explanation is the new seal (it
//           covers explanation_text and explanation_per_choice); the changed evidence reads as the
//           same skill and question with that seal; content_hash_v2 and the numeric answers do not
//           change; the catalog lane reads the row the same way (qa-check.ts checkRow) and finds
//           nothing new.
// Usage: npx tsx scripts/import-tools/ts/explain-check.ts <input.json>
// Input {"rows": [{"row": <live row>, "explanation_text": str, "explanation_per_choice": obj|null,
//        "set_per_choice": bool, "stated": {"kind": "letter"|"value", "values": [str]},
//        "raw_after": {...}|null}]}
// Prints {"rows": [{id, ok, error?, seal_before, seal_after, raw_after, served}]}.

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import katex from "katex";
import { splitMathText } from "@/components/learn/math-segments";
import { displayLineHyphens } from "@/components/learn/hyphen-spacing-display";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { contentHashV2 } from "./normalize-check";
import { checkRow } from "./qa-check";

type Obj = Record<string, unknown>;
type Item = {
  row: Obj;
  explanation_text: string;
  explanation_per_choice: Record<string, string> | null;
  set_per_choice: boolean;
  stated: { kind: "letter" | "value"; values: string[] } | null;
  raw_after: Obj | null;
};

const scopeRoot = (raw: Obj): Obj =>
  raw?.kind === "independently_confirmed_generated" ? ((raw.evidence ?? {}) as Obj) : raw;
const asQuestion = (q: Obj) => q as unknown as QuizQuestionWithChoices;

/** Why the review screen would not draw this text as written ([] = it would). */
export function explanationProblems(text: string): string[] {
  const out: string[] = [];
  const spans = [...text.matchAll(/\\\(([\s\S]*?)\\\)/g)].map((m) => m[1].trim());
  const segments = splitMathText(displayLineHyphens(text), false, true, true);
  const math = segments.flatMap((s) => (s.kind === "text" ? [] : [s]));
  if (math.some((s) => s.kind !== "inline"))
    out.push("the screen would draw display math ($$...$$)");
  const found = math.map((s) => s.latex);
  if (!isDeepStrictEqual(found, spans))
    out.push("the screen finds other math than the \\( \\) spans (a $ or a stray delimiter)");
  for (const latex of spans) {
    try {
      katex.renderToString(latex, { throwOnError: true, displayMode: false });
    } catch (error) {
      const message = (error as Error).message.replace(/^KaTeX parse error: /, "");
      out.push(`KaTeX cannot parse \\(${latex.slice(0, 40)}\\): ${message.slice(0, 120)}`);
    }
  }
  return out;
}

function answerProblem(item: Item, row: Obj, accepted: string[] | undefined): string | null {
  const stated = item.stated;
  if (!stated || stated.values.length === 0) return "the explanation states no final answer";
  if (row.answer_format === "numeric_entry") {
    const q = asQuestion({ ...row, reviewed_numeric_answers: accepted });
    const wrong = stated.values.filter((v) => !evaluateQuizAnswer(v, q));
    return wrong.length
      ? `the stated answer ${wrong[0]} is not accepted for the key ${String(row.correct_answer)}`
      : null;
  }
  const key = String(row.correct_answer ?? "")
    .trim()
    .toUpperCase();
  const wrong = stated.values.filter((v) => v.toUpperCase() !== key);
  return wrong.length ? `the explanation names ${wrong[0]} but the key is ${key}` : null;
}

export function checkOne(item: Item) {
  const row = item.row;
  const texts: Array<[string, string]> = [["explanation_text", item.explanation_text]];
  if (item.set_per_choice)
    for (const [letter, text] of Object.entries(item.explanation_per_choice ?? {}))
      texts.push([`explanation_per_choice ${letter}`, text]);
  for (const [name, text] of texts) {
    const problems = explanationProblems(text);
    if (problems.length) throw new Error(`${name}: ${problems[0]}`);
  }
  const keys = (row.answer_key_entries ?? []) as Obj[];
  if (keys.length > 1) throw new Error("more than one answer key entry");
  const raw = (keys[0]?.raw_model_response ?? null) as Obj | null;
  const set = raw ? numericAnswerSetFromEvidence(raw) : undefined;
  const answersBefore =
    set === undefined ? undefined : reviewedNumericAnswers(asQuestion(row), set);
  const wrong = answerProblem(item, row, answersBefore);
  if (wrong) throw new Error(wrong);

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
  const after: Obj = {
    ...row,
    explanation_text: item.explanation_text,
    ...(item.set_per_choice ? { explanation_per_choice: item.explanation_per_choice } : {}),
  };
  const sealAfter = catalogQuestionPayloadHash(asQuestion(after));
  let rawAfter: Obj | null = null;
  if (raw) {
    if (!item.raw_after) throw new Error("no new answer key evidence for a row that has one");
    rawAfter = JSON.parse(JSON.stringify(item.raw_after)) as Obj;
    if (tagged) (scopeRoot(rawAfter).approved_tags as Obj).question_payload_sha256 = sealAfter;
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
  if (contentHashV2(after) !== contentHashV2(row))
    throw new Error("content_hash_v2 would change (it must not depend on the explanation)");
  const checksBefore = checkRow(row);
  const checksAfter = checkRow(after);
  if (checksAfter.delivery !== checksBefore.delivery)
    throw new Error(
      `the catalog lane would read it as ${checksAfter.delivery}, not ${checksBefore.delivery}`
    );
  const found = Object.entries(checksAfter.checks)
    .filter(([check, details]) => details.length > (checksBefore.checks[check]?.length ?? 0))
    .map(([check, details]) => `${check}: ${details.at(-1)}`);
  if (found.length) throw new Error(`display check: new finding ${found[0]}`);
  return {
    seal_before: sealBefore,
    seal_after: sealAfter,
    raw_after: rawAfter,
    served: checksBefore.delivery,
  };
}

function main() {
  const [input] = process.argv.slice(2);
  if (!input) throw new Error("usage: explain-check.ts <input.json>");
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

if (process.argv[1] && /explain-check\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`explain-check: ${(error as Error).message}\n`);
    process.exit(2);
  }
}
