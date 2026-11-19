"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { keyClick } from "@/lib/quiz/key-click";
import styles from "./pane.module.css";

/** Where a phone's keys are put: low on the screen, just above the bottom bar (QuizShell). */
export const KEYS_SLOT_ID = "quiz-keys-slot";

/** A phone's dial: three across, the numbers where thumbs expect them. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "/"];
/** What the SAT takes in a typed answer, said inside the box until typing starts; short enough
 *  for a phone's box. */
const HINT = "Type a number, decimal or fraction";
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
  // The keys are up while the box is in use. A real tap anywhere else (a press and a lift in one
  // place; a scroll is not one) puts them down again.
  const [up, setUp] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!up) return;
    let from: { x: number; y: number; t: number } | null = null;
    const inside = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("[data-answer-box], [data-answer-keys]");
    const down = (e: PointerEvent) => {
      from = inside(e.target) ? null : { x: e.clientX, y: e.clientY, t: e.timeStamp };
    };
    const lift = (e: PointerEvent) => {
      const start = from;
      from = null;
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > 10 || e.timeStamp - start.t > 500) return; // a scroll or a long press
      setUp(false);
      box.current?.blur();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", lift, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", lift, true);
    };
  }, [up]);
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
    // a press is felt where the device can buzz (Android) and heard everywhere (a soft click)
    navigator.vibrate?.(8);
    keyClick();
    onChange(key === "back" ? value.slice(0, -1) : cleanAnswer(value + key));
  };
  // "7/2" as it is typed: an optional minus, the top, the bar, the bottom
  const fraction = /^(-?)(\d*)\/(\d*)$/.exec(value);
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
  const keys = (
    <AnimatePresence>
      {touch && !locked && up && (
        <motion.div
          key="keys"
          data-answer-keys=""
          className={styles.keys}
          role="group"
          aria-label="Number keys"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          style={{ overflow: "hidden" }}
        >
          {KEYS.map((k) => key(k, k === "/" ? "fraction bar" : k === "." ? "point" : k, k))}
          {key("−", "minus", "-")}
          {key("⌫", "Delete", "back", true)}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return (
    <>
      <div
        className={`${styles.numeric} ${verdict === "correct" ? styles.correct : verdict === "wrong" ? styles.wrong : ""}`}
        data-filled={value ? "" : undefined}
        data-fraction={fraction ? "" : undefined}
        data-answer-box=""
      >
        <label htmlFor="quiz-numeric-answer" className={styles.numericLabel}>
          Your answer
        </label>
        <input
          id="quiz-numeric-answer"
          ref={box}
          className={styles.numericInput}
          onFocus={(e) => {
            setUp(true);
            // the keys take room at the bottom: once they are up, the box is brought back into
            // sight with the question over it
            const box = e.currentTarget;
            window.setTimeout(
              () => box.scrollIntoView({ block: "center", behavior: "smooth" }),
              260
            );
          }}
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
        {fraction && (
          // a fraction is shown as one: the top over the bottom, with the bar between
          <span className={styles.fraction} aria-hidden="true">
            {fraction[1] && <span>−</span>}
            <span className={styles.stack}>
              <span>{fraction[2] || "\u00a0"}</span>
              <span>{fraction[3] || "\u00a0"}</span>
            </span>
            {!locked && <i className={styles.caret} />}
          </span>
        )}
      </div>
      {slot ? createPortal(keys, slot) : keys}
    </>
  );
}
