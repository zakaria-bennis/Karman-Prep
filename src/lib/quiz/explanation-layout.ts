// Lays out an explanation's plain text as parts a reader can scan: what the question asks, the
// numbered steps, the answer, why the other choices are wrong, and a closing tip. The bank writes
// explanations in one house shape ("What it asks:", "1. …", "The answer is …", "Why the others are
// wrong:" with "•" lines, "Tip: …"); this reads that shape and also the longer four-part shape
// some outside explanations use ("1) Concept, Simply Restated", "Final Answer" and a boxed answer).
// Anything it does not recognise stays a plain paragraph, so no words are ever dropped.

export type ExplanationBlock =
  | { kind: "asks"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "math"; tex: string }
  | { kind: "steps"; items: string[] }
  | { kind: "bullets"; items: string[] }
  /** Why a choice is wrong (or right): `choice` is its letter or its words as written. */
  | { kind: "choices"; items: { choice: string; text: string }[] }
  | { kind: "note"; label: string; text: string }
  | { kind: "answer"; text: string; letter?: string };

/** Section titles of the four-part shape, put in the quiz's own words (one or two words each). */
const PART_TITLES: [RegExp, string][] = [
  [/^concept/i, "The idea"],
  [/^how to approach/i, "Approach"],
  [/^walkthrough/i, "Steps"],
  [/^recap/i, "Remember"],
];

const NOTE_LABELS: [RegExp, string][] = [
  [/^tip$/i, "Tip"],
  [/^(a )?common (slip|mistake|trap)$/i, "Common slip"],
  [/^(evidence )?check$/i, "Check"],
  [/^note$/i, "Note"],
];

const OTHERS = /^why the other(s| choices| answers)? (are wrong|fail|don['’]t work)\s*:?$/i;

/** "$$ \boxed{\text{A}} $$" or "\boxed{5/9}" → its inside; null when there is no box. */
export function boxedAnswer(s: string): string | null {
  const at = s.lastIndexOf("\\boxed{");
  if (at < 0) return null;
  let depth = 0;
  for (let i = at + 6; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return s.slice(at + 7, i).trim();
  }
  return null;
}

/** The letter a boxed or written answer names, when it names one ("\text{A}", "(B)", "C"). */
function letterOf(answer: string): string | undefined {
  const bare = answer.replace(/\\text\{([^}]*)\}/g, "$1").trim();
  return /^\(?([A-D])\)?(?=$|[\s,.:)])/.exec(bare)?.[1];
}

/** Tidies what a copy from a web page leaves behind: empty "$$$$" lines and runs of blank lines. */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "$$$$" && l.trim() !== "$$")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function partTitle(raw: string): string {
  const t = raw.replace(/\s*[-–—]+\s*the why$/i, "").replace(/\s*\(the why\)$/i, "");
  for (const [re, title] of PART_TITLES) if (re.test(t)) return title;
  return t;
}

export function layoutExplanation(source: string): ExplanationBlock[] {
  const out: ExplanationBlock[] = [];
  const lines = tidy(source).split("\n");
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "para", text: para.join(" ") });
    para = [];
  };
  const last = () => out[out.length - 1];
  const push = <K extends "steps" | "bullets">(kind: K, item: string) => {
    flush();
    const b = last();
    if (b && b.kind === kind) b.items.push(item);
    else out.push({ kind, items: [item] } as ExplanationBlock);
  };
  const pushChoice = (choice: string, text: string) => {
    flush();
    const b = last();
    if (b && b.kind === "choices") b.items.push({ choice, text });
    else out.push({ kind: "choices", items: [{ choice, text }] });
  };
  // after "Why the others are wrong:" (or "Final Answer"), lines name a choice or hold the answer
  let inOthers = false;
  let wantAnswer = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^question type\s*:/i.test(line)) continue; // a label for the writer, not the student
    if (wantAnswer) {
      const boxed = boxedAnswer(line);
      const text = boxed ?? line.replace(/^\$\$|\$\$$/g, "");
      out.push({ kind: "answer", text, letter: letterOf(text) });
      wantAnswer = false;
      continue;
    }
    if (/^final answer\s*:?$/i.test(line)) {
      flush();
      inOthers = false;
      wantAnswer = true;
      continue;
    }
    let m = /^final answer\s*:\s*(.+)$/i.exec(line) ?? /^the answer is\s+(.+?)\.?$/i.exec(line);
    if (m) {
      flush();
      inOthers = false;
      const text = boxedAnswer(m[1]) ?? m[1];
      out.push({ kind: "answer", text, letter: letterOf(text) });
      continue;
    }
    // "1) Concept, Simply Restated": a part's title, alone on its line
    m = /^\d\)\s+(.{3,48})$/.exec(line);
    if (m && !/[.?!]$/.test(m[1])) {
      flush();
      inOthers = false;
      out.push({ kind: "heading", text: partTitle(m[1]) });
      continue;
    }
    if (OTHERS.test(line)) {
      flush();
      inOthers = true;
      out.push({ kind: "heading", text: "Other choices" });
      continue;
    }
    m = /^what it asks\s*:\s*(.+)$/i.exec(line);
    if (m) {
      flush();
      out.push({ kind: "asks", text: m[1] });
      continue;
    }
    m = /^([A-Za-z][A-Za-z ]{1,20}):\s+(.+)$/.exec(line);
    const note = m && NOTE_LABELS.find(([re]) => re.test(m![1].trim()));
    if (m && note) {
      flush();
      inOthers = false;
      out.push({ kind: "note", label: note[1], text: m[2] });
      continue;
    }
    if (/^\$\$[\s\S]+\$\$$/.test(line) && !line.slice(2, -2).includes("$$")) {
      flush();
      out.push({ kind: "math", tex: line.slice(2, -2).trim() });
      continue;
    }
    // a bare equation whose math marks were lost in a copy ("5x+2=5x+10"): show it as math
    if (/=/.test(line) && !/[A-Za-z]{3,}/.test(line) && /^[\w\s+\-−=*/^().,<>≤≥]+$/.test(line)) {
      flush();
      out.push({ kind: "math", tex: line });
      continue;
    }
    m = /^\d+\.\s+(.+)$/.exec(line);
    if (m) {
      push("steps", m[1]);
      continue;
    }
    m = /^[•\-*]\s+(.+)$/.exec(line);
    if (m) {
      // "• “Contrasting”: setting the two…" names the choice it answers
      const named = /^([“"][^”"]+[”"]|[A-D]\b|Choice [A-D]\b)\s*[:,.]\s*(.+)$/.exec(m[1]);
      if (inOthers && named) pushChoice(named[1].replace(/^Choice /, ""), named[2]);
      else push("bullets", m[1]);
      continue;
    }
    // "B. Supplanting means replacing." or "Choice D, melodic, means…" under the others' heading
    m = /^(?:Choice\s+)?([A-D])[.):,]\s+(.+)$/.exec(line);
    if (m && inOthers) {
      pushChoice(m[1], m[2]);
      continue;
    }
    // "Speed: 17.7 miles per hour" then "Conversion: …": a list of givens, one to a line
    if (/^[A-Z][A-Za-z ]{0,24}:\s+\S/.test(line)) {
      flush();
      out.push({ kind: "para", text: line });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}
