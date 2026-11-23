"use client";

// The controls Settings is made of (founder, 2026-11-18: "very springy, reactive, and nice to use on
// mobile and desktop"). Each moves on a spring, answers the press itself before it answers the
// release, and is as large under a thumb as under a pointer.
//   Toggle   a switch: the knob stretches toward where it is going while it is held.
//   Slider   follows the finger exactly, then springs onto the nearest step when let go.
//   Seg      a few choices in one tray, with one lit pill that slides between them.
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { tick } from "./sound";
import styles from "./settings.module.css";
import { useStill } from "@/lib/painting/useStill";

const KNOB = { type: "spring", stiffness: 700, damping: 28, mass: 0.8 } as const;
const SNAP = { type: "spring", stiffness: 520, damping: 26, mass: 0.9 } as const;
const PILL = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
const STILL = { duration: 0 } as const;

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  const still = useStill();
  const [held, setHeld] = useState(false);
  /* held, the knob is wider and leans toward the other side, as a real switch gives under a thumb */
  const wide = held ? 6 : 0;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.toggle}
      data-on={on || undefined}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onClick={() => {
        tick();
        onChange(!on);
      }}
    >
      <motion.span
        className={styles.knob}
        initial={false}
        animate={{ x: on ? 20 - wide : 0, width: 26 + wide }}
        transition={still ? STILL : KNOB}
      />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  say,
  low,
  high,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  /** The value in words, for a screen reader ("8:00 PM"). */
  say?: (value: number) => string;
  /** Small pictures at the two ends: less and more. */
  low?: ReactNode;
  high?: ReactNode;
}) {
  const still = useStill();
  const rail = useRef<HTMLDivElement>(null);
  const share = (v: number) => ((v - min) / (max - min)) * 100;
  const at = useMotionValue(share(value));
  const left = useTransform(at, (v) => `${v}%`);
  const fill = useTransform(at, (v) => `calc(${v}% + 14px)`);
  const [held, setHeld] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    if (dragging.current) return;
    animate(at, share(value), still ? STILL : SNAP);
    // `share` only reads min and max
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, still, at]);

  const read = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = rail.current?.getBoundingClientRect();
    if (!box) return;
    const raw = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width));
    at.set(raw * 100);
    const next = Math.round((min + raw * (max - min)) / step) * step;
    if (next !== value) onChange(Math.max(min, Math.min(max, next)));
  };
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setHeld(false);
    animate(at, share(value), still ? STILL : SNAP);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const by =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? step
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -step
          : e.key === "Home"
            ? min - value
            : e.key === "End"
              ? max - value
              : 0;
    if (by === 0) return;
    e.preventDefault();
    onChange(Math.max(min, Math.min(max, value + by)));
  };

  return (
    <div className={styles.slider}>
      {low && <span className={styles.end}>{low}</span>}
      <div
        className={styles.track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={say?.(value)}
        data-held={held || undefined}
        onKeyDown={key}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          setHeld(true);
          read(e);
        }}
        onPointerMove={(e) => dragging.current && read(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className={styles.rail} ref={rail}>
          <motion.i className={styles.fill} style={{ width: fill }} />
          <motion.b
            className={styles.thumb}
            style={{ left }}
            animate={{ scale: held ? 1.22 : 1 }}
            transition={still ? STILL : KNOB}
          />
        </div>
      </div>
      {high && <span className={styles.end}>{high}</span>}
    </div>
  );
}

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const still = useStill();
  const id = useId();
  return (
    <div
      className={styles.seg}
      role="radiogroup"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => {
            if (option.value === value) return;
            tick();
            onChange(option.value);
          }}
        >
          {option.value === value && (
            <motion.i
              layoutId={`seg ${id}`}
              className={styles.pill}
              transition={still ? STILL : PILL}
            />
          )}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** One line of a settings page: what it is at the left, its control at the right. A slider, or
 *  anything else wide, goes underneath as `below`. */
export function Row({
  name,
  note,
  value,
  children,
  below,
}: {
  name: string;
  note?: string;
  /** What it is set to, said quietly beside the name (a slider's number). */
  value?: string;
  children?: ReactNode;
  below?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.line}>
        <p>
          <b>{name}</b>
          {note && <small>{note}</small>}
        </p>
        {value && <output>{value}</output>}
        {children}
      </div>
      {below}
    </div>
  );
}

