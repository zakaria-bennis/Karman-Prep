"use client";
import { useEffect, useState } from "react";
import styles from "./pane.module.css";

const KEYS = ["1", "2", "3", "/", "4", "5", "6", ".", "7", "8", "9", "−", "0"];
/** What the SAT takes in a typed answer, said inside the box until typing starts. */
const HINT = "A whole number, a decimal or a fraction, like 3.5 or 7/2";

/** A typed answer for grid-in math: one rounded box. "Your answer" sits inside it and rises to
 *  the top right when the box is used; what may be typed is said inside the box until typing
 *  starts (founder, 2026-11-17). On a phone the box has keys of its own (the numbers, a point, a
 *  minus and the fraction bar, which the phone's number pad lacks), so the phone's keyboard stays
 *  down. */
export function NumericEntry({
  value,
  onChange,
  locked,
  verdict,
}: {
  value: string;
  onChange(v: string): void;
  locked: boolean;
  verdict: "correct" | "wrong" | null;
}) {
  // a phone or a tablet held in the hand: known once the page is in the browser
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const set = () => setTouch(coarse.matches);
    set();
    coarse.addEventListener("change", set);
    return () => coarse.removeEventListener("change", set);
  }, []);
  const type = (key: string) => {
    if (locked) return;
    if (key === "back") return onChange(value.slice(0, -1));
    if (value.length >= 12) return;
    onChange(value + (key === "−" ? "-" : key));
  };
  return (
    <>
      <div
        className={`${styles.numeric} ${verdict === "correct" ? styles.correct : verdict === "wrong" ? styles.wrong : ""}`}
        data-filled={value ? "" : undefined}
      >
        <label htmlFor="quiz-numeric-answer" className={styles.numericLabel}>
          Your answer
        </label>
        <input
          id="quiz-numeric-answer"
          className={styles.numericInput}
          inputMode={touch ? "none" : "decimal"}
          autoComplete="off"
          maxLength={12}
          placeholder={HINT}
          value={value}
          readOnly={locked}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {touch && !locked && (
        <div className={styles.keys} role="group" aria-label="Number keys">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.key}
              aria-label={key === "−" ? "minus" : key === "/" ? "fraction bar" : key}
              // the box keeps the cursor: a key never takes it away
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => type(key)}
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            className={styles.key}
            style={{ gridColumn: "span 3" }}
            aria-label="Delete"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => type("back")}
          >
            ⌫
          </button>
        </div>
      )}
    </>
  );
}
