#!/usr/bin/env -S npx tsx
// Compute the production catalog seal for every row of a saved, read-only
// private readback ({"rows": [{"snapshot": {question, choices, keys}}]}, the
// output of a batch's stage/readback.sql). Used by `kimport-cli.py seal`.
//
// The seal is catalogQuestionPayloadHash() of the stored row, the same function
// the app checks at delivery, so it is taken from the database row, never from
// the reviewed file. The answer key evidence must still parse as approved,
// unpublished catalog evidence for the same stable question id.
//
// Usage: npx tsx scripts/import-tools/ts/seal-readback.ts <private-readback.json> [--per-row]
// Prints {"rows": [{question_id, stable_question_id, source_version,
// content_hash_v2, question_payload_sha256, publication_allowed_in_snapshot}]}.
// With --per-row a row that cannot be sealed does not stop the run: it is
// listed under "failed": [{question_id, stable_question_id, error}] and left
// out of "rows" (`k seal --hold-failing`).

import { readFileSync } from "node:fs";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";
import { figureImportErrors, type ImportFigureFields } from "@/lib/question-bank/import-figure";
import type { QuizQuestionWithChoices } from "@/types/quiz";

type Obj = Record<string, unknown>;

/** The importer stores a generated key's whole reviewed answer; its evidence sits under "evidence". */
function evidenceRoot(raw: Obj): Obj {
  return raw?.kind === "independently_confirmed_generated" ? ((raw.evidence ?? {}) as Obj) : raw;
}

export function sealSnapshot(snapshot: { question: Obj; choices: Obj[] | null; keys: Obj[] }) {
  const keys = snapshot.keys ?? [];
  if (!snapshot.question || keys.length !== 1)
    throw new Error("expected a question and one answer key");
  const choices = snapshot.choices ?? [];
  const multipleChoice = snapshot.question.answer_format === "multiple_choice";
  if (multipleChoice ? choices.length !== 4 : choices.length !== 0)
    throw new Error(`${String(snapshot.question.id)}: choice count does not fit the answer format`);
  // The stored figure must still be one the importer accepts (kind, data, sanitized SVG);
  // its columns are sealed below exactly as the student payload carries them.
  const figure = figureImportErrors(snapshot.question as unknown as ImportFigureFields);
  if (figure.length)
    throw new Error(`${String(snapshot.question.id)}: stored figure: ${figure.join("; ")}`);
  const raw = keys[0].raw_model_response as Obj;
  const scope = readCatalogQuestionScope(raw);
  if (scope.tags.stable_question_id !== evidenceRoot(raw).question_id)
    throw new Error(`${String(snapshot.question.id)}: answer key evidence names another question`);
  const question = {
    ...snapshot.question,
    answer_choices: choices,
  } as unknown as QuizQuestionWithChoices;
  return {
    question_id: snapshot.question.id,
    stable_question_id: scope.tags.stable_question_id,
    source_version: snapshot.question.source_version,
    content_hash_v2: snapshot.question.content_hash_v2,
    question_payload_sha256: catalogQuestionPayloadHash(question),
    publication_allowed_in_snapshot: scope.publicationAllowed,
  };
}

function stableIdOf(snapshot: { keys?: Obj[] }): unknown {
  const root = evidenceRoot((snapshot.keys?.[0]?.raw_model_response ?? {}) as Obj);
  const tags = (root.approved_tags ?? {}) as Obj;
  return tags.stable_question_id ?? root.question_id ?? null;
}

function main() {
  const args = process.argv.slice(2);
  const perRow = args.includes("--per-row");
  const [inputPath] = args.filter((a) => a !== "--per-row");
  if (!inputPath) throw new Error("usage: seal-readback.ts <private-readback.json> [--per-row]");
  const doc = JSON.parse(readFileSync(inputPath, "utf8")) as {
    rows?: Array<{ snapshot: { question: Obj; choices: Obj[] | null; keys: Obj[] } }>;
  };
  if (!Array.isArray(doc.rows) || doc.rows.length === 0) throw new Error("readback has no rows");
  if (!perRow) {
    const rows = doc.rows.map((item) => sealSnapshot(item.snapshot));
    process.stdout.write(JSON.stringify({ rows }) + "\n");
    return;
  }
  const rows: ReturnType<typeof sealSnapshot>[] = [];
  const failed: Array<{ question_id: unknown; stable_question_id: unknown; error: string }> = [];
  for (const item of doc.rows) {
    try {
      rows.push(sealSnapshot(item.snapshot));
    } catch (error) {
      failed.push({
        question_id: item.snapshot?.question?.id ?? null,
        stable_question_id: stableIdOf(item.snapshot ?? {}),
        error: (error as Error).message,
      });
    }
  }
  process.stdout.write(JSON.stringify({ rows, failed }) + "\n");
}

if (process.argv[1] && /seal-readback\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`seal-readback: ${(error as Error).message}\n`);
    process.exit(2);
  }
}
