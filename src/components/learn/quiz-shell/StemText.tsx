"use client";
// A reading question's words set like the real test: flowing paragraphs, a notes list, verse line by
// line, "Text 1" and "Text 2" labels, and the question last and apart (src/lib/quiz/stem-layout.ts).
import { useMemo } from "react";
import { layoutStem, readingPart, type StemPart } from "@/lib/quiz/stem-layout";
import MathText from "../MathText";
import styles from "./quiz-shell.module.css";

export function StemText({
  text,
  prompt = true,
  part = "all",
  treatBlankWord = false,
}: {
  text: string;
  /** Split across two panes: the passage ("lead") or the question ("ask"). */
  part?: StemPart;
  /** false for a passage field: it holds no question. */
  prompt?: boolean;
  treatBlankWord?: boolean;
}) {
  const blocks = useMemo(
    () => (prompt ? readingPart(text, part) : layoutStem(text, { prompt: false })),
    [text, prompt, part]
  );
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "label":
            return (
              <p key={i} className={styles.textLabel}>
                {b.text}
              </p>
            );
          case "notes":
            return (
              <ul key={i} className={styles.notes}>
                {b.items.map((item, n) => (
                  <li key={n}>
                    <MathText text={item} treatBlankWord={treatBlankWord} />
                  </li>
                ))}
              </ul>
            );
          case "verse":
            return (
              <p key={i} className={styles.verse}>
                <MathText text={b.text} treatBlankWord={treatBlankWord} />
              </p>
            );
          case "prompt":
            return (
              <h2 key={i} className={styles.prompt}>
                <MathText text={b.text} />
              </h2>
            );
          default:
            return (
              <p key={i} className={styles.para}>
                <MathText text={b.text} treatBlankWord={treatBlankWord} />
              </p>
            );
        }
      })}
    </>
  );
}
