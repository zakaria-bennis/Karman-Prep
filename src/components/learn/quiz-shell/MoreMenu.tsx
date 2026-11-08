"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { quizSoundsEnabled, setQuizSounds, subscribeQuizSounds } from "@/lib/quiz/reward-sound";
import { preferenceKey, savePreference, useQuizAnimations } from "../quiz/QuizTools";
import styles from "./more.module.css";
import shell from "./quiz-shell.module.css";
import { MoreIcon } from "./icons";
import { BarButton } from "./TopBar";
import { SPRING, useShellMotion } from "./motion";

export const TEXT_SIZES = [100, 125, 150, 175, 200] as const;

const SHORTCUTS: [string, string][] = [
  ["A to D", "Pick an answer"],
  ["M", "Mark for review"],
  ["S", "Bookmark"],
  ["P", "Pencil on or off"],
  ["E", "Eraser"],
  ["Cmd or Ctrl + Z", "Undo ink"],
  ["Left and right arrows", "Back and Next"],
  ["Esc", "Close a menu"],
];

/** Text size, report a problem, animations, sounds, shortcuts (spec: More menu). Exit is in the bar. */
export function MoreMenu({
  textSize,
  onTextSize,
  showSounds,
  onReport,
}: {
  textSize: number;
  onTextSize(size: number): void;
  showSounds: boolean;
  onReport?(note: string): Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "report" | "shortcuts">("menu");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const animations = useQuizAnimations();
  const sounds = useSyncExternalStore(subscribeQuizSounds, quizSoundsEnabled, () => true);
  const { reduced } = useShellMotion();
  const box = useRef<HTMLDivElement>(null);
  const finePointer =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const i = TEXT_SIZES.indexOf(textSize as (typeof TEXT_SIZES)[number]);

  return (
    <div
      ref={box}
      className={styles.anchor}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <BarButton
        icon={<MoreIcon />}
        word="More"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setPanel("menu");
          setSent(false);
        }}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="More"
            className={`${styles.menu} ${shell.glass}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : SPRING}
          >
            {panel === "menu" && (
              <>
                <div className={styles.row}>
                  <span id="quiz-text-size">Text size</span>
                  <div className={styles.stepper} role="group" aria-labelledby="quiz-text-size">
                    <button
                      type="button"
                      className={shell.tool}
                      aria-label="Smaller text"
                      disabled={i <= 0}
                      onClick={() => onTextSize(TEXT_SIZES[i - 1])}
                    >
                      A−
                    </button>
                    <output aria-live="polite">{textSize}%</output>
                    <button
                      type="button"
                      className={shell.tool}
                      aria-label="Larger text"
                      disabled={i >= TEXT_SIZES.length - 1}
                      onClick={() => onTextSize(TEXT_SIZES[i + 1])}
                    >
                      A+
                    </button>
                  </div>
                </div>
                <label className={styles.row}>
                  <span>Question animations</span>
                  <input
                    type="checkbox"
                    role="switch"
                    className={styles.switch}
                    checked={animations}
                    onChange={(e) => savePreference(preferenceKey, e.target.checked)}
                  />
                </label>
                {showSounds && (
                  <label className={styles.row}>
                    <span>Sounds</span>
                    <input
                      type="checkbox"
                      role="switch"
                      className={styles.switch}
                      checked={sounds}
                      onChange={(e) => setQuizSounds(e.target.checked)}
                    />
                  </label>
                )}
                {onReport && (
                  <button type="button" className={styles.item} onClick={() => setPanel("report")}>
                    Report a problem
                  </button>
                )}
                {finePointer && (
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => setPanel("shortcuts")}
                  >
                    Keyboard shortcuts
                  </button>
                )}
              </>
            )}
            {panel === "report" &&
              (sent ? (
                <p className={styles.done} role="status">
                  Thanks. We will check this question.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!note.trim() || !onReport) return;
                    setFailed(false);
                    onReport(note.trim()).then(
                      () => {
                        setSent(true);
                        setNote("");
                      },
                      () => setFailed(true)
                    );
                  }}
                >
                  <label className={styles.label} htmlFor="quiz-report">
                    What is wrong with this question?
                  </label>
                  <textarea
                    id="quiz-report"
                    className={styles.text}
                    rows={4}
                    maxLength={2000}
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  {failed && (
                    <p role="alert" className={styles.done}>
                      That did not send. Try again.
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button type="button" className={shell.tool} onClick={() => setPanel("menu")}>
                      Back
                    </button>
                    <button type="submit" className={shell.tool}>
                      Send report
                    </button>
                  </div>
                </form>
              ))}
            {panel === "shortcuts" && (
              <>
                <dl className={styles.keys}>
                  {SHORTCUTS.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <button type="button" className={shell.tool} onClick={() => setPanel("menu")}>
                  Back
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
