"use client";

// ============================================================
// MathText — lightweight inline renderer that handles $…$ and $$…$$
// KaTeX math inside a plain text string. Preserves line breaks.
// Use for short bodies (question text, choice labels, one-liner prompts).
//
// Also renders fill-in-the-blank markers — runs of 2+ underscores in
// the source text become a single continuous underline at the baseline
// instead of the dashed-looking sequence of `_` glyphs most fonts
// produce. SAT R&W and Conventions questions rely on this.
// ============================================================

import { Fragment, useMemo, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  className?: string;
  blockClassName?: string;
  /** When true, also treat the literal word "blank" (alone or wrapped
   *  in `_` / `-` chars) as a fill-in-the-blank marker. Default false
   *  — the word "blank" is a perfectly normal English word in question
   *  stems and answer choices, so we only enable this on passages,
   *  where authors use it as a placeholder. */
  treatBlankWord?: boolean;
}

type Seg =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string }
  | { kind: "block";  latex: string };

function parse(text: string): Seg[] {
  // Extract $$…$$ first (greedy block), then remaining $…$ inline.
  //
  // Both regexes accept `\$` (escaped dollar) inside the math span
  // — that's how KaTeX writes a literal currency symbol, and the
  // old `[^\$]` class was rejecting it, which truncated every
  // expression containing money (e.g. `$\$80$ is on sale for $25\%$ off`).
  const out: Seg[] = [];
  let rest = text;

  // Block pass — greedy [\s\S], OK to leave as-is.
  const blockChunks: { before: string; latex: string }[] = [];
  while (true) {
    const m = rest.match(/\$\$((?:\\\$|[^$])+?)\$\$/);
    if (!m) break;
    blockChunks.push({ before: rest.slice(0, m.index!), latex: m[1].trim() });
    rest = rest.slice((m.index ?? 0) + m[0].length);
  }
  const segmentsAfterBlock: Seg[] = [];
  for (const c of blockChunks) {
    if (c.before) segmentsAfterBlock.push({ kind: "text", value: c.before });
    segmentsAfterBlock.push({ kind: "block", latex: c.latex });
  }
  if (rest) segmentsAfterBlock.push({ kind: "text", value: rest });

  // Inline pass — same fix for `\$`.
  for (const seg of segmentsAfterBlock) {
    if (seg.kind !== "text") { out.push(seg); continue; }
    let remaining = seg.value;
    while (true) {
      const m = remaining.match(/\$((?:\\\$|[^$\n])+?)\$/);
      if (!m) break;
      const before = remaining.slice(0, m.index!);
      if (before) out.push({ kind: "text", value: before });
      out.push({ kind: "inline", latex: m[1].trim() });
      remaining = remaining.slice((m.index ?? 0) + m[0].length);
    }
    if (remaining) out.push({ kind: "text", value: remaining });
  }

  return out;
}

/** Patterns for fill-in-the-blank markers:
 *    Underscores-only:  `__`, `_____`           (universal — always replaced)
 *    Word "blank":      `blank`, `_blank_`,
 *                       `-blank-`, `__blank__`  (passage-only — opt-in)
 *
 *  The lookarounds `(?<!\w) / (?!\w)` prevent matching inside larger
 *  words: "blanket", "unblanked", "var_name" stay untouched. */
const UNDERSCORE_PATTERN = /_{2,}/g;
const BLANK_OR_UNDERSCORE_PATTERN = /_{2,}|(?<!\w)[_-]*blank[_-]*(?!\w)/gi;

/** Replace each blank marker with one fixed-width continuous underline
 *  at the baseline. Width is uniform — what matters is that the blank
 *  reads as one clean line, not a string of dashes or the literal word. */
function renderTextWithBlanks(
  text: string,
  segKey: number,
  treatBlankWord: boolean,
): ReactNode {
  const pattern = treatBlankWord ? BLANK_OR_UNDERSCORE_PATTERN : UNDERSCORE_PATTERN;
  // Walk via matchAll so we get both the matches and the in-between text.
  const segments: { value: string; isBlank: boolean }[] = [];
  let cursor = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index === undefined) continue;
    if (m.index > cursor) {
      segments.push({ value: text.slice(cursor, m.index), isBlank: false });
    }
    segments.push({ value: m[0], isBlank: true });
    cursor = m.index + m[0].length;
  }
  if (segments.length === 0) return text;  // hot path — most segments
  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor), isBlank: false });
  }
  return (
    <>
      {segments.map((s, i) => {
        const key = `${segKey}-${i}`;
        if (s.isBlank) {
          return (
            <span
              key={key}
              aria-label="blank"
              role="presentation"
              style={{
                display: "inline-block",
                width: "4em",
                borderBottom: "0.12em solid currentColor",
                verticalAlign: "baseline",
                margin: "0 0.2em",
              }}
            />
          );
        }
        return s.value ? <Fragment key={key}>{s.value}</Fragment> : null;
      })}
    </>
  );
}

function renderKaTeX(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      output: "htmlAndMathml",
    });
  } catch {
    return displayMode ? `<pre>${latex}</pre>` : latex;
  }
}

export default function MathText({
  text,
  className = "",
  blockClassName = "",
  treatBlankWord = false,
}: Props) {
  const segs = useMemo(() => parse(text), [text]);

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segs.map((s, i) => {
        if (s.kind === "text") return <span key={i}>{renderTextWithBlanks(s.value, i, treatBlankWord)}</span>;
        if (s.kind === "inline") {
          // Baseline alignment + inheriting color/size keeps the
          // math inline with prose. The CSS override on .katex in
          // globals.css does the heavy lifting here.
          return (
            <span
              key={i}
              className="align-baseline"
              dangerouslySetInnerHTML={{ __html: renderKaTeX(s.latex, false) }}
            />
          );
        }
        return (
          <span
            key={i}
            className={`block my-3 text-center ${blockClassName}`}
            dangerouslySetInnerHTML={{ __html: renderKaTeX(s.latex, true) }}
          />
        );
      })}
    </span>
  );
}
