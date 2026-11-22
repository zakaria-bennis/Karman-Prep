#!/usr/bin/env tsx
/*
 * Check Reading and Writing items written by helpers, and turn the ones that pass into the
 * loader's format (StorableQuestion, JSON Lines).
 *
 *   npx tsx scripts/generator/rw-validate.ts <items.jsonl> [--verdicts <checks.jsonl>] [--out <ready.jsonl>] [--batch name]
 *
 * An item line: { id, skill72, difficulty, questionText, choices: [4 strings], correct: 0-3,
 *                 explanation, hint, figure?: FigureSpec }
 * A verdict line (from the second, blind helper): { id, answer: 0-3, keep: boolean, problems: [] }
 * An item is ready only when it passes every check here AND its verdict exists, the blind
 * answer matches the key, and keep is true. It is refused when it copies the bank (a run of 12
 * words shared with any real question) or repeats another item.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseFigureSpec } from "@/lib/figures/engine/spec";
import { renderIssues } from "@/lib/generator/math/core/render";
import { fingerprint, type StorableQuestion } from "@/lib/generator/store";
import { skill72 } from "@/lib/skills/ids72";

const BANK =
  "/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep--claude-worktrees-pc-generator-c9fb7f/e01ff29f-ecbf-4fa7-a2bb-86967e6b8a15/scratchpad/bank/_all_rows.json";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args[0];
if (!file)
  throw new Error("usage: rw-validate.ts <items.jsonl> [--verdicts f] [--out f] [--batch name]");

interface Item {
  id: string;
  skill72: string;
  difficulty: number;
  questionText: string;
  choices: string[];
  correct: number;
  explanation: string;
  hint: string;
  figure?: unknown;
}

const words = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
const SHINGLE = 12;
function shingles(t: string): Set<string> {
  const w = words(t);
  const out = new Set<string>();
  for (let i = 0; i + SHINGLE <= w.length; i++) out.add(w.slice(i, i + SHINGLE).join(" "));
  return out;
}

let bankShingles: Set<string> | null = null;
function copiesBank(text: string): boolean {
  if (!bankShingles) {
    bankShingles = new Set();
    try {
      const rows = JSON.parse(readFileSync(BANK, "utf8")) as {
        question_text: string;
        subject: string;
      }[];
      for (const r of rows) {
        if (r.subject !== "math") for (const s of shingles(r.question_text)) bankShingles.add(s);
      }
    } catch {
      console.warn("bank text not found: copy check skipped");
    }
  }
  for (const s of shingles(text)) if (bankShingles.has(s)) return true;
  return false;
}

function problems(item: Item): string[] {
  const out: string[] = [];
  if (!skill72(item.skill72) || !item.skill72.startsWith("rw-"))
    out.push("unknown Reading and Writing skill");
  if (!Number.isInteger(item.difficulty) || item.difficulty < 1 || item.difficulty > 7)
    out.push("difficulty not 1-7");
  if (!Array.isArray(item.choices) || item.choices.length !== 4) out.push("not four choices");
  else if (new Set(item.choices.map((c) => c.trim().toLowerCase())).size !== 4)
    out.push("two choices read the same");
  if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3)
    out.push("correct is not 0-3");
  if (!item.questionText || item.questionText.length < 60) out.push("question text too short");
  else if (item.questionText.length > 1800) out.push("question text too long");
  else if (!/\n\n[^\n]+$/.test(item.questionText.trim()))
    out.push("no question line after the passage");
  for (const part of ["What it asks:", "Tip:"]) {
    if (!item.explanation?.includes(part)) out.push(`explanation lacks ${part}`);
  }
  if (
    /\b(choice|option|answer) [ABCD]\b|\([ABCD]\)|^\s*[ABCD][.)]\s/im.test(item.explanation ?? "")
  ) {
    out.push("explanation names a choice by letter");
  }
  for (const c of item.choices ?? []) {
    const head = c.replace(/[.,;:]$/, "").slice(0, 25);
    if (!item.explanation?.includes(head)) out.push(`choice not discussed: ${c.slice(0, 30)}`);
  }
  if (!item.hint || item.hint.length > 200) out.push("hint missing or too long");
  const right = item.choices?.[item.correct];
  if (item.hint && right && right.length > 3 && item.hint.includes(right.slice(0, 20))) {
    out.push("hint gives the answer away");
  }
  for (const text of [item.questionText, item.explanation, item.hint, ...(item.choices ?? [])]) {
    for (const issue of renderIssues(text ?? "")) {
      if (issue.problem !== "a dollar sign outside math") out.push(`render: ${issue.problem}`);
    }
  }
  if (item.figure !== undefined && item.figure !== null) {
    const parsed = parseFigureSpec(item.figure);
    if (!parsed.ok) out.push(`figure: ${parsed.errors.slice(0, 2).join("; ")}`);
  }
  if (copiesBank(`${item.questionText} ${(item.choices ?? []).join(" ")}`)) {
    out.push("shares a 12-word run with a real question");
  }
  return out;
}

const items = readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as Item);
const verdictFile = arg("verdicts");
const verdicts = new Map<string, { answer: number; keep: boolean; problems?: string[] }>();
if (verdictFile) {
  for (const l of readFileSync(verdictFile, "utf8").split("\n")) {
    if (!l.trim()) continue;
    const v = JSON.parse(l);
    verdicts.set(v.id, v);
  }
}

const LETTERS = ["A", "B", "C", "D"] as const;
const batch = arg("batch") ?? "rw-draft";
const ready: StorableQuestion[] = [];
const seen = new Set<string>();
const report: Record<string, { ok: number; refused: number }> = {};
for (const item of items) {
  const why = problems(item);
  if (verdictFile) {
    const v = verdicts.get(item.id);
    if (!v) why.push("no blind check");
    else {
      if (v.answer !== item.correct) {
        why.push(
          `blind helper chose ${LETTERS[v.answer] ?? v.answer}, key ${LETTERS[item.correct]}`
        );
      }
      if (!v.keep) why.push(`blind helper flagged: ${(v.problems ?? []).join("; ")}`);
    }
  }
  if (Array.isArray(item.choices) && item.choices.length === 4) {
    const q: StorableQuestion = {
      stableId: `rw:${batch}:${item.id}`,
      kind: "rw-helper",
      skill72: item.skill72,
      template: `rw.${item.skill72.replace(/^rw-/, "")}`,
      seed: item.id,
      format: "mc",
      questionText: item.questionText.trim(),
      figure: (item.figure as StorableQuestion["figure"]) ?? null,
      choices: item.choices.map((text, i) => ({
        letter: LETTERS[i],
        text: text.trim(),
        correct: i === item.correct,
      })),
      key: LETTERS[item.correct],
      explanation: item.explanation.trim(),
      hint: item.hint.trim(),
      difficulty: item.difficulty,
      checks: {
        writer: "claude-helper",
        blind_check: verdicts.get(item.id) ?? null,
        validator: "rw-validate/1",
      },
    };
    const print = fingerprint(q);
    if (seen.has(print)) why.push("repeats another item");
    seen.add(print);
    if (!why.length) ready.push(q);
  }
  const r = (report[item.skill72] ??= { ok: 0, refused: 0 });
  if (why.length) {
    r.refused++;
    console.log(`REFUSED ${item.id}: ${why.join(" | ")}`);
  } else r.ok++;
}
console.log(JSON.stringify(report));
console.log(`${ready.length} of ${items.length} ready`);
const out = arg("out");
if (out)
  writeFileSync(out, ready.map((q) => JSON.stringify(q)).join("\n") + (ready.length ? "\n" : ""));