/** A folder's group of rows on one piece of glass, its name (if it needs one) at the top. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <div className={styles.rows}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </section>
  );
}

/** A choice from a short list, one to a line, the chosen one ticked. */
export function Pick<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: readonly { value: T | null; label: string; extra?: ReactNode }[];
  onChange: (value: T | null) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.pick}>
      {options.map((option) => (
        <button
          key={option.value ?? "none"}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => {
            tick();
            onChange(option.value);
          }}
        >
          <i aria-hidden="true" />
          <span>{option.label}</span>
          {option.extra}
        </button>
      ))}
    </div>
  );
}

/** What just happened, said in place under the control (never a pop-up): done, a problem with what
 *  to do about it, or a plain note. */
export function Say({
  tone = "note",
  children,
}: {
  tone?: "note" | "done" | "problem";
  children: ReactNode;
}) {
  return (
    <p className={styles.say} data-tone={tone} role={tone === "problem" ? "alert" : "status"}>
      {tone !== "note" && (
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <circle cx="10" cy="10" r="8.250" />
          {tone === "done" ? (
            <path d="M6.500 10.300l2.300 2.300 4.700-5" />
          ) : (
            <path d="M10 5.800v5M10 14.100v.1" />
          )}
        </svg>
      )}
      <span>{children}</span>
    </p>
  );
}

const ICONS = {
  scholarship: (
    <>
      <circle cx="12" cy="9.500" r="5.500" />
      <path d="M9.200 14.300L7.500 20.500l4.500-2.300 4.500 2.300-1.700-6.200" />
      <path d="M12 6.800l.900 1.800 2 .3-1.450 1.400.35 2-1.800-.95-1.800.95.35-2-1.450-1.400 2-.3Z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.500 19c.600-3 2.700-4.500 5.500-4.500s4.900 1.500 5.500 4.500" />
      <circle cx="16.800" cy="7.800" r="2.300" />
      <path d="M16 13.200c2.400.100 4 1.500 4.500 4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.500" r="3.500" />
      <path d="M5 19.500c.800-3.400 3.500-5 7-5s6.200 1.600 7 5" />
    </>
  ),
  sat: (
    <>
      <rect x="4" y="5.500" width="16" height="14" rx="3" />
      <path d="M4 10h16M8.500 3.500v3.500M15.500 3.500v3.500" />
      <circle cx="15" cy="15" r="1.400" fill="currentColor" stroke="none" />
    </>
  ),
  sound: (
    <>
      <path d="M4.500 10v4h3l4 3.500v-11l-4 3.500Z" />
      <path d="M15 9.500a3.600 3.600 0 0 1 0 5M17.500 7a7 7 0 0 1 0 10" />
    </>
  ),
  look: (
    <>
      <circle cx="12" cy="12" r="7.500" />
      <path d="M12 4.500a7.500 7.500 0 0 1 0 15Z" fill="currentColor" stroke="none" />
    </>
  ),
  quiz: (
    <>
      <path d="M5 19l1-4L15.500 5.500a2.100 2.100 0 0 1 3 3L9 18Z" />
      <path d="M13.500 7.500l3 3" />
    </>
  ),
  notify: (
    <>
      <path d="M6.500 16.500V11a5.500 5.500 0 0 1 11 0v5.500l1.500 1.500H5Z" />
      <path d="M10 20.500a2.200 2.200 0 0 0 4 0" />
    </>
  ),
  plan: (
    <>
      <rect x="3.500" y="6" width="17" height="12" rx="2.500" />
      <path d="M3.500 10.500h17M7 14.500h4" />
    </>
  ),
  calendars: (
    <>
      <rect x="4" y="5.500" width="16" height="14" rx="3" />
      <path d="M4 10h16M12 12.500v4.500M9.750 14.750h4.500" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="7.500" />
      <path d="M9.800 9.800a2.300 2.300 0 1 1 3.300 2.100c-.700.400-1.100.900-1.100 1.700" />
      <circle cx="12" cy="16.300" r="0.900" fill="currentColor" stroke="none" />
    </>
  ),
  quiet: <path d="M5 10v4h3l4 3.500v-11l-4 3.500Z" />,
} as const;
export type IconName = keyof typeof ICONS;

/** Settings' own small pictures: one line family, like the menu's. */
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.600"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.800"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.500 6.500L15 12l-5.500 5.500" />
    </svg>
  );
}
