// How a reading question's words are laid out on the quiz screen (founder, 2026-11-26: "the layout
// of the passages, question and little excerpt" should be cleaner). The bank's text came from PDFs and
// test sites, so it carries their line breaks: a sentence broken across lines ("Rev. Amos\nBarton"),
// notes as "•" or "- " lines, and sometimes the question asked before the passage. This turns one
// stored string into blocks the screen can set like the real test: paragraphs that flow, a notes
// list, verse kept line by line, "Text 1" and "Text 2" labels, and the question last.
// Display only: the stored text is never changed.

export type StemBlock =
  | { kind: "prose"; text: string }
  | { kind: "verse"; text: string }
  | { kind: "notes"; items: string[] }
  | { kind: "label"; text: string }
  | { kind: "prompt"; text: string };

const BULLET = /^\s*(?:[•●▪◦·]|[-–*](?=\s))\s*/;
const LABEL = /^Text\s*[12]$/i;
// The question itself: it asks something, or tells the student what to choose.
const PROMPT =
  /\?\s*$|^(?:Which choice|Which quotation|Which finding|Which statement|What is|What does|What choice|Based on the text|According to the text|The student wants)/i;

/** One paragraph's lines joined into flowing prose: a break the PDF put mid-sentence becomes a space. */
export function unwrapProse(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  // A dash split across the break ("distinction --" / "- why") closes up, so it reads as one dash.
  return lines
    .reduce(
      (out, line) =>
        out && (/[-–—]$/.test(out) || /^[-–—]/.test(line))
          ? `${out}${line}`
          : out
            ? `${out} ${line}`
            : line,
      ""
    )
    .replace(/[ \t]{2,}/g, " ");
}

