/*
 * Bank stream (overnight build, 2026-11-22): turn the two blind check passes, the skill judge and
 * the key adjudicator into decisions. Read only: it writes JSON files in the work folder, never the
 * database.
 *
 * Skill: the two classifiers agree, or a third judge decides. Key: both solvers agree with the
 * stored key and flag nothing, or a third adjudicator rules. A question is held (hidden from
 * students, never deleted, key never changed) only when the adjudicator's ruling is backed by at
 * least one blind solver, or by a second adjudicator.
 *
 *   npx tsx scripts/bank/decide.ts <backup-dir> <work-dir>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateQuizAnswer } from "../../src/lib/quiz-session";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "../../src/lib/question-bank/numeric-answer-set";
import type { QuizQuestionWithChoices } from "../../src/types/quiz";

type Pass = {
  id: string;
  skill: string;
  skill_confidence: number;
  skill_second: string;
  answer: string;
  answer_confidence: number;
  issue: "none" | "broken" | "two_answers" | "no_answer";
  note?: string;
};
type Judge = { id: string; skill: string; confidence: number; poor_fit: boolean; reason?: string };
type Ruling = {
  id: string;
  ruling: "key_correct" | "key_wrong" | "broken";
  answer: string;
  confidence: number;
  reason: string;
  round?: number;
};
type Row = QuizQuestionWithChoices & {
  archived_at: string | null;
  is_live: boolean;
  source_pdf: string | null;
  source_section: string | null;
  source_module: string | null;
  source_question_number: number | null;
};

const [backup, work] = process.argv.slice(2);
if (!backup || !work) throw new Error("usage: decide.ts <backup-dir> <work-dir>");

const jsonl = <T>(file: string): T[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as T)
    : [];
const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

const questions = jsonl<Row>(join(backup, "quiz_questions.jsonl"));
const keys = jsonl<{ question_id: string; raw_model_response: unknown }>(
  join(backup, "answer_key_entries.jsonl")
);
const evidenceOf = new Map(keys.map((k) => [k.question_id, k.raw_model_response]));
const index = JSON.parse(readFileSync(join(work, "batches", "main", "index.json"), "utf8")) as {
  ids: string[];
}[];
const inScope = new Set(index.flatMap((b) => b.ids));
const A = byId(jsonl<Pass>(join(work, "results", "pass-A.jsonl")));
const B = byId(jsonl<Pass>(join(work, "results", "pass-B.jsonl")));
const judged = byId(jsonl<Judge>(join(work, "results", "judge.jsonl")));
const rulings = new Map<string, Ruling[]>();
for (const r of jsonl<Ruling>(join(work, "results", "adjudicate.jsonl"))) {
  rulings.set(r.id, [...(rulings.get(r.id) ?? []), r]);
}

// Suspects from another session's review of 13 released exam PDFs (scripts/bank/known-issues-13-exams.json)
const known = JSON.parse(
  readFileSync(join(process.cwd(), "scripts", "bank", "known-issues-13-exams.json"), "utf8")
) as {
  exams: Record<string, string | string[]>;
  items: [string, string, string, number, string][];
};
const suspectNote = new Map<string, string>();
for (const q of questions) {
  for (const [exam, section, module, number, note] of known.items) {
    const pdfs = ([] as string[]).concat(known.exams[exam]);
    const pdf = (q.source_pdf ?? "").replace(/\.pdf$/, "");
    if (
      pdfs.includes(pdf) &&
      q.source_section === section &&
      q.source_module === module &&
      q.source_question_number === number
    )
      suspectNote.set(q.id, note);
  }
}

/** Does a solver's answer (alternatives split by "|") match the row's key, by the app's own grader? */
function matchesKey(answer: string, row: Row): boolean {
  const reviewed =
    row.answer_format === "numeric_entry"
      ? reviewedNumericAnswers(row, numericAnswerSetFromEvidence(evidenceOf.get(row.id)))
      : undefined;
  const graded = { ...row, reviewed_numeric_answers: reviewed } as QuizQuestionWithChoices;
  return answer
    .split("|")
    .map((a) => a.trim().replace(/−/g, "-"))
    .filter(Boolean)
    .some((a) => evaluateQuizAnswer(a, graded));
}
const sameAnswer = (x: string, y: string, row: Row) =>
  row.answer_format === "multiple_choice"
    ? x.trim().toUpperCase() === y.trim().toUpperCase()
    : x
        .split("|")
        .some((a) =>
          y.split("|").some((b) => Math.abs(Number(eval1(a)) - Number(eval1(b))) < 1e-6)
        );
function eval1(v: string): number {
  const t = v.trim().replace(/−/g, "-");
  if (/^-?\d*\.?\d+\/\d*\.?\d+$/.test(t)) {
    const [n, d] = t.split("/").map(Number);
    return n / d;
  }
  return Number(t);
}

