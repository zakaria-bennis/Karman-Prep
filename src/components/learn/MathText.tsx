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
  // Extract $$…$$ first (greedy block), then remaining $…$ inline
  const out: Seg[] = [];
  let rest = text;

  // Block pass
  const blockChunks: { before: string; latex: string }[] = [];
  while (true) {
    const m = rest.match(/\$\$([\s\S]+?)\$\$/);
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

  // Inline pass on each text segment
  for (const seg of segmentsAfterBlock) {
    if (seg.kind !== "text") { out.push(seg); continue; }
    let remaining = seg.value;
    while (true) {
      const m = remaining.match(/\$([^\$\n]+?)\$/);
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
          return (
            <span
              key={i}
              className="inline-block align-middle"
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