/** Lines meant to stay lines: a poem or song, set as the source set it. */
function isVerse(lines: string[], wholeText: string): boolean {
  if (lines.length < 2) return false;
  const saysVerse = /\b(poem|poetry|verse|song|lyrics|sonnet|ode|ballad|stanza)\b/i.test(wholeText);
  if (!saysVerse) return false;
  // Hard-wrapped prose fills its lines; verse lines are short or start with a capital.
  const short = lines.filter((l) => l.trim().length < 60).length;
  const capital = lines.filter((l) => /^[“"'(]?[A-Z]/.test(l.trim())).length;
  return short / lines.length >= 0.5 || capital / lines.length >= 0.75;
}

function blocksOfParagraph(para: string, wholeText: string): StemBlock[] {
  const lines = para.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const out: StemBlock[] = [];
  // A "Text 1" label on its own line, then that text.
  if (LABEL.test(lines[0].trim())) {
    out.push({ kind: "label", text: lines[0].trim().replace(/^Text\s*/i, "Text ") });
    lines.shift();
    if (!lines.length) return out;
  }
  // The intro line ("The following text is from ...") run straight into a poem's lines: apart.
  if (
    lines.length > 2 &&
    /^(?:The following text|This text is|Text\s*[12] is)/i.test(lines[0].trim()) &&
    /[.:”"’]$/.test(lines[0].trim()) &&
    isVerse(lines.slice(1), wholeText)
  ) {
    out.push({ kind: "prose", text: lines[0].trim() });
    out.push({
      kind: "verse",
      text: lines
        .slice(1)
        .map((l) => l.trimEnd())
        .join("\n"),
    });
    return out;
  }
  const firstBullet = lines.findIndex((l) => BULLET.test(l));
  if (firstBullet >= 0 && lines.slice(firstBullet).filter((l) => BULLET.test(l)).length >= 2) {
    // Notes: a lead line or two ("...taken the following notes:"), the items, then anything after
    // the last item (a question run on without a blank line).
    if (firstBullet > 0)
      out.push(...blocksOfParagraph(lines.slice(0, firstBullet).join("\n"), wholeText));
    const items: string[] = [];
    let i = firstBullet;
    for (; i < lines.length; i++) {
      if (BULLET.test(lines[i])) items.push(lines[i].replace(BULLET, "").trim());
      else if (/^[a-z(]/.test(lines[i].trim()) && items.length)
        items[items.length - 1] += ` ${lines[i].trim()}`; // an item wrapped onto a second line
      else break;
    }
    out.push({ kind: "notes", items });
    if (i < lines.length) out.push(...blocksOfParagraph(lines.slice(i).join("\n"), wholeText));
    return out;
  }
  if (isVerse(lines, wholeText)) {
    out.push({ kind: "verse", text: lines.map((l) => l.trimEnd()).join("\n") });
    return out;
  }
  // A question run onto the passage's last line without a blank line: give it its own block.
  const last = lines[lines.length - 1].trim();
  if (lines.length > 1 && PROMPT.test(last) && /[.!”"’)]$/.test(lines[lines.length - 2].trim())) {
    out.push({ kind: "prose", text: unwrapProse(lines.slice(0, -1).join("\n")) });
    out.push({ kind: "prose", text: last });
    return out;
  }
  out.push({ kind: "prose", text: unwrapProse(lines.join("\n")) });
  return out;
}

/** A reading question's stored words as blocks to set. The question is marked and placed last;
 *  a passage field (`prompt: false`) has no question to find. */
export function layoutStem(text: string, { prompt: findPrompt = true } = {}): StemBlock[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  const blocks = clean.split(/\n[ \t]*\n+/).flatMap((p) => blocksOfParagraph(p, clean));
  if (!findPrompt) return blocks;
  // The question is the last prose block that asks; when the source put it first, it moves last.
  const proseIdx = blocks
    .map((b, i) => (b.kind === "prose" && PROMPT.test(b.text) ? i : -1))
    .filter((i) => i >= 0);
  if (!proseIdx.length) return blocks;
  const at = proseIdx[proseIdx.length - 1] === blocks.length - 1 ? blocks.length - 1 : proseIdx[0];
  const prompt: StemBlock = { kind: "prompt", text: (blocks[at] as { text: string }).text };
  const rest = blocks.filter((_, i) => i !== at);
  // Only a question that opens the text moves; one in the middle (rare) keeps its place.
  if (at === 0 || at === blocks.length - 1) return [...rest, prompt];
  return blocks.map((b, i) => (i === at ? prompt : b));
}

/** Math stems keep their lines (equations sit on their own), but a sentence the PDF broke between
 *  two words is joined. Same length as the source, so nothing that counts characters moves. */
export function unwrapMathProse(text: string): string {
  // Only word to word: "According\nto". A line that ends in math ("37x") or a next line that starts
  // with a variable ("y = ...") stays its own line.
  return text.replace(/(^|[\s(])([A-Za-z]{2,}[,;]?)\n(?=[a-z]{2,}[\s,.;:?])/g, "$1$2 ");
}

/** Which part of a question's words a pane shows when the question is split across two panes of
 *  glass (founder, 2026-11-26): the passage or setup on the left ("lead"), the question on the
 *  right ("ask"), or all of it in one pane. */
export type StemPart = "all" | "lead" | "ask";

/** A reading question's blocks for one part. Without a question to split off, "lead" is empty. */
export function readingPart(text: string, part: StemPart): StemBlock[] {
  const blocks = layoutStem(text);
  if (part === "all") return blocks;
  const hasPrompt = blocks.at(-1)?.kind === "prompt";
  if (part === "ask") return hasPrompt ? blocks.slice(-1) : blocks;
  return hasPrompt ? blocks.slice(0, -1) : [];
}

// About how many characters fill one line of the question column on a wide screen.
const LINE_CHARS = 85;

/** A math question's setup and its question, when it runs to three lines or more; null when it
 *  fits in one pane (founder, 2026-11-26: "less than three lines long ... all in one pane"). The
 *  question is the last sentence or line; everything before it is the setup. */
export function splitMathStem(text: string): { lead: string; ask: string } | null {
  const clean = unwrapMathProse(text.replace(/\r\n?/g, "\n")).trim();
  const lines = clean
    .split("\n")
    .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / LINE_CHARS)), 0);
  if (lines < 3) return null;
  // the last line break, or the last ". " before a capital, whichever is later
  const lastBreak = clean.lastIndexOf("\n");
  let lastSentence = -1;
  for (const m of clean.matchAll(/[.!?](?:\\\))?\s+(?=[A-Z])/g))
    lastSentence = m.index + m[0].length;
  const cut = Math.max(lastBreak + 1, lastSentence);
  if (cut <= 0) return null;
  const lead = clean.slice(0, cut).trim();
  const ask = clean.slice(cut).trim();
  return lead && ask ? { lead, ask } : null;
}
