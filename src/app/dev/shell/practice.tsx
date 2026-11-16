"use client";

// Pieces of the Library that are about practising, not about one skill:
//   Today   the Daily 10 and the Challenge question, each to start if it has not been done yet.
//   Modes   where time trials, endless mode, strategy quizzes, flashcards, Word Line and full-length exams
//           live. Names only, no subtitles (founder, 2026-11-15).
//   GoButton  the one main button, with all six states a button has: resting, hovered, focused, pressed,
//           loading and disabled.
// The icons are Karman's own, drawn here on a 24 grid and centred on it by eye. Each has its own colour
// (--tint) and a small movement of its own, played when its row is hovered or focused (the CSS is in
// library.module.css, keyed on data-a).
// Everything is a stand-in: nothing starts yet, and the streak and the coins are made-up numbers.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./library.module.css";
import type { Section } from "./skills72";
import { buzz, chosen, tick } from "./sound";

const TINT = { fill: "var(--tint)", fillOpacity: 0.32 } as const;
const SOLID = { fill: "var(--tint)", stroke: "none" } as const;

const ICONS = {
  // the day's ten: a ring that fills, with the number in it
  daily: (
    <>
      <circle cx="12" cy="12" r="8.800" {...TINT} />
      <circle
        data-a="sweep"
        cx="12"
        cy="12"
        r="8.800"
        pathLength={1}
        stroke="var(--tint)"
        strokeWidth="2.200"
      />
      <text
        x="12"
        y="15.300"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        10
      </text>
    </>
  ),
  // a bolt: one hard question
  challenge: (
    <path data-a="jolt" d="M13.400 2.600L5.300 13.400h5.400l-1 8 8.900-11.600h-5.700z" {...TINT} />
  ),
  // a stopwatch whose hand goes round
  trial: (
    <>
      <circle cx="12" cy="13" r="7.300" {...TINT} />
      <path d="M10 3.200h4M12 3.200v2.500" />
      <path data-a="hand" d="M12 13V8.600" stroke="var(--tint)" strokeWidth="2.200" />
    </>
  ),
  // a loop with a light that keeps running round it
  endless: (
    <>
      <path d="M8 8.500c-2.200 0-3.800 1.600-3.800 3.500s1.600 3.500 3.800 3.500c3.600 0 4.400-7 8-7 2.200 0 3.800 1.600 3.800 3.500s-1.600 3.500-3.800 3.500c-3.600 0-4.400-7-8-7z" />
      <path
        data-a="run"
        pathLength={1}
        d="M8 8.500c-2.200 0-3.800 1.600-3.800 3.500s1.600 3.500 3.800 3.500c3.600 0 4.400-7 8-7 2.200 0 3.800 1.600 3.800 3.500s-1.600 3.500-3.800 3.500c-3.600 0-4.400-7-8-7z"
        stroke="var(--tint)"
        strokeWidth="2.600"
      />
    </>
  ),
  // a compass whose needle swings
  strategy: (
    <>
      <circle cx="12" cy="12" r="8.800" {...TINT} />
      <path data-a="needle" d="M15.800 8.200l-2.300 5.300-5.300 2.300 2.300-5.300z" {...SOLID} />
    </>
  ),
  // index cards that fan out and back
  cards: (
    <>
      <rect data-a="fanL" x="7" y="5.500" width="10" height="13" rx="1.600" {...TINT} />
      <rect data-a="fanR" x="7" y="5.500" width="10" height="13" rx="1.600" {...TINT} />
      <rect
        x="7"
        y="5.500"
        width="10"
        height="13"
        rx="1.600"
        fill="var(--tint)"
        fillOpacity="0.6"
      />
    </>
  ),
  // Word Line: one line through its points, spelling a W
  word: (
    <>
      <path
        data-a="draw"
        pathLength={1}
        d="M3.500 7l4 10 4.500-8 4.500 8 4-10"
        stroke="var(--tint)"
        strokeWidth="2.200"
      />
      {[
        [3.5, 7],
        [7.5, 17],
        [12, 9],
        [16.5, 17],
        [20.5, 7],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="1.700" fill="currentColor" stroke="none" />
      ))}
    </>
  ),
  // an answer sheet: rows of bubbles, some filled in
  exam: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.400" {...TINT} />
      {[8.3, 12, 15.7].map((y, row) =>
        [8.3, 12, 15.7].map((x, col) => (
          <circle
            key={`${row}${col}`}
            cx={x}
            cy={y}
            r="1.350"
            strokeWidth="1.200"
            data-a={col === (row * 2 + 1) % 3 ? "mark" : undefined}
            style={{ "--n": row } as CSSProperties}
          />
        ))
      )}
    </>
  ),
  // small marks for the facts beside a task
  list: <path d="M5 7h14M5 12h14M5 17h9" />,
  flame: (
    <path
      d="M12 3c1.500 4 6 5.500 6 11a6 6 0 0 1-12 0c0-3 2-4.500 2.800-7 1.200 1.800 1.600 3 2 4.500.9-2.500 1.500-5.500 1.200-8.500z"
      fill="currentColor"
      fillOpacity="0.14"
    />
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.500" fill="currentColor" fillOpacity="0.14" />
      <path d="M10 8v8M14.500 8l-4.500 4 4.500 4" />
    </>
  ),
  up: <path d="M5 16l5-5.500 3.500 3L19 7M14.500 7H19v4.500" />,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" strokeWidth="2.200" />,
  go: <path d="M5 12h13M12.500 6.500L18 12l-5.500 5.500" strokeWidth="2" />,
  written: <path d="M5 6.500h14M5 11h14M5 15.500h9" />,
  video: <path d="M9 6.500v11l9-5.500z" fill="currentColor" fillOpacity="0.14" />,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof ICONS;

