"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Highlighter, Settings, X } from "lucide-react";
import styles from "./workspace.module.css";

const preferenceKey = "karman-quiz-animations";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("quiz-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("quiz-preferences", callback);
  };
}
const memoryPreferences = new Map<string, boolean>();
function preference(key: string) {
  if (memoryPreferences.has(key)) return memoryPreferences.get(key)!;
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}
function savePreference(key: string, value: boolean) {
  memoryPreferences.set(key, value);
  try {
    localStorage.setItem(key, value ? "on" : "off");
  } catch {
    /* Retain in memory when storage is blocked. */
  }
  window.dispatchEvent(new Event("quiz-preferences"));
}
function snapshot() {
  return preference(preferenceKey);
}
export function useQuizAnimations() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
export function QuizSettings() {
  const animations = useQuizAnimations();
  return (
    <details className={styles.settings}>
      <summary aria-label="Quiz settings">
        <Settings size={17} /> Settings
      </summary>
      <div>
        <label>
          <input
            type="checkbox"
            checked={animations}
            onChange={(event) => {
              savePreference(preferenceKey, event.target.checked);
            }}
          />{" "}
          Question animations
        </label>
        <p>System reduced-motion preferences always take priority.</p>
      </div>
    </details>
  );
}
export function TimerToggle({
  seconds,
  countdown = false,
  color,
}: {
  seconds: number;
  countdown?: boolean;
  color?: string;
}) {
  const visible = useSyncExternalStore(
    subscribe,
    () => preference("karman-quiz-timer"),
    () => true
  );
  return (
    <div className={styles.timer}>
      {visible && (
        <output style={{ color }} aria-label={countdown ? "Time remaining" : "Elapsed time"}>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </output>
      )}
      <button
        type="button"
        onClick={() => savePreference("karman-quiz-timer", !visible)}
        aria-pressed={visible}
      >
        {visible ? "Hide Timer" : "Show Timer"}
      </button>
    </div>
  );
}
export function PracticeTimer({ startedAt }: { startedAt: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = startedAt || Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return <TimerToggle seconds={seconds} />;
}
export function HighlightTool() {
  return (
    <button
      type="button"
      className={styles.tool}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => window.dispatchEvent(new Event("quiz-highlight-selection"))}
      title="Select passage text, then Highlight"
    >
      <Highlighter size={16} /> Highlight
    </button>
  );
}
export function QuestionTransition({
  children,
  index,
  direction = "next",
}: {
  children: ReactNode;
  index: number;
  direction?: "next" | "previous";
}) {
  const animate = useQuizAnimations();
  return (
    <div
      key={index}
      className={styles.transition}
      data-animate={animate}
      data-direction={direction}
    >
      {children}
    </div>
  );
}
export function QuestionGuide({ children, onClose }: { children: ReactNode; onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Question guide"
        tabIndex={-1}
        ref={ref}
        className={styles.guide}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
          if (e.key !== "Tab") return;
          const buttons = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
          );
          const first = buttons[0],
            last = buttons.at(-1);
          if (
            e.shiftKey &&
            (document.activeElement === first || document.activeElement === ref.current)
          ) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <header>
          <h2>Question guide</h2>
          <button type="button" aria-label="Close question guide" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
