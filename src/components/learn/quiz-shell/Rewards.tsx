"use client";
// Khan-style small wins in instant-grading modes (spec: Small wins).
// Tokens are never shown here: they appear only on the result screen.
import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { ConfidenceBand } from "@/types/quiz";
import type { DotState } from "@/lib/quiz/rewards";
import styles from "./rewards.module.css";
import { Hearts } from "./Hearts";
import { ChevronIcon, CrossIcon, TickIcon } from "./icons";
import { useShellMotion } from "./motion";

/** The run as a row of dots, then the count. A dot that has been reached goes to its question
 *  when pressed; a dot held down opens the big question picker, as the count does. A dot that
 *  has just been got right pops, with a ring going out from it: a very small celebration.
 *  In Endless the hearts come first and the dots ride in a strip of ten at most (founder,
 *  2026-11-17: "starts with one dot and grows to ten; never more than ten in the bar; scroll
 *  back for older ones; the chevron shows all"). */
export function ProgressDots({
  states,
  label,
  count,
  onOpen,
  onGo,
  endless,
  rescued,
  index,
}: {
  states: DotState[];
  label: string;
  /** The short visible count, "3 of 10"; the full label stays the button's name. */
  count?: string;
  onOpen(): void;
  /** Goes to a question that has been reached. */
  onGo?(index: number): void;
  /** Endless: the hearts, and the dots in a strip that scrolls. */
  endless?: { hearts: number; lost: number };
  /** Dots of questions put right with a second chance: a green ring over the red. */
  rescued?: ReadonlySet<number>;
  /** The question in front of the student (its dot may already be graded). */
  index?: number;
}) {
  const { reduced } = useShellMotion();
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  // In Endless a dot added after the bar first drew pops in.
  const firstCount = useRef(states.length);
  const press = () => {
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      onOpen();
    }, 480);
  };
  const release = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const dots = states.map((s, i) => {
    const reached = s === "correct" || s === "wrong" || s === "current";
    const putRight = !!rescued?.has(i);
    const popIn = !!endless && !reduced && i >= firstCount.current;
    return (
      <motion.button
        key={i}
        type="button"
        data-testid="progress-dot"
        data-state={s}
        data-rescued={putRight || undefined}
        className={styles.dot}
        aria-label={`Go to question ${i + 1}${putRight ? ", put right" : ""}`}
        aria-current={s === "current" ? "step" : undefined}
        disabled={!reached || !onGo}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        // holding a dot opens the picker, never the phone's own menu
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => !held.current && onGo?.(i)}
        initial={popIn ? { scale: 0.3, opacity: 0 } : false}
        animate={
          s === "correct" && !reduced
            ? { scale: [1, 1.5, 1], opacity: 1 }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {s === "correct" && <TickIcon size={13} />}
        {s === "wrong" && <CrossIcon size={12} />}
        {!reduced && (
          <motion.i
            className={styles.burst}
            aria-hidden="true"
            initial={false}
            animate={
              s === "correct"
                ? // in Endless's strip the ring stays inside the strip's own edges
                  { scale: [0.6, endless ? 1.9 : 2.6], opacity: [0.9, 0] }
                : { scale: 0.6, opacity: 0 }
            }
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}
      </motion.button>
    );
  });
  const current = index ?? states.indexOf("current");
  return (
    <div
      className={styles.dots}
      role="group"
      aria-label="Questions"
      data-endless={endless ? "" : undefined}
      data-still={reduced || undefined}
    >
      {endless && <Hearts hearts={endless.hearts} lost={endless.lost} />}
      {endless ? (
        <DotStrip count={states.length} current={current} reduced={reduced}>
          {dots}
        </DotStrip>
      ) : (
        dots
      )}
      {count && (
        <button
          type="button"
          className={styles.count}
          aria-label={label}
          aria-haspopup="dialog"
          onClick={onOpen}
        >
          {count}
          <ChevronIcon dir="up" size={14} />
        </button>
      )}
    </div>
  );
}

/** Endless's strip: ten dots wide at most. A new dot slides the strip on to the end; going to an
 *  older question brings its dot into view; older ones are a swipe, a trackpad or the mouse
 *  wheel away. A soft fade at an edge says there are more that way. */
function DotStrip({
  count,
  current,
  reduced,
  children,
}: {
  count: number;
  current: number;
  reduced: boolean;
  children: ReactNode;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const seen = useRef(count);
  const fade = () => {
    const el = strip.current;
    if (!el) return;
    const before = el.scrollLeft > 2;
    const after = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    const more = before && after ? "both" : before ? "before" : after ? "after" : "";
    if (more) el.dataset.more = more;
    else delete el.dataset.more;
  };
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const grew = count > seen.current;
    seen.current = count;
    const go = (left: number) => {
      const smooth = !reduced && grew;
      if (typeof el.scrollTo === "function")
        el.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
      else el.scrollLeft = left;
    };
    const dots = el.querySelectorAll<HTMLElement>("[data-testid='progress-dot']");
    const dot = dots[current >= 0 ? current : dots.length - 1];
    if (grew && (current < 0 || current >= count - 2)) go(el.scrollWidth);
    else if (dot) {
      // keep the dot in front of the student inside the strip, clear of the fade
      const pad = 24;
      const start = dot.offsetLeft - pad;
      const end = dot.offsetLeft + dot.offsetWidth + pad;
      if (start < el.scrollLeft) go(Math.max(0, start));
      else if (end > el.scrollLeft + el.clientWidth) go(end - el.clientWidth);
    }
    fade();
  }, [count, current, reduced]);
  // a turned phone or a wider window changes what is out of sight
  useEffect(() => {
    const el = strip.current;
    if (!el || typeof ResizeObserver !== "function") return;
    const watch = new ResizeObserver(fade);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <div
      ref={strip}
      className={styles.strip}
      onScroll={fade}
      onWheel={(e) => {
        // a mouse wheel turns the strip as well as a trackpad does
        const el = strip.current;
        if (!el || el.scrollWidth <= el.clientWidth) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
      }}
    >
      {children}
    </div>
  );
}

const BANDS: ConfidenceBand[] = ["struggling", "developing", "proficient", "mastered"];
export function bandRank(b: ConfidenceBand | null | undefined): number {
  return b ? BANDS.indexOf(b) : -1;
}
const BAND_NAME: Record<ConfidenceBand, string> = {
  struggling: "Struggling",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};
export const bandName = (b: ConfidenceBand) => BAND_NAME[b];
/** A level up needs a band before it: a skill's first completed set never celebrates. */
export function bandRose(
  before: ConfidenceBand | null | undefined,
  after: ConfidenceBand | null | undefined
): boolean {
  return !!before && !!after && bandRank(after) > bandRank(before);
}
