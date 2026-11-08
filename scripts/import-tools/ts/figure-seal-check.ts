#!/usr/bin/env -S npx tsx
// `k figures publish-specs`: reseal every live row whose figure_spec (and choice_figure_spec)
// changes, with the app's own functions, and check the row is still served.
// For each row (the live row in full, the new specs, the answer key evidence with the change
// recorded):
//   before  a row with catalog evidence must be served as it is now: the evidence reads
//           (readCatalogQuestionScope) and its payload seal is catalogQuestionPayloadHash of
//           the row; a reviewed numeric answer set accepts it (reviewedNumericAnswers).
//   after   figure_spec (one FigureSpec or an ordered list) and each changed choice's
//           choice_figure_spec are set; catalogQuestionPayloadHash of that row is the new seal
//           (figure_spec is in the payload; choice_figure_spec is in the choice mapping only
//           when set); the changed evidence reads as the same skill and question with that
//           seal; the numeric answers are the same; content_hash_v2 (computeContentHashV2,
//           which has no figure_spec input) does not change; the catalog lane reads the row the
//           same way (qa-check.ts checkRow) and finds nothing new.
// Usage: npx tsx scripts/import-tools/ts/figure-seal-check.ts <input.json>
// Input {"rows": [{"row": <live row>, "figure_spec": <spec|list|null>, "set_figure": bool,
//        "choice_specs": {letter: spec}, "raw_after": {...}|null}]}
// Prints {"rows": [{id, ok, error?, seal_before, seal_after, raw_after, served}]}.

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { contentHashV2 } from "./normalize-check";
import { checkRow } from "./qa-check";

type Obj = Record<string, unknown>;
type Item = {
  row: Obj;
  figure_spec: unknown;
  set_figure: boolean;
  choice_specs: Record<string, unknown>;
  raw_after: Obj | null;
};

const scopeRoot = (raw: Obj): Obj =>
  raw?.kind === "independently_confirmed_generated" ? ((raw.evidence ?? {}) as Obj) : raw;
const asQuestion = (q: Obj) => q as unknown as QuizQuestionWithChoices;

export function withSpecs(
  row: Obj,
  item: Pick<Item, "figure_spec" | "set_figure" | "choice_specs">
): Obj {
  return {
    ...row,
    ...(item.set_figure ? { figure_spec: item.figure_spec } : {}),
    answer_choices: ((row.answer_choices ?? []) as Obj[]).map((c) =>
      item.choice_specs[String(c.letter)] !== undefined
        ? { ...c, choice_figure_spec: item.choice_specs[String(c.letter)] }
        : c
    ),
  };
}

export function checkOne(item: Item) {
  const row = item.row;
  const keys = (row.answer_key_entries ?? []) as Obj[];
  if (keys.length > 1) throw new Error("more than one answer key entry");
  const letters = new Set(((row.answer_choices ?? []) as Obj[]).map((c) => String(c.letter)));
  for (const l of Object.keys(item.choice_specs))
    if (!letters.has(l)) throw new Error(`no choice ${l}`);
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

  const after = withSpecs(row, item);
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
    throw new Error("content_hash_v2 would change (it must not depend on figure_spec)");
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
  if (!input) throw new Error("usage: figure-seal-check.ts <input.json>");
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

if (process.argv[1] && /figure-seal-check\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`figure-seal-check: ${(error as Error).message}\n`);
    process.exit(2);
  }
}
