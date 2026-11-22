/*
 * Bank stream (overnight build, 2026-11-22): replace old explanations and hints with the new ones
 * that passed the independent checker and the automatic checks, and reseal each question so it
 * stays in the student pool (src/lib/question-bank/catalog-question-scope.ts).
 *
 * Per question, with targeted updates only (never a whole row written back, because other streams
 * write other columns of the same rows tonight):
 *   1. Read the live row and its key entry. Skip it if its explanation, hint or per-choice text
 *      changed since the backup.
 *   2. Write explanation_text, hint, and explanation_per_choice = null (the new text explains every
 *      choice by its words; per-choice text is keyed by letter, which shuffling breaks), guarded on
 *      updated_at.
 *   3. If the question was sealed before (its seal matched its delivered payload), write the new
 *      seal and an explanation_replacements record in its evidence, guarded on the old seal; if that
 *      fails, put the old text back. A question that was not sealed stays unsealed (never newly
 *      admitted); it still gets the record.
 *   4. Read both back and check the seal against the delivered payload.
 *
 *   npx tsx scripts/bank/publish-explanations.ts <backup-dir> <work-dir> <batch-name> [--limit N] [--dry]
 *   npx tsx scripts/bank/publish-explanations.ts <backup-dir> <work-dir> --verify-seals N
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "../../src/lib/question-bank/catalog-question-scope";
import type { QuizQuestionWithChoices } from "../../src/types/quiz";

type Json = Record<string, unknown>;
type Final = { id: string; explanation: string; hint: string; status: string };

const args = process.argv.slice(2);
const [backup, work] = args;
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dry = args.includes("--dry");
const verifySeals = flag("--verify-seals");
const batch = verifySeals ? "verify" : args[2];
if (!backup || !work || !batch) throw new Error("usage: see the header of this file");

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    process.env[m[1]] ??= v;
  }
}
loadEnv(join(process.cwd(), ".env.local"));
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const jsonl = <T>(file: string): T[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as T)
    : [];
const sha = (t: string | null | undefined) =>
  t == null ? null : createHash("sha256").update(t, "utf8").digest("hex");
const shaJson = (v: unknown) => (v == null ? null : sha(JSON.stringify(v)));

/** The evidence object that holds approved_tags (generated keys nest it under .evidence). */
function evidenceOf(raw: unknown): Json | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const env = raw as Json;
  return env.kind === "independently_confirmed_generated" ? ((env.evidence as Json) ?? null) : env;
}
function sealOf(raw: unknown): string | null {
  const tags = evidenceOf(raw)?.approved_tags as Json | undefined;
  return typeof tags?.question_payload_sha256 === "string" ? tags.question_payload_sha256 : null;
}
const sealPath = (raw: unknown) =>
  (raw as Json)?.kind === "independently_confirmed_generated"
    ? "raw_model_response->evidence->approved_tags->>question_payload_sha256"
    : "raw_model_response->approved_tags->>question_payload_sha256";

async function readLive(id: string) {
  const [{ data: row, error: e1 }, { data: keys, error: e2 }] = await Promise.all([
    db.from("quiz_questions").select("*, answer_choices(*)").eq("id", id).maybeSingle(),
    db
      .from("answer_key_entries")
      .select("id, question_id, raw_model_response")
      .eq("question_id", id),
  ]);
  if (e1 || e2) throw new Error(`read ${id}: ${(e1 ?? e2)!.message}`);
  if (!row) throw new Error(`read ${id}: no row`);
  if ((keys ?? []).length > 1) throw new Error(`read ${id}: ${keys!.length} key entries`);
  return { row: row as QuizQuestionWithChoices & Json, key: (keys ?? [])[0] ?? null };
}

const limit = Number(flag("--limit") ?? "100000");
const backupRows = new Map(
  jsonl<Json & { id: string }>(join(backup, "quiz_questions.jsonl")).map((q) => [q.id, q])
);
const finals = new Map(
  jsonl<Final>(join(work, "results", "explain-final.jsonl")).map((f) => [f.id, f])
);
const checked = new Map(
  jsonl<{ id: string; ok: boolean }>(join(work, "results", "explain-checked.jsonl")).map((c) => [
    c.id,
    c,
  ])
);
const settled = new Set(
  jsonl<{ id: string; verdict: string }>(join(work, "decisions", "keys.jsonl"))
    .filter((k) => k.verdict === "confirmed" || k.verdict.startsWith("kept"))
    .map((k) => k.id)
);
const publishedFile = join(work, "results", "published.jsonl");
const published = new Set(
  jsonl<{ id: string; outcome: string }>(publishedFile)
    .filter((p) => p.outcome === "replaced")
    .map((p) => p.id)
);

const todo = [...finals.values()]
  .filter(
    (f) =>
      f.status.startsWith("passed") &&
      checked.get(f.id)?.ok &&
      settled.has(f.id) &&
      !published.has(f.id) &&
      backupRows.has(f.id)
  )
  .slice(0, limit);
console.log(`${batch}: ${todo.length} explanations to publish${dry ? " (dry run)" : ""}`);

const tally: Record<string, number> = {};
const note = (k: string) => (tally[k] = (tally[k] ?? 0) + 1);

