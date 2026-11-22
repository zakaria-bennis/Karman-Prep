/*
 * From a template and a seed to a finished, checked Math question. The builder draws, asks the
 * template for a Draft, then refuses it (and draws again, up to MAX_ATTEMPTS) unless:
 * - the independent check accepts the answer and rejects every chosen wrong choice;
 * - the four choices read differently and are different values;
 * - a typed answer fits the SAT's answer box and grades as the key;
 * - every text renders in KaTeX and reads cleanly (render.ts);
 * - the figure, when there is one, passes the figure engine's parser and checks;
 * - the difficulty sits inside the template's range.
 * The explanation is put together here in the founder's "full teaching" shape (2026-11-19):
 * what it asks, numbered steps, a check, every wrong choice by its words (never its letter),
 * and a tip. Nothing here touches the database.
 */
import { checkSpec } from "@/lib/figures/engine/checks";
import { parseFigureSpec } from "@/lib/figures/engine/spec";
import { parseNumericAnswer } from "@/lib/numeric-answer";
import { F, Frac } from "./frac";
import { renderIssues } from "./render";
import { rngFor, type Rng } from "./rng";
import { Sym } from "./sym";
import type { Answer, Draft, Format, Letter, MathItem, Slip, Template } from "./types";

export const MAX_ATTEMPTS = 40;
const LETTERS: Letter[] = ["A", "B", "C", "D"];
/** About a quarter of real SAT Math questions are typed answers (the bank: 1,179 of 4,418). */
const SPR_SHARE = 0.27;

/** Thrown by a template (or a helper) to ask for new draws. */
export class Retry extends Error {
  constructor(reason = "draw again") {
    super(reason);
  }
}

/** Asserts a condition while drawing; a false condition means draw again. */
export function need(condition: unknown, reason = "constraint not met"): asserts condition {
  if (!condition) throw new Retry(reason);
}

/** A numeric answer: its MathText and its exact value. */
export function numAnswer(value: Sym | Frac | number, text: string): Answer {
  return { text, value: value instanceof Sym ? value : Sym.rat(F(value)) };
}

/** Two answers are the same value (numbers), the same expression (at sample points) or the same key. */
export function sameAnswer(a: Answer, b: Answer, points = EXPR_POINTS): boolean {
  if (a.value && b.value) return a.value.eq(b.value);
  if (a.expr && b.expr) return points.every((p) => close(a.expr!(p), b.expr!(p)));
  if (a.key !== undefined && b.key !== undefined) return a.key === b.key;
  return normal(a.text) === normal(b.text);
}

const close = (x: number, y: number) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

/** Sample points for comparing expressions: odd values unlikely to hit a special case. */
export const EXPR_POINTS: Readonly<Record<string, number>>[] = [
  {
    x: 1.37,
    y: -0.61,
    a: 2.13,
    b: -1.29,
    t: 0.77,
    n: 3.41,
    k: 1.93,
    p: 0.41,
    r: 2.71,
    h: 1.11,
    w: 0.93,
    c: -2.3,
    m: 1.61,
    s: 0.53,
    z: -1.47,
    u: 2.37,
    v: -0.83,
    q: 1.19,
  },
  {
    x: -2.71,
    y: 1.83,
    a: -0.47,
    b: 3.07,
    t: 2.29,
    n: -1.13,
    k: 0.67,
    p: 2.53,
    r: -1.79,
    h: -2.41,
    w: 1.37,
    c: 0.89,
    m: -0.73,
    s: 2.17,
    z: 0.31,
    u: -1.07,
    v: 1.71,
    q: -2.19,
  },
  {
    x: 0.53,
    y: 2.97,
    a: 1.71,
    b: 0.83,
    t: -1.37,
    n: 2.21,
    k: -2.03,
    p: -0.91,
    r: 0.47,
    h: 3.13,
    w: -1.67,
    c: 1.43,
    m: 2.89,
    s: -0.37,
    z: 1.97,
    u: 0.61,
    v: -2.47,
    q: 0.79,
  },
  {
    x: 3.19,
    y: -2.23,
    a: -1.97,
    b: -0.71,
    t: 0.43,
    n: 0.59,
    k: 2.81,
    p: 1.27,
    r: 1.63,
    h: -0.53,
    w: 2.41,
    c: -1.21,
    m: -1.89,
    s: 1.07,
    z: -0.67,
    u: 1.49,
    v: 0.37,
    q: 2.63,
  },
  {
    x: -0.89,
    y: 0.71,
    a: 2.83,
    b: 1.49,
    t: -2.61,
    n: -2.67,
    k: -1.41,
    p: -1.73,
    r: -2.93,
    h: 0.81,
    w: -0.47,
    c: 2.59,
    m: 0.23,
    s: -2.83,
    z: 2.43,
    u: -2.79,
    v: 2.91,
    q: -1.53,
  },
];

const normal = (text: string) => text.replace(/\s+/g, "").toLowerCase();

