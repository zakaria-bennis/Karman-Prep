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

/** Every shortcut, grouped (founder, 2026-11-08: "flesh them out"). Keys are shown as key caps. */
type Shortcut = { keys: string[]; does: string; math?: true };
const SHORTCUT_GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Answer",
    items: [
      { keys: ["A", "B", "C", "D"], does: "Pick an answer" },
      { keys: ["X"], does: "Answer eliminator on or off" },
      { keys: ["Enter"], does: "Submit, then Next" },
      { keys: ["←", "→"], does: "Back and Next" },
    ],
  },
  {
    title: "Tools",
    items: [
      { keys: ["P"], does: "Pencil on or off" },
      { keys: ["E"], does: "Eraser" },
      { keys: ["H"], does: "Highlighter on or off" },
      { keys: ["C"], does: "Calculator", math: true },
      { keys: ["R"], does: "Reference sheet", math: true },
      { keys: ["Esc"], does: "Close a menu, then put the pencil or highlighter away" },
    ],
  },
  {
    title: "Your page",
    items: [
      { keys: ["M"], does: "Mark for review" },
      { keys: ["S"], does: "Bookmark" },
      { keys: ["⌘ or Ctrl", "Z"], does: "Undo ink" },
      { keys: ["⌘ or Ctrl", "Shift", "Z"], does: "Redo ink" },
      { keys: ["+", "−"], does: "Bigger or smaller text" },
      { keys: ["?"], does: "Show this list" },
    ],
  },
];

/** One tap names the problem; a note is optional (founder, 2026-11-08). */
const REPORT_REASONS = [
  "The answer key looks wrong",
  "Typo or wording",
  "Figure or graph problem",
  "The explanation is unclear",
  "Something else",
] as const;

/** Text size, animations, sounds, ask my tutor, report a problem, shortcuts (spec: More menu).
 *  Exit is in the bar. */
export function MoreMenu({
  textSize,
  onTextSize,
  showSounds,
  onReport,
  tutor,
  onShortcuts,
  onOpenChange,
  active,
}: {
  textSize: number;
  onTextSize(size: number): void;
  showSounds: boolean;
  onReport?(note: string): Promise<unknown>;
  /** Tutored students can flag this question for their tutor, and take the flag down again. */
  tutor?: { asked: boolean; onAsk(note: string): void; onRemove(): void };
  /** Opens the list of keyboard shortcuts, a pop-up of its own. */
  onShortcuts(): void;
  /** The menu opened or closed: the bar marks More as the tool in use while it is open. */
  onOpenChange?(open: boolean): void;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "report">("menu");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [sending, setSending] = useState(false);
  const told = useRef(onOpenChange);
  useEffect(() => {
    told.current = onOpenChange;
  }, [onOpenChange]);
  useEffect(() => told.current?.(open), [open]);
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
        active={active}
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
                {tutor && (
                  // Pressed, a flag runs up its pole and the row offers to take it down again.
                  <button
                    type="button"
                    className={styles.item}
                    data-flag={tutor.asked ? "up" : "down"}
                    onClick={() => (tutor.asked ? tutor.onRemove() : tutor.onAsk(""))}
                  >
                    <svg className={styles.itemArt} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 21.500V3" />
                      <path d="M3.500 21.500h5" />
                      <path className={styles.flag} d="M6 4h10.500l-2.300 3 2.300 3H6z" />
                    </svg>
                    <span>{tutor.asked ? "Remove flag" : "Flag for my tutor"}</span>
                  </button>
                )}
                {onReport && (
                  <button type="button" className={styles.item} onClick={() => setPanel("report")}>
                    <span className={`${styles.itemArt} ${styles.marks}`} aria-hidden="true">
                      <i>?</i>
                      <i>?</i>
                      <i>?</i>
                    </span>
                    <span>Report a problem</span>
                  </button>
                )}
                {finePointer && (
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => {
                      setOpen(false);
                      onShortcuts();
                    }}
                  >
                    <span className={`${styles.itemArt} ${styles.fnKey}`} aria-hidden="true">
                      fn
                    </span>
                    <span>Keyboard shortcuts</span>
                  </button>
                )}
              </>
            )}
            {panel === "report" &&
              (sent ? (
                <div className={styles.done} role="status">
                  <p>Thanks. We will check this question and fix it if something is wrong.</p>
                  <button type="button" className={shell.tool} onClick={() => setOpen(false)}>
                    Back to the question
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = [reason, note.trim()].filter(Boolean).join(": ");
                    if (!text || !onReport || sending) return;
                    setFailed(false);
                    setSending(true);
                    onReport(text)
                      .then(
                        () => {
                          setSent(true);
                          setNote("");
                          setReason(null);
                        },
                        () => setFailed(true)
                      )
                      .finally(() => setSending(false));
                  }}
                >
                  <p className={styles.label} id="quiz-report-reason">
                    What is wrong with this question?
                  </p>
                  <div className={styles.reasons} role="group" aria-labelledby="quiz-report-reason">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={styles.reason}
                        aria-pressed={reason === r}
                        onClick={() => setReason(reason === r ? null : r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <label className={styles.label} htmlFor="quiz-report">
                    {reason === "Something else"
                      ? "Tell us what you saw"
                      : "Anything to add? (optional)"}
                  </label>
                  <textarea
                    id="quiz-report"
                    className={styles.text}
                    rows={3}
                    maxLength={1800}
                    required={reason === "Something else" || !reason}
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
                    <button
                      type="submit"
                      className={shell.tool}
                      disabled={sending || (!reason && !note.trim())}
                    >
                      {sending ? "Sending…" : "Send report"}
                    </button>
                  </div>
                </form>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Every keyboard shortcut, for the pop-up the "?" key and the More menu open. */
export function ShortcutsList({ math }: { math: boolean }) {
  return (
    <>
      {SHORTCUT_GROUPS.map((g) => (
        <section key={g.title} className={styles.keyGroup}>
          <h3 className={styles.keyTitle}>{g.title}</h3>
          <dl className={styles.keys}>
            {g.items
              .filter((it) => math || !it.math)
              .map((it) => (
                <div key={it.does}>
                  <dt>
                    {it.keys.map((k) => (
                      <kbd key={k} className={styles.kbd}>
                        {k}
                      </kbd>
                    ))}
                  </dt>
                  <dd>{it.does}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </>
  );
}
