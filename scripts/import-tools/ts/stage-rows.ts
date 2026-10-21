#!/usr/bin/env -S npx tsx
// Emit, as JSON, the exact database rows the reviewed importer would write for
// one reviewed batch, without touching a database. Used by `kimport-cli.py stage`.
//
// It runs the same gates as scripts/pdf-pipeline/import-json-direct.ts (reviewed
// marker, preflight, reviewed difficulty, frozen manifest with its separately
// supplied SHA-256 and the source PDF bytes) and then calls the real
// importQuestion() with a client that only records what would be sent. So the
// payload, content_hash_v2 and answer key evidence are the app's own.
//
// Usage: npx tsx scripts/import-tools/ts/stage-rows.ts <reviewed.json> <source.pdf>
//          <frozen-manifest.json> <frozen-manifest-sha256>
// Prints {"reviewed_json_sha256", "source_pdf_sha256", "rows": [...]} on stdout.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { REVIEWED_DIFFICULTY_IMPORT_POLICY } from "@/lib/question-bank/reviewed-difficulty";
import {
  importQuestion,
  preflightImportRows,
  rowToReviewedImportInput,
} from "../../pdf-pipeline/import-json-direct-row";
import { sha256Hex, verifyFrozenReviewedInput } from "../../pdf-pipeline/frozen-reviewed-input";

/** Stand-in id the recorder hands back for the inserted question. */
export const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

export interface RecordedWrite {
  table: string;
  op: "insert" | "update";
  values: unknown;
  match?: Record<string, unknown>;
}

/** What supabase-js would put on the wire: JSON, so undefined keys drop out. */
const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

/** A Supabase client stand-in that records inserts and updates and never reads. */
export function recordingClient(writes: RecordedWrite[]): SupabaseClient<Database> {
  const ok = { data: null, error: null };
  return {
    from(table: string) {
      return {
        insert(values: unknown) {
          writes.push({ table, op: "insert", values: wire(values) });
          return {
            select: () => ({ single: async () => ({ data: { id: PLACEHOLDER_ID }, error: null }) }),
            then: (resolveFn: (v: typeof ok) => unknown, reject?: (e: unknown) => unknown) =>
              Promise.resolve(ok).then(resolveFn, reject),
          };
        },
        update(values: unknown) {
          return {
            eq: async (column: string, value: unknown) => {
              writes.push({
                table,
                op: "update",
                values: wire(values),
                match: { [column]: value },
              });
              return ok;
            },
          };
        },
        select() {
          throw new Error(`stage rows: the importer tried to read ${table}`);
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
}

type Obj = Record<string, unknown>;

function withoutQuestionId(value: unknown, where: string): Obj {
  const row = { ...(value as Obj) };
  if (row.question_id !== PLACEHOLDER_ID) throw new Error(`${where}: unexpected question_id`);
  delete row.question_id;
  return row;
}

/** Split one importQuestion() recording into the rows stage.sql inserts. */
export function shapeWrites(writes: RecordedWrite[], format: string, where: string) {
  const take = (table: string, op: RecordedWrite["op"]) =>
    writes.filter((w) => w.table === table && w.op === op);
  const known = new Set([
    "quiz_questions",
    "answer_choices",
    "answer_key_entries",
    "source_assets",
  ]);
  const stray = writes.filter((w) => !known.has(w.table));
  if (stray.length) throw new Error(`${where}: unexpected write to ${stray[0].table}`);
  const questions = take("quiz_questions", "insert");
  const choices = take("answer_choices", "insert");
  const keys = take("answer_key_entries", "insert");
  const mirrors = take("quiz_questions", "update");
  if (questions.length !== 1 || keys.length !== 1 || mirrors.length !== 1)
    throw new Error(`${where}: expected one question, one answer key and one mirror update`);
  if (mirrors[0].match?.id !== PLACEHOLDER_ID)
    throw new Error(`${where}: mirror update targets another row`);
  if ((format === "multiple_choice") !== (choices.length === 1))
    throw new Error(`${where}: choice writes do not fit ${format}`);
  const choiceRows = choices.length ? (choices[0].values as unknown[]) : [];
  return {
    question: questions[0].values as Obj,
    choices: choiceRows.map((c, i) => withoutQuestionId(c, `${where} choice ${i + 1}`)),
    key: withoutQuestionId(keys[0].values, `${where} answer key`),
    mirror: mirrors[0].values as Obj,
    source_assets: take("source_assets", "insert").map((w) =>
      withoutQuestionId(w.values, `${where} asset`)
    ),
  };
}

/** The rows the reviewed importer would write for already-verified reviewed rows. */
export async function recordReviewedRows(
  rows: Array<Record<string, unknown>>,
  sourcePdf: string,
  sourceVersion: string
) {
  const out = [];
  for (const [index, row] of rows.entries()) {
    const where = `row ${index + 1} (${String(row.stable_question_id)})`;
    const reviewed = rowToReviewedImportInput(row, sourcePdf, { sourceVersion });
    if ("error" in reviewed) throw new Error(`${where}: ${reviewed.error}`);
    const writes: RecordedWrite[] = [];
    const result = await importQuestion(recordingClient(writes), reviewed.input, {
      difficultyPolicy: "reviewed",
    });
    if (!result.inserted || result.errors.length)
      throw new Error(`${where}: importer refused: ${result.errors.join("; ") || "not inserted"}`);
    const format = reviewed.input.question_format ?? "multiple_choice";
    out.push({ stable_question_id: row.stable_question_id, ...shapeWrites(writes, format, where) });
  }
  return out;
}

async function main() {
  const [jsonArg, pdfArg, manifestArg, manifestSha] = process.argv.slice(2);
  if (!jsonArg || !pdfArg || !manifestArg || !manifestSha)
    throw new Error(
      "usage: stage-rows.ts <reviewed.json> <source.pdf> <frozen-manifest.json> <manifest-sha256>"
    );
  const jsonBytes = readFileSync(resolve(jsonArg));
  const pdfBytes = readFileSync(resolve(pdfArg));
  const sourceVersion = sha256Hex(pdfBytes);
  const parsed = JSON.parse(jsonBytes.toString("utf-8")) as {
    import_policy?: unknown;
    questions?: unknown;
  };
  if (
    parsed.import_policy !== REVIEWED_DIFFICULTY_IMPORT_POLICY ||
    !Array.isArray(parsed.questions)
  )
    throw new Error("not a reviewed export (import_policy reviewed-difficulty with questions[])");
  const rows = parsed.questions as Array<Record<string, unknown>>;
  const sourcePdf = basename(pdfArg);
  const preflight = preflightImportRows(rows, sourcePdf, sourceVersion, true);
  if (preflight.errors.length) throw new Error(`preflight: ${preflight.errors.join("; ")}`);
  const frozen = verifyFrozenReviewedInput({
    manifestBytes: readFileSync(resolve(manifestArg)),
    expectedManifestSha256: manifestSha,
    jsonBytes,
    pdfBytes,
    rows,
  });
  if (!frozen.ok) throw new Error(`frozen inputs: ${frozen.error}`);
  const out = await recordReviewedRows(rows, sourcePdf, sourceVersion);
  process.stdout.write(
    JSON.stringify({
      reviewed_json_sha256: sha256Hex(jsonBytes),
      source_pdf_sha256: sourceVersion,
      rows: out,
    }) + "\n"
  );
}

if (process.argv[1] && /stage-rows\.ts$/.test(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`stage-rows: ${(error as Error).message}\n`);
    process.exit(2);
  });
}