/** How a value's typed answer is stored: "3/4", "-2.5", "12". */
export function sprKeyOf(value: Sym): string {
  const q = value.asRat();
  if (!q) throw new Retry("a typed answer must be a rational number");
  if (q.isInt()) return String(q.n);
  // The SAT box takes 5 characters (6 with a minus sign); prefer the fraction when it fits.
  const fraction = q.toString();
  if (fraction.length <= (q.n < 0 ? 6 : 5)) return fraction;
  if (q.terminates()) {
    const decimal = q.toDecimal().replace(/^(-?)0\./, "$1.");
    if (decimal.length <= (q.n < 0 ? 6 : 5)) return decimal;
  }
  throw new Retry("typed answer does not fit the answer box");
}

/** The SAT accepts a typed answer of at most 5 characters (6 with a minus sign). */
function fitsAnswerBox(key: string): boolean {
  const limit = key.startsWith("-") ? 6 : 5;
  return key.length <= limit && parseNumericAnswer(key) !== null;
}

function chooseFormat(template: Template, rng: Rng): Format {
  if (template.formats.length === 1) return template.formats[0];
  return rng.bool(SPR_SHARE) ? "spr" : "mc";
}

const sentence = (text: string) => {
  const t = text.trim();
  const capital = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.?!]$/.test(capital) ? capital : `${capital}.`;
};

