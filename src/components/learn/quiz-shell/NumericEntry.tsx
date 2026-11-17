"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./pane.module.css";

/** Where a phone's keys are put: low on the screen, just above the bottom bar (QuizShell). */
export const KEYS_SLOT_ID = "quiz-keys-slot";

/** A phone's dial: three across, the numbers where thumbs expect them. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "/"];
/** What the SAT takes in a typed answer, said inside the box until typing starts. */
const HINT = "A whole number, a decimal or a fraction, like 3.5 or 7/2";
const MOST = 12;

/** Only what an answer can be made of: digits, a point, a fraction bar and a minus (an SAT answer
 *  can be negative). Anything else typed or pasted is dropped. */
export const cleanAnswer = (text: string) =>
  text
    .replace(/−/g, "-")
    .replace(/[^0-9./-]/g, "")
    .slice(0, MOST);

/** A typed answer for grid-in math: one rounded box. "Your answer" sits inside it and rises to
 *  the top right when the box is used; what may be typed is said inside the box until typing
 *  starts (founder, 2026-11-17). On a phone or a tablet the box has keys of its own, low on the
 *  screen where thumbs are, and the device's own keyboard stays down; a desktop types with its
 *  keyboard and shows no keys. */
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
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const set = () => {
      setTouch(coarse.matches);
      setSlot(document.getElementById(KEYS_SLOT_ID));
    };
    set();
    coarse.addEventListener("change", set);
    return () => coarse.removeEventListener("change", set);
  }, []);
  const type = (key: string) => {
    if (locked) return;
    // a short buzz where the device can give one, so a press is felt
    navigator.vibrate?.(8);
    onChange(key === "back" ? value.slice(0, -1) : cleanAnswer(value + key));
  };
  const key = (label: string, name: string, press: string, wide = false) => (
    <button
      key={press}
      type="button"
      className={styles.key}
      data-wide={wide || undefined}
      aria-label={name}
      // the box keeps the cursor: a key never takes it away
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => type(press)}
    >
      {label}
    </button>
  );
  const keys = touch && !locked && (
    <div className={styles.keys} role="group" aria-label="Number keys">
      {KEYS.map((k) => key(k, k === "/" ? "fraction bar" : k === "." ? "point" : k, k))}
      {key("−", "minus", "-")}
      {key("⌫", "Delete", "back", true)}
    </div>
  );
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
          // with keys of its own on screen, the device's keyboard is never called up
          inputMode={touch ? "none" : "decimal"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MOST}
          placeholder={HINT}
          value={value}
          readOnly={locked}
          onChange={(e) => onChange(cleanAnswer(e.target.value))}
        />
      </div>
      {keys && (slot ? createPortal(keys, slot) : keys)}
    </>
  );
}
