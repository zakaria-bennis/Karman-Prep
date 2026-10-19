// Math segment splitter shared by MathText and the transfer classifier (TR-6): $$…$$ blocks,
// $…$ and \(…\) inline math, currency-dollar text and the reviewed serialized function lines.
// Framework-free, so the eager classifier can key items by one whole-text call.

import { currencyDollarDelimiters } from "./currency-dollar-delimiters";
import { parseSerializedFunctionLines } from "./serialized-function-math";

export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string; sourceFunction?: true }
  | { kind: "block"; latex: string };

export function splitMathText(
  text: string,
  serializedFunctionLines: boolean,
  atLineStart: boolean,
  atLineEnd: boolean
): MathSegment[] {
  // Extract $$…$$ first (greedy block), then remaining $…$ inline.
  //
  // Both regexes accept `\$` (escaped dollar) inside the math span
  // — that's how KaTeX writes a literal currency symbol, and the
  // old `[^\$]` class was rejecting it, which truncated every
  // expression containing money (e.g. `$\$80$ is on sale for $25\%$ off`).
  const out: MathSegment[] = [];
  let rest = text;

  // Block pass — greedy [\s\S], OK to leave as-is.
  const blockChunks: { before: string; latex: string }[] = [];
  while (true) {
    const m = rest.match(/\$\$((?:\\\$|[^$])+?)\$\$/);
    if (!m) break;
    blockChunks.push({ before: rest.slice(0, m.index ?? 0), latex: m[1].trim() });
    rest = rest.slice((m.index ?? 0) + m[0].length);
  }
  const segmentsAfterBlock: MathSegment[] = [];
  for (const c of blockChunks) {
    if (c.before) segmentsAfterBlock.push({ kind: "text", value: c.before });
    segmentsAfterBlock.push({ kind: "block", latex: c.latex });
  }
  if (rest) segmentsAfterBlock.push({ kind: "text", value: rest });

  // Explicit source \(…\) delimiters and $…$ use the same KaTeX path.
  // Preserve prose and unmatched delimiters rather than guessing bare commands.
  for (const seg of segmentsAfterBlock) {
    if (seg.kind !== "text") {
      out.push(seg);
      continue;
    }
    const currencyOffsets = currencyDollarDelimiters(seg.value);
    let offset = 0;
    let remaining = seg.value;
    while (true) {
      const m = remaining.match(/\$((?:\\\$|[^$\n])+?)\$|\\\(([\s\S]+?)\\\)/);
      if (!m) break;
      if (
        m[1] !== undefined &&
        (currencyOffsets.has(offset + (m.index ?? 0)) ||
          currencyOffsets.has(offset + (m.index ?? 0) + m[0].length - 1))
      ) {
        // Keep the currency symbol and rescan, so later explicit math survives.
        const consumed = (m.index ?? 0) + 1;
        out.push({ kind: "text", value: remaining.slice(0, consumed) });
        remaining = remaining.slice(consumed);
        offset += consumed;
        continue;
      }
      const before = remaining.slice(0, m.index ?? 0);
      if (before) out.push({ kind: "text", value: before });
      out.push({ kind: "inline", latex: (m[1] ?? m[2]).trim() });
      const consumed = (m.index ?? 0) + m[0].length;
      remaining = remaining.slice(consumed);
      offset += consumed;
    }
    if (remaining) out.push({ kind: "text", value: remaining });
  }

  return serializedFunctionLines
    ? out.flatMap<MathSegment>((seg, index) =>
        seg.kind === "text"
          ? parseSerializedFunctionLines(seg.value, {
              atLineStart: index === 0 && atLineStart,
              atLineEnd: index === out.length - 1 && atLineEnd,
            })
          : [seg]
      )
    : out;
}
