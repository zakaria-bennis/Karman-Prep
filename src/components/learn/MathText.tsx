"use client";

// ============================================================
// MathText — lightweight inline renderer that handles $…$ and $$…$$
// KaTeX math inside a plain text string. Preserves line breaks.
// Use for short bodies (question text, choice labels, one-liner prompts).
// ============================================================

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  className?: string;
  blockClassName?: string;
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

export default function MathText({ text, className = "", blockClassName = "" }: Props) {
  const segs = useMemo(() => parse(text), [text]);

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segs.map((s, i) => {
        if (s.kind === "text") return <span key={i}>{s.value}</span>;
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
