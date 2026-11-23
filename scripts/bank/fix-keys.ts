/*
 * Bank stream, round two (founder, 2026-11-22: "fix the 17 wrong keys where two solvers and a judge
 * agreed"). For each held wrong-key question where both blind solvers and the adjudicator gave the
 * same other answer, and whose new explanation passed the independent checker and the automatic
 * checks: set the key to that answer (quiz_questions.correct_answer and verified_answer, the
 * choices' is_correct), replace the explanation and hint, record the correction in the key entry's
 * evidence, and lift the hold this session put on it (import_status back to ok). A question that
 * was hidden before tonight stays as it was. The printed key in answer_key_entries is kept as the
 * source said. Targeted updates only, each guarded on the old key, read back with the app's grader.
 *
 *   npx tsx scripts/bank/fix-keys.ts <work-dir> [--dry]
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { evaluateQuizAnswer } from "../../src/lib/quiz-session";
import type { QuizQuestionWithChoices } from "../../src/types/quiz";

type Candidate = {
  id: string;
  key: string;
  adj: string;
  agree: boolean;
  ours: boolean;
  a: string;
  b: string;
};
type Final = { id: string; explanation: string; hint: string; status: string };
type Json = Record<string, unknown>;

const [work] = process.argv.slice(2);
const dry = process.argv.includes("--dry");
if (!work) throw new Error("usage: fix-keys.ts <work-dir> [--dry]");
for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
const jsonl = <T>(f: string): T[] =>
  existsSync(f)
    ? readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as T)
    : [];

const candidates = (
  JSON.parse(readFileSync(join(work, "decisions", "keyfix-candidates.json"), "utf8")) as Candidate[]
).filter((c) => c.agree);
const finals = new Map(
  jsonl<Final>(join(work, "results", "explain-final.jsonl")).map((f) => [f.id, f])
);
const checked = new Map(
  jsonl<{ id: string; ok: boolean; problems: string[] }>(
    join(work, "results", "explain-checked.jsonl")
  ).map((c) => [c.id, c])
);
const log = join(work, "results", "keyfix.jsonl");

async function fixOne(c: Candidate): Promise<Json> {
  const f = finals.get(c.id);
  const chk = checked.get(c.id);
  if (!f || !f.status.startsWith("passed") || !chk?.ok)
    return { outcome: "skipped: explanation did not pass", problems: chk?.problems ?? [] };
  const next = c.adj.split("|")[0].trim();
  const { data: row, error } = await db
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", c.id)
    .single();
  if (error) throw new Error(error.message);
  if (String(row.correct_answer).trim() !== c.key)
    return { outcome: "skipped: key changed since the check" };
  const graded = { ...row, correct_answer: next } as QuizQuestionWithChoices;
  if (!evaluateQuizAnswer(next, graded) || evaluateQuizAnswer(c.key, graded))
    return { outcome: "skipped: grader does not tell the new key from the old" };
  if (dry) return { outcome: "dry: would fix", old: c.key, next };

  const lift = c.ours
    ? { import_status: "ok", import_flag_type: null, import_flag_reason: null }
    : {};
  const { data: upd, error: e1 } = await db
    .from("quiz_questions")
    .update({
      correct_answer: next,
      verified_answer: next,
      explanation_text: f.explanation,
      hint: f.hint,
      explanation_per_choice: null,
      ...lift,
      updated_at: new Date().toISOString(),
    })
    .eq("id", c.id)
    .eq("correct_answer", c.key)
    .select("id");
  if (e1 || upd?.length !== 1)
    return { outcome: `error: question update (${e1?.message ?? "no row"})` };
  if (row.answer_format === "multiple_choice") {
    const { error: e2 } = await db
      .from("answer_choices")
      .update({ is_correct: false })
      .eq("question_id", c.id);
    const { error: e3 } = await db
      .from("answer_choices")
      .update({ is_correct: true })
      .eq("question_id", c.id)
      .eq("letter", next);
    if (e2 || e3) return { outcome: `error: choices (${(e2 ?? e3)!.message})` };
  }
  const { data: keys } = await db
    .from("answer_key_entries")
    .select("id, raw_model_response")
    .eq("question_id", c.id);
  const key = keys?.[0];
  const raw = key?.raw_model_response as Json | null | undefined;
  if (key && raw && typeof raw === "object") {
    const ev = (raw.kind === "independently_confirmed_generated" ? raw.evidence : raw) as Json;
    ev.key_corrections = [
      ...((ev.key_corrections as unknown[]) ?? []),
      {
        at: new Date().toISOString(),
        by: "bank-stream-2026-11-22",
        old_key: c.key,
        new_key: next,
        basis:
          "two blind solvers and an adjudicator agreed (Math computed); founder rule, round two",
        solvers: [c.a, c.b],
      },
    ];
    await db.from("answer_key_entries").update({ raw_model_response: raw }).eq("id", key.id);
  }
  const { data: after } = await db
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", c.id)
    .single();
  const ok =
    after &&
    evaluateQuizAnswer(next, after as QuizQuestionWithChoices) &&
    !evaluateQuizAnswer(c.key, after as QuizQuestionWithChoices) &&
    after.explanation_text === f.explanation &&
    (row.answer_format !== "multiple_choice" ||
      (after.answer_choices as { letter: string; is_correct: boolean }[]).every(
        (ch) => ch.is_correct === (ch.letter === next)
      ));
  return {
    outcome: ok ? "fixed" : "fixed but the readback differs",
    old: c.key,
    next,
    lifted: c.ours,
    is_live: after?.is_live,
  };
}

async function main(): Promise<void> {
  for (const c of candidates) {
    const r = await fixOne(c).catch((e: Error) => ({ outcome: `error: ${e.message}` }));
    console.log(c.id, JSON.stringify(r));
    if (!dry)
      appendFileSync(log, JSON.stringify({ id: c.id, at: new Date().toISOString(), ...r }) + "\n");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