const skills: object[] = [];
const judgeQueue: object[] = [];
const keyRows: object[] = [];
const adjudicateQueue: object[] = [];
const missing = { A: [] as string[], B: [] as string[] };
const tally: Record<string, number> = {};
const count = (k: string) => (tally[k] = (tally[k] ?? 0) + 1);

for (const row of questions) {
  if (!inScope.has(row.id)) continue;
  const a = A.get(row.id);
  const b = B.get(row.id);
  if (!a) missing.A.push(row.id);
  if (!b) missing.B.push(row.id);
  if (!a || !b) {
    count("pending: a pass is missing");
    continue;
  }

  // Skill
  const j = judged.get(row.id);
  if (a.skill === b.skill) {
    const confidence = Math.round(((a.skill_confidence + b.skill_confidence) / 2) * 1000) / 1000;
    skills.push({
      id: row.id,
      skill: a.skill,
      confidence,
      decided_by: "agreed",
      a: a.skill,
      b: b.skill,
      judge: null,
      poor_fit: confidence < 0.5,
      reason: null,
    });
    count("skill: agreed");
  } else if (j) {
    skills.push({
      id: row.id,
      skill: j.skill,
      confidence: Math.round(j.confidence * 0.9 * 1000) / 1000,
      decided_by: "judged",
      a: a.skill,
      b: b.skill,
      judge: j.skill,
      poor_fit: j.poor_fit || j.confidence < 0.5,
      reason: j.reason ?? null,
    });
    count("skill: judged");
  } else {
    judgeQueue.push({
      id: row.id,
      subject: row.subject,
      a: a.skill,
      a_confidence: a.skill_confidence,
      a_second: a.skill_second,
      b: b.skill,
      b_confidence: b.skill_confidence,
      b_second: b.skill_second,
    });
    count("skill: to judge");
  }

  // Key
  const aOk = matchesKey(a.answer, row);
  const bOk = matchesKey(b.answer, row);
  const flagged = a.issue !== "none" || b.issue !== "none";
  const unsure = a.answer_confidence < 0.6 || b.answer_confidence < 0.6;
  const suspect = suspectNote.get(row.id) ?? null;
  const base = {
    id: row.id,
    live: row.is_live,
    key: row.correct_answer,
    a: a.answer,
    b: b.answer,
    a_issue: a.issue,
    b_issue: b.issue,
    a_note: a.note ?? null,
    b_note: b.note ?? null,
    suspect,
  };
  if (aOk && bOk && !flagged && !unsure && !suspect) {
    keyRows.push({ ...base, verdict: "confirmed" });
    count("key: confirmed by both solvers");
    continue;
  }
  const reasons = [
    !aOk && "A differs from the key",
    !bOk && "B differs from the key",
    flagged && "a solver flagged an issue",
    unsure && "a solver was unsure",
    suspect && "reported in the 13-exam review",
  ].filter(Boolean);
  const rs = rulings.get(row.id) ?? [];
  if (rs.length === 0) {
    adjudicateQueue.push({ ...base, reasons });
    count("key: to adjudicate");
    continue;
  }
  const first = rs[0];
  const backedBySolver = (answer: string) =>
    sameAnswer(a.answer, answer, row) || sameAnswer(b.answer, answer, row);
  const second = rs[1];
  let verdict: string;
  if (first.ruling === "key_correct") verdict = "kept: adjudicator confirmed the key";
  else if (first.confidence < 0.8) verdict = "kept: adjudicator not sure enough to hold";
  else if (first.ruling === "key_wrong" && backedBySolver(first.answer))
    verdict = "held: wrong key";
  else if (first.ruling === "broken" && (flagged || !aOk || !bOk)) verdict = "held: broken";
  else if (second && second.ruling === first.ruling && second.confidence >= 0.8)
    verdict = first.ruling === "key_wrong" ? "held: wrong key" : "held: broken";
  else if (second) verdict = "kept: second adjudicator did not agree";
  else {
    adjudicateQueue.push({ ...base, reasons, round: 2, first });
    count("key: to adjudicate again");
    continue;
  }
  keyRows.push({ ...base, verdict, rulings: rs });
  count(`key: ${verdict}`);
}

const out = join(work, "decisions");
mkdirSync(out, { recursive: true });
const lines = (list: object[]) => list.map((x) => JSON.stringify(x)).join("\n") + "\n";
writeFileSync(join(out, "skills.jsonl"), lines(skills));
writeFileSync(join(out, "keys.jsonl"), lines(keyRows));
writeFileSync(join(out, "judge-queue.json"), JSON.stringify(judgeQueue));
writeFileSync(join(out, "adjudicate-queue.json"), JSON.stringify(adjudicateQueue));
writeFileSync(join(out, "missing.json"), JSON.stringify(missing));
console.log(
  JSON.stringify({ ...tally, missingA: missing.A.length, missingB: missing.B.length }, null, 1)
);
