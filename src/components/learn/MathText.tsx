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
// Prose (never math) shows hyphen runs as one em dash and blank-position
// hyphen runs as blanks (dash-blank-display.ts), "- " list lines as bullets
// and space-split compounds joined (hyphen-spacing-display.ts).
// ============================================================

import { Fragment, useMemo, type ReactNode } from "react";
import { CalculatorSourceAction } from "@/components/calculator/CalculatorSourceAction";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseSourceUnderlining } from "./source-underlining";
import { parseSourceItalics } from "./source-italics";
import { splitMathText, type MathSegment } from "./math-segments";
import { blankSegments } from "./dash-blank-display";
import { displayLineHyphens, joinAfterMath } from "./hyphen-spacing-display";

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

/** Fill-in-the-blank markers (patterns in dash-blank-display.ts):
 *    Underscores:       `__`, `_____`, `_ _ _`   (universal — always replaced)
 *    Composite marker:  `_____blank`, `______ blank` (one blank, not visible prose)
 *    Hyphen blank:      ` ------ ` (5+ hyphens with space or edge on both sides)
 *    Word "blank":      `blank`, `_blank_`,
 *                       `-blank-`, `__blank__`  (passage-only — opt-in)
 *
 *  Lookarounds keep "blanket", "unblanked" and "var_name" untouched; URLs and
 *  `code` keep their underscores.
 *
 *  Each marker becomes one fixed-width continuous underline at the baseline.
 *  Width is uniform — what matters is that the blank reads as one clean line,
 *  not a string of dashes or the literal word. Text between blanks gets the
 *  dash display (hyphen runs as "—"). */
function renderTextWithBlanks(text: string, segKey: number, treatBlankWord: boolean): ReactNode {
  const segments = blankSegments(text, treatBlankWord);
  if (segments.length === 1 && !segments[0].isBlank) return segments[0].value; // hot path
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
      parseSourceUnderlining(displayLineHyphens(text)).map((run, index, sourceRuns) => ({
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
      if (s.kind === "text") {
        const value = segs[i - 1]?.kind === "inline" ? joinAfterMath(s.value) : s.value;
        return <span key={i}>{renderTextWithBlanks(value, i, treatBlankWord)}</span>;
      }
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
