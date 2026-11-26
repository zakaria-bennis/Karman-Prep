"use client";
import { useMemo } from "react";
import type { StudentQuizQuestion } from "@/types/quiz";
import MathText from "../MathText";
import { raisePowers } from "@/lib/quiz/tidy-math";
import { layoutExplanation, type ExplanationBlock } from "@/lib/quiz/explanation-layout";
import styles from "./explanation.module.css";

const t = (s: string) => raisePowers(s);

/** TeX with no delimiters of its own (what a boxed answer holds), so it needs a pair. */
const bareTex = (s: string) => /[\\^_{}]/.test(s) && !/\\\(|\$/.test(s);

/** "the value of r…" opens with a capital once it stands alone under its title. */
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The answer a block names, in words: a letter becomes its choice's words when the question has
 *  them ("A" → "Contrasting"); a typed answer stays as written. */
function answerWords(q: StudentQuizQuestion, letter: string | undefined) {
  if (!letter) return null;
  return q.answer_choices.find((c) => c.letter === letter)?.choice_text ?? null;
}

function Block({ b, q }: { b: ExplanationBlock; q: StudentQuizQuestion }) {
  switch (b.kind) {
    case "heading":
      return <h4 className={styles.heading}>{b.text}</h4>;
    case "asks":
      return (
        <>
          <h4 className={styles.heading}>Question</h4>
          <p className={styles.asks}>
            <MathText text={t(capital(b.text))} />
          </p>
        </>
      );
    case "para":
      return (
        <p className={styles.para}>
          <MathText text={t(b.text)} />
        </p>
      );
    case "math":
      return (
        <div className={styles.math}>
          <MathText text={`$$${b.tex}$$`} />
        </div>
      );
    case "steps":
      return (
        <ol className={styles.steps}>
          {b.items.map((s, i) => (
            <li key={i}>
              <MathText text={t(s)} />
            </li>
          ))}
        </ol>
      );
    case "bullets":
      return (
        <ul className={styles.bullets}>
          {b.items.map((s, i) => (
            <li key={i}>
              <MathText text={t(s)} />
            </li>
          ))}
        </ul>
      );
    case "choices":
      return (
        <ul className={styles.choices}>
          {b.items.map((c, i) => {
            const letter = /^[A-D]$/.test(c.choice) ? c.choice : null;
            return (
              <li key={i}>
                {letter ? (
                  <span className={styles.letter} aria-label={`Choice ${letter}`}>
                    {letter}
                  </span>
                ) : (
                  <strong className={styles.word}>{c.choice.replace(/[“”"]/g, "")}</strong>
                )}
                <span>
                  <MathText text={t(c.text)} />
                </span>
              </li>
            );
          })}
        </ul>
      );
    case "note":
      return (
        <p className={styles.note}>
          <strong>{b.label}</strong>
          <MathText text={t(b.text)} />
        </p>
      );
    case "answer": {
      const words = answerWords(q, b.letter);
      return (
        <p className={styles.answer}>
          <span className={styles.answerLabel}>Answer</span>
          {b.letter && <span className={styles.letter}>{b.letter}</span>}
          <span className={styles.answerText}>
            {words ? (
              <MathText text={t(words)} />
            ) : b.letter ? null : (
              <MathText text={t(bareTex(b.text) ? `$${b.text}$` : b.text)} />
            )}
          </span>
        </p>
      );
    }
  }
}

/** An explanation's text laid out in parts (explanation-layout.ts). */
export function ExplanationBody({ q, text }: { q: StudentQuizQuestion; text: string }) {
  const blocks = useMemo(() => layoutExplanation(text), [text]);
  return (
    <div className={styles.body}>
      {blocks.map((b, i) => (
        <Block key={i} b={b} q={q} />
      ))}
    </div>
  );
}
