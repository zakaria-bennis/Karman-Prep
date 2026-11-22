/*
 * Bank stream (overnight build, 2026-11-22): the automatic checks every new explanation and hint
 * must pass before it may replace the old one, on top of the independent checker helper. Read only.
 *
 * - Shape: length, one-line hint, no en dash, no runs of hyphens or underscores (the screen turns
 *   them into dashes and blanks), no Markdown or HTML, no display math, no $ outside math.
 * - Math: every \( \) span balanced, and every span the screen's own splitter finds parses in KaTeX.
 * - Letters: no choice named by letter anywhere outside math (answers are shuffled on screen).
 * - Answer: "The answer is ..." names the key by its words (multiple choice) or states values the
 *   app's own grader accepts (typed answers).
 * - Wrong choices: each one is named by its words or value.
 * - Hint: gives away neither the right choice's words nor the typed answer.
 *
 *   npx tsx scripts/bank/check-explanations.ts <backup-dir> <work-dir>
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";
import { splitMathText } from "../../src/components/learn/math-segments";
import { evaluateQuizAnswer } from "../../src/lib/quiz-session";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "../../src/lib/question-bank/numeric-answer-set";
import type { AnswerChoice, QuizQuestionWithChoices } from "../../src/types/quiz";

type Final = { id: string; explanation: string; hint: string; status: string };

const [backup, work] = process.argv.slice(2);
if (!backup || !work) throw new Error("usage: check-explanations.ts <backup-dir> <work-dir>");
const jsonl = <T>(file: string): T[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as T)
    : [];

// keys corrected on the founder's word (round two, 2026-11-22): check against the new key
const overridesFile = join(work, "results", "key-overrides.json");
const overrides: Record<string, string> = existsSync(overridesFile)
  ? JSON.parse(readFileSync(overridesFile, "utf8"))
  : {};
const rows = new Map(
  jsonl<QuizQuestionWithChoices>(join(backup, "quiz_questions.jsonl")).map((q) => [
    q.id,
    overrides[q.id] ? { ...q, correct_answer: overrides[q.id] } : q,
  ])
);
const choicesOf = new Map<string, AnswerChoice[]>();
for (const c of jsonl<AnswerChoice>(join(backup, "answer_choices.jsonl"))) {
  choicesOf.set(c.question_id, [...(choicesOf.get(c.question_id) ?? []), c]);
}
const evidenceOf = new Map(
  jsonl<{ question_id: string; raw_model_response: unknown }>(
    join(backup, "answer_key_entries.jsonl")
  ).map((k) => [k.question_id, k.raw_model_response])
);

const SPAN = /\\\(([\s\S]*?)\\\)/g;
const prose = (t: string) => t.replace(SPAN, " ");
const LETTER_PATTERNS: [RegExp, string][] = [
  [/\b(?:choice|choices|option|options)\s*\(?[A-D]\)?(?![A-Za-z])/i, "names a choice by letter"],
  [/\banswer\s*(?:is\s*)?\(?[A-D]\)?(?![A-Za-z'’])/, "names the answer by letter"],
  [/\(\s*[A-D]\s*\)/, "a letter in brackets"],
  [/^\s*[A-D][.):]\s/m, "a line that starts with a letter"],
  [
    /\b[A-D]\s+(?:is|was|would be)\s+(?:correct|incorrect|wrong|right|the answer)/,
    "a letter judged",
  ],
];

/** Lowercase, no math delimiters, no spaces, plain quotes and minus: for "does it mention it" checks. */
function norm(t: string): string {
  return t
    .replace(/\[\[\/?[ui]\]\]|<\/?[ui]>/g, "")
    .replace(/\{,\}/g, ",")
    .replace(/\\([%$&#])/g, "$1")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\\(|\\\)|\$/g, "")
    .replace(/\\left|\\right|\\,|\\!|\\;|\\displaystyle/g, "")
    .replace(/\\dfrac|\\tfrac/g, "\\frac")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[−–—]/g, "-")
    .replace(/…/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/[.,;:!?"]+$/g, "");
}
const numbers = (t: string): string[] => norm(t).match(/\d+(?:\.\d+)?/g) ?? [];
function mentions(text: string, choice: string): boolean {
  const t = norm(text);
  const c = norm(choice).replace(/^"|"$/g, "");
  if (!c) return true;
  if (t.includes(c)) return true;
  // a long choice may be quoted by its opening words
  if (c.length > 40 && t.includes(c.slice(0, 18))) return true;
  // a math choice may be retypeset (√ as \sqrt, · as \cdot): one line holds all its numbers
  const want = numbers(choice);
  return (
    want.length > 0 &&
    text.split("\n").some((line) => {
      const have = numbers(line);
      return want.every((n) => have.includes(n));
    })
  );
}
function latexToValue(latex: string): string | null {
  let v = latex.trim();
  if (v.includes("=")) v = v.split("=").pop()!.trim();
  v = v
    .replace(/\\left|\\right|\\,|\\!/g, "")
    .replace(/\\[dt]?frac\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}/g, "$1/$2")
    .replace(/\{,\}/g, "")
    .replace(/[−]/g, "-")
    .replace(/\s+/g, "")
    .replace(/^\((.*)\)$/, "$1");
  return /^-?(?:\d+\.?\d*|\.\d+)(?:\/\d+)?$/.test(v) ? v : null;
}

function problemsOf(f: Final): string[] {
  const out: string[] = [];
  const row = rows.get(f.id);
  if (!row) return ["the question is not in the backup"];
  const text = f.explanation ?? "";
  const hint = f.hint ?? "";
  const n = text.trim().length;
  if (n < 300) out.push(`explanation too short (${n})`);
  if (n > 3400) out.push(`explanation too long (${n})`);
  if (hint.trim().length < 15 || hint.length > 220) out.push(`hint length ${hint.length}`);
  if (/\n/.test(hint.trim())) out.push("hint is more than one line");
  for (const [label, t] of [
    ["explanation", text],
    ["hint", hint],
  ] as const) {
    if (/–/.test(t)) out.push(`${label}: en dash`);
    if (/�|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(t)) out.push(`${label}: bad character`);
    if (/--/.test(prose(t))) out.push(`${label}: two hyphens in a row`);
    if (/\\\[|\\\]|\$\$/.test(t)) out.push(`${label}: display math`);
    if (/\$/.test(prose(t))) out.push(`${label}: a $ outside math`);
    if (/\*\*|`|^#{1,6}\s/m.test(t)) out.push(`${label}: Markdown`);
    if (/<\/?[a-z][^>]*>|\[\[\/?[ui]\]\]/i.test(t)) out.push(`${label}: HTML or display marker`);
    const opens = (t.match(/\\\(/g) ?? []).length;
    const closes = (t.match(/\\\)/g) ?? []).length;
    if (opens !== closes) out.push(`${label}: unbalanced \\( \\)`);
    for (const seg of splitMathText(t, false, true, true)) {
      if (seg.kind === "text") continue;
      try {
        katex.renderToString(seg.latex, { throwOnError: true, strict: "ignore" });
      } catch (e) {
        out.push(
          `${label}: KaTeX cannot draw "${seg.latex.slice(0, 40)}": ${(e as Error).message.slice(0, 60)}`
        );
      }
    }
    for (const [re, why] of LETTER_PATTERNS) if (re.test(prose(t))) out.push(`${label}: ${why}`);
  }

  const stated = [...text.matchAll(/The answer is\s+([^\n]+)/g)].map((m) => m[1]);
  if (stated.length === 0) out.push('no "The answer is ..." sentence');
  const choices = (choicesOf.get(row.id) ?? []).sort((a, b) => a.letter.localeCompare(b.letter));
  const key = String(row.correct_answer).trim().toUpperCase();
  if (row.answer_format === "multiple_choice") {
    const right = choices.find((c) => c.letter === key);
    if (!right) out.push("the key has no choice");
    else if (
      right.choice_text &&
      stated.length &&
      !stated.some((s) => mentions(s, right.choice_text))
    )
      out.push("the stated answer is not the key's words");
    for (const c of choices) {
      if (c.letter === key || !c.choice_text) continue;
      if (!mentions(text, c.choice_text))
        out.push(`wrong choice not named: "${c.choice_text.slice(0, 40)}"`);
    }
    const bullets = (text.match(/^• /gm) ?? []).length;
    if (bullets < choices.length - 1) out.push(`only ${bullets} wrong-choice lines`);
    if (
      right?.choice_text &&
      norm(right.choice_text).length >= 5 &&
      mentions(hint, right.choice_text)
    )
      out.push("the hint gives the right choice's words");
  } else {
    const reviewed = reviewedNumericAnswers(
      row,
      numericAnswerSetFromEvidence(evidenceOf.get(row.id))
    );
    const graded = { ...row, reviewed_numeric_answers: reviewed } as QuizQuestionWithChoices;
    const values = stated.flatMap((s) => {
      // the first clause only ("..., which can be entered as 3/4" repeats it)
      const head = s.split(/,\s*which|;|\(which/)[0];
      const spans = [...head.matchAll(SPAN)].map((m) => latexToValue(m[1]));
      if (spans.length) return spans.filter((v): v is string => v !== null);
      return [...prose(head).matchAll(/[−-]?\d[\d,]*(?:\.\d+)?(?:\/\d+)?/g)].map((m) =>
        m[0].replace(/,/g, "").replace("−", "-")
      );
    });
    if (stated.length && values.length === 0) out.push("the stated answer has no value");
    else if (values.some((v) => !evaluateQuizAnswer(v, graded)))
      out.push(`a stated value is not accepted by the grader (${values.join(", ")})`);
    const answers = [String(row.correct_answer), ...(reviewed ?? [])].map((a) => a.trim());
    const stem = `${row.question_text ?? ""} ${row.passage ?? ""}`;
    for (const a of answers) {
      const plainA = a.replace(/^-/, "");
      if (
        plainA.length >= 2 &&
        new RegExp(`(^|[^\\d.])${plainA.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^\\d]|$)`).test(
          hint
        ) &&
        !stem.includes(plainA)
      )
        out.push("the hint states the answer");
    }
  }
  return [...new Set(out)];
}

const finals = jsonl<Final>(join(work, "results", "explain-final.jsonl"));
const checked = finals.map((f) => {
  const problems = problemsOf(f);
  return { id: f.id, status: f.status, ok: problems.length === 0, problems };
});
writeFileSync(
  join(work, "results", "explain-checked.jsonl"),
  checked.map((c) => JSON.stringify(c)).join("\n") + "\n"
);
const tally: Record<string, number> = {};
for (const c of checked)
  for (const p of c.problems.length ? c.problems : ["ok"]) {
    const k = p.replace(/"[^"]*"/g, '"…"').replace(/\(.*\)/, "(…)");
    tally[k] = (tally[k] ?? 0) + 1;
  }
const ready = checked.filter((c) => c.ok && c.status.startsWith("passed")).length;
console.log(JSON.stringify({ records: checked.length, ready_to_publish: ready, tally }, null, 1));
