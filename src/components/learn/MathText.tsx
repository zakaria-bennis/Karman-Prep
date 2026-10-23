"use client";

// ============================================================
// MathText — lightweight renderer for $…$, $$…$$ and source \(…\)
// KaTeX math inside a plain text string. Preserves line breaks.
// Use for short bodies (question text, choice labels, one-liner prompts).
//
// Also renders fill-in-the-blank markers — runs of 2+ underscores in
// the source text become a single continuous underline at the baseline
// instead of the dashed-looking sequence of `_` glyphs most fonts
// produce. SAT R&W and Conventions questions rely on this.
//
// Prose (never math) shows a lone "---" or "----" run as one em dash;
// see em-dash-display.ts.
// ============================================================

import { Fragment, useMemo, type ReactNode } from "react";
import { CalculatorSourceAction } from "@/components/calculator/CalculatorSourceAction";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseSourceUnderlining } from "./source-underlining";
import { parseSourceItalics } from "./source-italics";
import { splitMathText, type MathSegment } from "./math-segments";
import { displayEmDashes } from "./em-dash-display";

interface Props {
  text: string;
  calculator?: boolean;
  className?: string;
  blockClassName?: string;
  /** Math stems/choices only: display narrowly specified reviewed serialized math. */
  serializedFunctionLines?: boolean;
  /** When true, also treat the literal word "blank" (alone or wrapped
   *  in `_` / `-` chars) as a fill-in-the-blank marker. Default false
   *  — the word "blank" is a perfectly normal English word in question
   *  stems and answer choices, so we only enable this on passages,
   *  where authors use it as a placeholder. */
  treatBlankWord?: boolean;
}

/** Patterns for fill-in-the-blank markers:
 *    Underscores-only:  `__`, `_____`           (universal — always replaced)
 *    Composite marker: `_____blank`, `__blank__` (one blank, not visible prose)
 *    Word "blank":      `blank`, `_blank_`,
 *                       `-blank-`, `__blank__`  (passage-only — opt-in)
 *
 *  The lookarounds `(?<!\w) / (?!\w)` prevent matching inside larger
 *  words: "blanket", "unblanked", "var_name" stay untouched. */
const UNDERSCORE_PATTERN = /(?<!\w)_{2,}blank_*(?!\w)|_{2,}/gi;
const BLANK_OR_UNDERSCORE_PATTERN = /(?<!\w)[_-]*blank[_-]*(?!\w)|_{2,}/gi;

/** Replace each blank marker with one fixed-width continuous underline
 *  at the baseline. Width is uniform — what matters is that the blank
 *  reads as one clean line, not a string of dashes or the literal word. */
function renderTextWithBlanks(text: string, segKey: number, treatBlankWord: boolean): ReactNode {
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
  if (segments.length === 0) return displayEmDashes(text); // hot path — most segments
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
              role="img"
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
        return s.value ? <Fragment key={key}>{displayEmDashes(s.value)}</Fragment> : null;
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
    const escaped = latex.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return displayMode ? `<pre>${escaped}</pre>` : escaped;
  }
}

export default function MathText({
  text,
  className = "",
  blockClassName = "",
  treatBlankWord = false,
  serializedFunctionLines = false,
  calculator = false,
}: Props) {
  const runs = useMemo(
    () =>
      parseSourceUnderlining(text).map((run, index, sourceRuns) => ({
        ...run,
        italicRuns: parseSourceItalics(run.text).map((italicRun, italicIndex, italicRuns) => ({
          ...italicRun,
          segments: splitMathText(
            italicRun.text,
            serializedFunctionLines,
            italicIndex === 0
              ? index === 0 || sourceRuns[index - 1].text.endsWith("\n")
              : italicRuns[italicIndex - 1].text.endsWith("\n"),
            italicIndex === italicRuns.length - 1
              ? index === sourceRuns.length - 1 || sourceRuns[index + 1].text.startsWith("\n")
              : italicRuns[italicIndex + 1].text.startsWith("\n")
          ),
        })),
      })),
    [text, serializedFunctionLines]
  );
  // Transfer (14): the k-th rendered math segment maps to the k-th non-text segment of the
  // whole-text split, the key classifyStem uses (TR-6). A source marker inside a math delimiter
  // pair can shift later ordinals; the wrapper's run-shift guard then renders nothing.
  const stem = useMemo(() => ({ text, serializedFunctionLines }), [text, serializedFunctionLines]);
  const mathKeys = useMemo(
    () =>
      calculator
        ? splitMathText(text, serializedFunctionLines, true, true).flatMap((s, i) =>
            s.kind === "text" ? [] : [i]
          )
        : [],
    [calculator, text, serializedFunctionLines]
  );
  let mathOrdinal = 0;
  const sourceAction = (latex: string) => (
    <CalculatorSourceAction latex={latex} segmentIndex={mathKeys[mathOrdinal++]} stem={stem} />
  );

  function renderSegments(segs: MathSegment[]) {
    return segs.map((s, i) => {
      if (s.kind === "text")
        return <span key={i}>{renderTextWithBlanks(s.value, i, treatBlankWord)}</span>;
      if (s.kind === "inline") {
        // Baseline alignment + inheriting color/size keeps the
        // math inline with prose. The CSS override on .katex in
        // globals.css does the heavy lifting here.
        return (
          <Fragment key={i}>
            <span
              className={
                s.sourceFunction ? "source-function-math align-baseline" : "align-baseline"
              }
              dangerouslySetInnerHTML={{ __html: renderKaTeX(s.latex, false) }}
            />
            {calculator && sourceAction(s.latex)}
          </Fragment>
        );
      }
      return (
        <Fragment key={i}>
          <span
            className={`my-3 block text-center ${blockClassName}`}
            dangerouslySetInnerHTML={{ __html: renderKaTeX(s.latex, true) }}
          />
          {calculator && sourceAction(s.latex)}
        </Fragment>
      );
    });
  }

  function renderSourceRun(run: (typeof runs)[number]) {
    return run.italicRuns.map((italicRun, index) =>
      italicRun.italic ? (
        <i key={index} style={{ fontStyle: "italic" }}>
          {renderSegments(italicRun.segments)}
        </i>
      ) : (
        <Fragment key={index}>{renderSegments(italicRun.segments)}</Fragment>
      )
    );
  }

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {runs.map((run, index) =>
        run.underlined ? (
          <Fragment key={index}>
            <span className="sr-only">Start of underlined text. </span>
            <u style={{ textUnderlineOffset: "0.16em", textDecorationThickness: "0.075em" }}>
              {renderSourceRun(run)}
            </u>
            <span className="sr-only"> End of underlined text.</span>
          </Fragment>
        ) : (
          <Fragment key={index}>{renderSourceRun(run)}</Fragment>
        )
      )}
    </span>
  );
}