async function publishOne(f: Final) {
  const before = backupRows.get(f.id)!;
  const { row, key } = await readLive(f.id);
  if (
    row.explanation_text !== before.explanation_text ||
    row.hint !== before.hint ||
    JSON.stringify(row.explanation_per_choice) !== JSON.stringify(before.explanation_per_choice)
  )
    return { outcome: "skipped: changed since the backup" };
  const seal = sealOf(key?.raw_model_response);
  const sealedNow = seal !== null && seal === catalogQuestionPayloadHash(row);
  const next = {
    ...row,
    explanation_text: f.explanation,
    hint: f.hint,
    explanation_per_choice: null,
  };
  const nextSeal = catalogQuestionPayloadHash(next as QuizQuestionWithChoices);
  if (dry) return { outcome: sealedNow ? "dry: would reseal" : "dry: would replace (not sealed)" };

  const stamp = new Date().toISOString();
  const { data: upd, error: e1 } = await db
    .from("quiz_questions")
    .update({
      explanation_text: f.explanation,
      hint: f.hint,
      explanation_per_choice: null,
      updated_at: stamp,
    })
    .eq("id", f.id)
    .eq("updated_at", row.updated_at as string)
    .select("id");
  if (e1) throw new Error(`update ${f.id}: ${e1.message}`);
  if ((upd ?? []).length !== 1) return { outcome: "skipped: row changed while publishing" };

  if (key) {
    const raw = structuredClone(key.raw_model_response) as Json;
    const ev = evidenceOf(raw)!;
    const record = {
      at: stamp,
      by: "bank-stream-2026-11-22",
      run: batch,
      set: ["explanation_text", "explanation_per_choice", "hint"],
      checks: "writer helper, independent checker helper, automatic checks",
      explanation_sha256: sha(f.explanation),
      previous_explanation_sha256: sha(row.explanation_text),
      hint_sha256: sha(f.hint),
      previous_hint_sha256: sha(row.hint),
      previous_explanation_per_choice_sha256: shaJson(row.explanation_per_choice),
      previous_question_payload_sha256: seal,
      resealed: sealedNow,
    };
    ev.explanation_replacements = [...((ev.explanation_replacements as unknown[]) ?? []), record];
    if (sealedNow) (ev.approved_tags as Json).question_payload_sha256 = nextSeal;
    let q = db.from("answer_key_entries").update({ raw_model_response: raw }).eq("id", key.id);
    if (seal) q = q.filter(sealPath(key.raw_model_response), "eq", seal);
    const { data: kupd, error: e2 } = await q.select("id");
    if (e2 || (kupd ?? []).length !== 1) {
      // put the old text back so the row and its seal agree again
      await db
        .from("quiz_questions")
        .update({
          explanation_text: row.explanation_text,
          hint: row.hint,
          explanation_per_choice: row.explanation_per_choice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", f.id)
        .eq("updated_at", stamp);
      return { outcome: `reverted: evidence write failed${e2 ? ` (${e2.message})` : ""}` };
    }
  }

  // read back
  const after = await readLive(f.id);
  const ok =
    after.row.explanation_text === f.explanation &&
    after.row.hint === f.hint &&
    after.row.explanation_per_choice === null;
  let sealOk = true;
  if (sealedNow) {
    sealOk = sealOf(after.key?.raw_model_response) === catalogQuestionPayloadHash(after.row);
    try {
      readCatalogQuestionScope(after.key?.raw_model_response);
    } catch {
      sealOk = false;
    }
  }
  return {
    outcome: ok && sealOk ? "replaced" : "replaced but the readback differs",
    sealed: sealedNow,
    previous_seal: seal,
    new_seal: sealedNow ? nextSeal : seal,
    previous_explanation_sha256: sha(row.explanation_text),
    explanation_sha256: sha(f.explanation),
  };
}

async function verify(): Promise<void> {
  // Does the app's seal function reproduce the stored seals of live, sealed rows? (read only)
  const n = Number(verifySeals);
  const { data } = await db
    .from("quiz_questions")
    .select("id")
    .eq("is_live", true)
    .eq("publish_status", "publish_ready")
    .order("updated_at", { ascending: false })
    .limit(n);
  let same = 0;
  let differ = 0;
  let none = 0;
  for (const { id } of data ?? []) {
    const { row, key } = await readLive(id);
    const seal = sealOf(key?.raw_model_response);
    if (!seal) none++;
    else if (seal === catalogQuestionPayloadHash(row)) same++;
    else differ++;
  }
  console.log(
    JSON.stringify({
      checked: (data ?? []).length,
      seal_matches: same,
      seal_differs: differ,
      no_seal: none,
    })
  );
}

const queue = [...todo];
async function worker() {
  for (;;) {
    const f = queue.shift();
    if (!f) return;
    let result: Json;
    try {
      result = await publishOne(f);
    } catch (e) {
      result = { outcome: `error: ${(e as Error).message.slice(0, 200)}` };
    }
    note(String(result.outcome));
    if (!dry)
      appendFileSync(
        publishedFile,
        JSON.stringify({ id: f.id, batch, at: new Date().toISOString(), ...result }) + "\n"
      );
  }
}
async function main(): Promise<void> {
  if (verifySeals) return verify();
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(JSON.stringify({ batch, ...tally }, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