/** A clause after a label's colon: a lower-case first letter (unless it starts a name), one period. */
const clause = (text: string) => {
  const t = sentence(text);
  return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/** The founder's full-teaching explanation, in plain text with $...$ math. */
export function composeExplanation(draft: Draft, wrong: Slip[], key: string | null): string {
  const lines: string[] = [];
  lines.push(`What it asks: ${sentence(draft.asks).replace(/^./, (c) => c.toLowerCase())}`);
  lines.push("");
  draft.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${sentence(step.label).replace(/\.$/, "")}: ${clause(step.work)}`);
  });
  if (key && /\//.test(key)) {
    const q = Frac.parse(key);
    const decimal = q.terminates() ? q.toDecimal().replace(/^(-?)0\./, "$1.") : null;
    const fits = decimal && decimal.length <= (q.n < 0 ? 6 : 5);
    lines.push(
      fits
        ? `You can enter ${key} or ${decimal}.`
        : `You can enter ${key}, or a decimal that fills the box (${truncated(q)} or ${rounded(q)}).`
    );
  }
  lines.push("");
  lines.push(`Check: ${clause(draft.check)}`);
  if (wrong.length) {
    lines.push("");
    lines.push(draft.format === "mc" ? "Why the other answers are wrong:" : "Watch out:");
    for (const slip of wrong) {
      lines.push(
        draft.format === "mc"
          ? `- ${slip.text}: ${clause(slip.why)}`
          : `- If you get ${slip.text}, ${slip.why.trim().replace(/\.$/, "")}.`
      );
    }
  }
  lines.push("");
  lines.push(`Tip: ${sentence(draft.tip).replace(/^./, (c) => c.toUpperCase())}`);
  return lines.join("\n");
}

function truncated(q: Frac): string {
  const limit = q.n < 0 ? 6 : 5;
  const value = q.toNumber();
  const whole = Math.trunc(Math.abs(value));
  const head = `${q.n < 0 ? "-" : ""}${whole === 0 ? "" : whole}.`;
  const places = limit - head.length;
  const digits = Math.floor((Math.abs(value) - whole) * 10 ** places);
  return `${head}${String(digits).padStart(places, "0")}`;
}

function rounded(q: Frac): string {
  const limit = q.n < 0 ? 6 : 5;
  const value = q.toNumber();
  const whole = Math.trunc(Math.abs(value));
  const head = `${q.n < 0 ? "-" : ""}${whole === 0 ? "" : whole}.`;
  const places = limit - head.length;
  const digits = Math.round((Math.abs(value) - whole) * 10 ** places);
  if (digits >= 10 ** places) return truncated(q);
  return `${head}${String(digits).padStart(places, "0")}`;
}

/** Numeric choices read best in order of size, as the SAT prints them. */
function displayOrder(answers: Answer[], rng: Rng): Answer[] {
  if (answers.every((a) => a.value)) {
    const ascending = [...answers].sort((a, b) => a.value!.toNumber() - b.value!.toNumber());
    return rng.bool(0.85) ? ascending : ascending.reverse();
  }
  return rng.shuffle(answers);
}

export interface BuildFailure {
  templateId: string;
  seed: number;
  reasons: string[];
}

function failures(draft: Draft, template: Template): string[] {
  const out: string[] = [];
  const [lo, hi] = template.difficulty;
  if (!Number.isInteger(draft.difficulty) || draft.difficulty < lo || draft.difficulty > hi) {
    out.push(`difficulty ${draft.difficulty} outside ${lo}-${hi}`);
  }
  if (!draft.steps.length) out.push("no steps");
  for (const step of draft.steps) {
    const words = step.label.trim().split(/\s+/).length;
    if (words < 1 || words > 8) out.push(`step label "${step.label}" is not 1 to 8 words`);
  }
  if (draft.answer.value && !Number.isFinite(draft.answer.value.toNumber())) {
    out.push("answer value is not finite");
  }
  return out;
}

/** One finished item, or the reasons every attempt failed. */
export function buildItem(template: Template, seed: number): MathItem | BuildFailure {
  const reasons: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = rngFor(template.id, seed, attempt);
    let draft: Draft;
    const format = chooseFormat(template, rng);
    try {
      draft = template.make(rng, format);
    } catch (error) {
      if (!(error instanceof Retry) && !(error instanceof RangeError)) {
        reasons.push(
          `attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      continue;
    }
    const problems = failures(draft, template);
    if (draft.format !== format) problems.push(`asked for ${format}, made ${draft.format}`);
    if (!draft.isCorrect(draft.answer)) problems.push("the check rejects the answer");

    let choices: MathItem["choices"] = [];
    let key: string;
    let wrong: Slip[] = [];
    if (draft.format === "mc") {
      const picked: Slip[] = [];
      for (const slip of draft.slips) {
        if (picked.length === 3) break;
        if (draft.isCorrect(slip)) continue;
        if (sameAnswer(slip, draft.answer) || normal(slip.text) === normal(draft.answer.text))
          continue;
        if (picked.some((p) => sameAnswer(p, slip) || normal(p.text) === normal(slip.text)))
          continue;
        picked.push(slip);
      }
      if (picked.length < 3) {
        problems.push("fewer than three distinct wrong choices");
      } else {
        const ordered = displayOrder([draft.answer, ...picked], rng);
        choices = ordered.map((answer, index) => ({
          letter: LETTERS[index],
          text: answer.text,
          correct: answer === draft.answer,
        }));
        if (choices.filter((c) => c.correct).length !== 1)
          problems.push("not exactly one right choice");
        wrong = ordered.filter((a) => a !== draft.answer) as Slip[];
      }
      key = choices.find((c) => c.correct)?.letter ?? "";
    } else {
      try {
        key = draft.key ?? (draft.answer.value ? sprKeyOf(draft.answer.value) : "");
      } catch {
        key = "";
      }
      if (!key || !fitsAnswerBox(key)) problems.push(`typed answer "${key}" does not fit the box`);
      else {
        const typed = Sym.rat(Frac.parse(key));
        if (!draft.isCorrect({ text: key, value: typed }))
          problems.push("the check rejects the typed key");
        if (draft.answer.value && !draft.answer.value.eq(typed))
          problems.push("key differs from the answer");
      }
      wrong = draft.slips
        .filter(
          (s, i, all) =>
            !draft.isCorrect(s) &&
            !sameAnswer(s, draft.answer) &&
            all.findIndex((o) => sameAnswer(o, s)) === i
        )
        .slice(0, 2);
    }

    let figure = draft.figure ?? null;
    if (figure) {
      const parsed = parseFigureSpec(figure);
      if (!parsed.ok) problems.push(...parsed.errors.map((e) => `figure: ${e}`));
      else {
        figure = parsed.spec;
        // A generated figure has no printed original, so the transcription comparison
        // (missing_label) does not apply; thinned tick numbers are only cosmetic.
        const issues = checkSpec(parsed.spec, []).filter(
          (issue) => issue.code !== "missing_label" && issue.code !== "crowded_ticks"
        );
        problems.push(...issues.map((issue) => `figure check: ${issue.code}: ${issue.detail}`));
      }
    }

    const explanation = composeExplanation(draft, wrong, draft.format === "spr" ? key : null);
    const texts = [draft.stem, explanation, draft.hint, ...choices.map((c) => c.text)];
    for (const text of texts) {
      for (const issue of renderIssues(text))
        problems.push(`render: ${issue.problem} in "${issue.text}"`);
    }
    // Explanations name choices by their words, never by letter, so shuffled choices still read right.
    if (/\b(choice|option|answer) [ABCD]\b|\([ABCD]\)/i.test(explanation)) {
      problems.push("explanation names a choice by letter");
    }

    if (problems.length === 0) {
      return {
        templateId: template.id,
        skill: template.skill,
        seed,
        attempt,
        format: draft.format,
        stem: draft.stem,
        figure,
        choices,
        key,
        explanation,
        hint: draft.hint,
        difficulty: draft.difficulty,
        checks: [
          "independent-check",
          draft.format === "mc" ? "one-right-three-distinct-wrong" : "typed-key-fits-and-grades",
          "katex-render",
          ...(figure ? ["figure-engine"] : []),
          "difficulty-range",
        ],
      };
    }
    reasons.push(`attempt ${attempt}: ${problems.join("; ")}`);
  }
  return { templateId: template.id, seed, reasons };
}

export function isItem(result: MathItem | BuildFailure): result is MathItem {
  return (result as MathItem).stem !== undefined;
}