/** Each practice icon's own colour. They sit beside the progress hue without being mistaken for it. */
const TINTS: Partial<Record<IconName, string>> = {
  daily: "#e39a2d",
  challenge: "#e0683f",
  trial: "#d8587a",
  endless: "#8c6fd0",
  strategy: "#c9862e",
  cards: "#d9713f",
  word: "#4f9b8f",
  exam: "#7a86c9",
};

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

/** An icon on its tile, in its own colour. */
export function Tile({ name }: { name: IconName }) {
  return (
    <span className={styles.tile} style={{ "--tint": TINTS[name] ?? "var(--p2)" } as CSSProperties}>
      <Icon name={name} size={28} />
    </span>
  );
}

/**
 * The main button. Its six states: resting, hovered, focused, pressed, loading and disabled.
 * Pressing it shows the loading state for a moment (nothing really loads yet), then calls `onDone`.
 */
export function GoButton({
  children,
  label,
  wide,
  disabled,
  onDone,
}: {
  children: ReactNode;
  label?: string;
  wide?: boolean;
  disabled?: boolean;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={styles.gobtn}
      data-wide={wide || undefined}
      data-loading={loading || undefined}
      aria-label={label}
      aria-busy={loading}
      disabled={disabled}
      onClick={() => {
        if (loading) return;
        setLoading(true);
        tick();
        buzz(10);
        timer.current = setTimeout(() => {
          setLoading(false);
          chosen();
          onDone?.();
        }, 1400);
      }}
    >
      <span className={styles.gobtnWords}>{loading ? "Loading" : children}</span>
      {loading ? <i className={styles.spin} aria-hidden="true" /> : <Icon name="go" size={20} />}
    </button>
  );
}

const TASKS = [
  {
    key: "daily",
    icon: "daily",
    name: "Daily 10",
    what: "Ten questions across your skills.",
    facts: [
      ["list", "10 questions"],
      ["up", "Keeps skills from slipping"],
    ],
  },
  {
    key: "challenge",
    icon: "challenge",
    name: "Challenge question",
    what: "One hard question.",
    facts: [
      ["flame", "3 day streak"],
      ["coin", "1.5x coins"],
    ],
  },
] as const;

/** Today's two tasks. Each shows Start until it is done; then it rests, ticked. */
export function Today() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <section className={`${styles.glass} ${styles.today}`} aria-label="Today">
      <h2>Today</h2>
      <ul>
        {TASKS.map((task) => (
          <li key={task.key} className={styles.task} data-done={done[task.key] || undefined}>
            {done[task.key] ? (
              <span className={styles.tile} data-done>
                <Icon name="check" size={28} />
              </span>
            ) : (
              <Tile name={task.icon} />
            )}
            <span className={styles.taskWords}>
              <b>{task.name}</b>
              <span>{done[task.key] ? "Done for today." : task.what}</span>
              <span className={styles.facts}>
                {task.facts.map(([icon, text]) => (
                  <span key={text}>
                    <Icon name={icon} size={16} />
                    {text}
                  </span>
                ))}
              </span>
            </span>
            {!done[task.key] && (
              <GoButton
                label={`Start ${task.name}`}
                onDone={() => setDone((d) => ({ ...d, [task.key]: true }))}
              >
                Start
              </GoButton>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const MODES: { icon: IconName; name: string; only?: Section }[] = [
  { icon: "trial", name: "Time trials" },
  { icon: "endless", name: "Endless mode" },
  { icon: "strategy", name: "Strategy quizzes" },
  { icon: "cards", name: "Flashcards", only: "Reading and Writing" },
  { icon: "word", name: "Word Line", only: "Reading and Writing" },
  { icon: "exam", name: "Full-length exams" },
];

/** The other ways to practise this side: one row of names, each with its icon. */
export function Modes({ section }: { section: Section }) {
  return (
    <section className={`${styles.glass} ${styles.modes}`} aria-label="More ways to practise">
      <h2>More ways to practise</h2>
      <ul>
        {MODES.filter((m) => !m.only || m.only === section).map((mode) => (
          <li key={mode.name}>
            <button type="button" className={styles.mode} onClick={() => tick()}>
              <Tile name={mode.icon} />
              <b>{mode.name}</b>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
