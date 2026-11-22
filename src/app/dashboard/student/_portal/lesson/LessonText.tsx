"use client";

// A lesson's text with its marks (src/lib/lessons/types.ts): $...$ math drawn by KaTeX, **bold**,
// <u>underlined</u>, <i>italic</i>, and ______ a blank drawn as one clean line. The same marks as the
// quiz engine's, so a question reads the same in a lesson as in a quiz.
import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, useMemo, type ReactNode } from "react";
import styles from "./lesson.module.css";

type Run = { kind: "text" | "math" | "blank"; value: string; b: boolean; u: boolean; i: boolean };

const TOKEN = /(\$[^$]+\$)|(\*\*)|(<\/?u>)|(<\/?i>)|(_{3,})/g;

/** Splits text into runs of plain text, math and blanks, each carrying its bold, underline and italic. */
export function runsOf(text: string): Run[] {
  const runs: Run[] = [];
  let b = false;
  let u = false;
  let i = false;
  let at = 0;
  const push = (kind: Run["kind"], value: string) => value && runs.push({ kind, value, b, u, i });
  for (const m of text.matchAll(TOKEN)) {
    push("text", text.slice(at, m.index));
    at = m.index! + m[0].length;
    if (m[1]) push("math", m[1].slice(1, -1));
    else if (m[2]) b = !b;
    else if (m[3]) u = m[3] === "<u>";
    else if (m[4]) i = m[4] === "<i>";
    else push("blank", m[5]);
  }
  push("text", text.slice(at));
  return runs;
}

function tex(value: string, display: boolean): string {
  return katex.renderToString(display ? `\\displaystyle ${value}` : value, {
    throwOnError: false,
    output: "htmlAndMathml",
  });
}

/** Plain words for a screen reader or a caption: math as written, marks dropped. */
export function plainOf(text: string): string {
  return runsOf(text)
    .map((r) => (r.kind === "blank" ? "blank" : r.value))
    .join("");
}

/** `display` sets fractions full size (for rules and worked steps), still inline with the words. */
export function LessonText({
  text,
  as = "span",
  display = false,
}: {
  text: string;
  as?: "span" | "p";
  display?: boolean;
}) {
  const runs = useMemo(() => runsOf(text), [text]);
  const body = runs.map((r, k) => {
    let node: ReactNode =
      r.kind === "math" ? (
        <span className={styles.math} dangerouslySetInnerHTML={{ __html: tex(r.value, display) }} />
      ) : r.kind === "blank" ? (
        <span className={styles.blank} role="img" aria-label="blank" />
      ) : (
        r.value
      );
    if (r.i) node = <i>{node}</i>;
    if (r.u) node = <u className={styles.under}>{node}</u>;
    if (r.b) node = <b>{node}</b>;
    return <Fragment key={k}>{node}</Fragment>;
  });
  return as === "p" ? <p>{body}</p> : <span>{body}</span>;
}
