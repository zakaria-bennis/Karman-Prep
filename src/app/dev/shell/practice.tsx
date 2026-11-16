"use client";

// Pieces of the Library that are about practising, not about one skill:
//   Today     the Daily 10 and the Challenge question, each to start if it has not been done yet.
//   Modes     time trials, endless mode, strategy quizzes, flashcards, Word Line and full-length exams,
//             on both sides. Names only.
//   GoButton  the one main button: an outline that fills when hovered, with an orb while it loads. Its
//             six states are resting, hovered, focused, pressed, loading and disabled.
// The icons are Karman's own, drawn here and centred on their tiles by eye. Each moves in its own way
// while its row is hovered or focused (practice.module.css, keyed on data-a).
//   Time trials  the home page's racing stopwatch with flames off its back (WayArt.tsx, way 5).
//   Endless      a marigold light that never stops going round the sideways 8.
//   Strategy     a compass: red to north, blue to south. It spins wildly, then settles north.
// Everything is a stand-in: nothing starts yet, and the streak is a made-up number.
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./practice.module.css";
import { buzz, chosen, tick } from "./sound";

const TINT = { fill: "var(--tint)", fillOpacity: 0.32 } as const;
const LOOP =
  "M8 8.300c-2.300 0-4 1.700-4 3.700s1.700 3.700 4 3.700c3.700 0 4.300-7.400 8-7.400 2.300 0 4 1.700 4 3.700s-1.700 3.700-4 3.700c-3.700 0-4.300-7.400-8-7.400z";

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
  // a compass: a ring with north marked, and a needle red to the north and blue to the south
  strategy: (
    <>
      <circle
        cx="12"
        cy="12"
        r="9.300"
        fill="currentColor"
        fillOpacity="0.08"
        strokeWidth="1.800"
      />
      <path d="M12 1.500v2.400" strokeWidth="2.200" />
      <g data-a="needle">
        <path d="M12 4.800l2.700 7.200h-5.400z" fill="#d8453c" stroke="none" />
        <path d="M12 19.200l2.700-7.200h-5.400z" fill="#3f73d6" stroke="none" />
      </g>
      <circle cx="12" cy="12" r="1.300" fill="currentColor" stroke="none" />
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
  // a whole test: a booklet of stacked sheets, with a clock on its corner
  exam: (
    <>
      <rect data-a="sheet2" x="7.500" y="3" width="11" height="14" rx="1.500" {...TINT} />
      <rect data-a="sheet1" x="5.700" y="4.800" width="11" height="14" rx="1.500" {...TINT} />
      <rect
        x="4"
        y="6.600"
        width="11"
        height="14"
        rx="1.500"
        fill="var(--tint)"
        fillOpacity="0.55"
      />
      <circle cx="17.300" cy="17.600" r="4" fill="var(--paper, #fffdf8)" />
      <path
        data-a="hand"
        d="M17.300 17.600v-2.200"
        stroke="var(--tint)"
        strokeWidth="1.800"
        style={{ transformOrigin: "17.3px 17.6px" }}
      />
    </>
  ),
  // a flame with fire in it
  flame: (
    <>
      <path
        data-a="flick"
        d="M12 2.500c1.600 4.200 6.300 5.800 6.300 11.600a6.300 6.300 0 0 1-12.600 0c0-3.200 2.100-4.800 2.900-7.400 1.300 1.900 1.700 3.200 2.100 4.800 1-2.700 1.600-5.800 1.300-9z"
        fill="#ee5a24"
        stroke="none"
      />
      <path
        d="M12 11c.9 2 3 3 3 5.700a3 3 0 0 1-6 0c0-1.500 1-2.300 1.500-3.500.5.800.8 1.400 1 2.100.4-1.400.6-2.800.5-4.300z"
        fill="#ffd24a"
        stroke="none"
      />
    </>
  ),
  check: <path d="M5 12.500l4.500 4.500L19 7.500" strokeWidth="2.200" />,
  go: <path d="M5 12h13M12.500 6.500L18 12l-5.500 5.500" strokeWidth="2" />,
  written: <path d="M5 6.500h14M5 11h14M5 15.500h9" />,
  video: <path d="M9 6.500v11l9-5.500z" fill="currentColor" fillOpacity="0.14" />,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof ICONS | "trial" | "endless";

/** Each practice icon's own colour. */
const TINTS: Partial<Record<IconName, string>> = {
  daily: "#e39a2d",
  challenge: "#e0683f",
  cards: "#d9713f",
  word: "#4f9b8f",
  exam: "#7a86c9",
};

/** The home page's racing stopwatch, flames streaming off its back, made small. */
function TrialWatch({ size }: { size: number }) {
  return (
    <svg viewBox="-6 6 216 216" width={size} height={size} aria-hidden="true" focusable="false">
      <g data-a="fire">
        <path
          fill="#ee5a24"
          d="M70 62C46 54 30 64 4 58c14 10 24 12 30 22-12-2-22 2-32 10 16 0 26 6 34 16-12 0-22 6-30 16 14-2 26 2 34 10-10 4-18 12-22 22 14-8 28-8 40-2 8 6 16 8 22 6z"
        />
        <path
          fill="#f7a531"
          d="M72 78C54 72 40 78 20 76c10 6 18 10 22 18-10 0-18 4-24 10 12 0 22 4 28 12-8 2-16 8-20 16 12-4 24-4 34 2 6 4 12 4 16 2z"
        />
        <path
          fill="#ffe27a"
          d="M74 94c-12-4-22 0-34 0 8 4 12 8 14 14-6 0-12 4-16 8 10 0 18 2 24 8 6 2 10 2 14 0z"
        />
      </g>
      <g fill="currentColor">
        <rect x="110" y="20" width="16" height="18" rx="4" />
        <rect x="102" y="14" width="32" height="10" rx="5" />
        <rect x="166" y="52" width="14" height="20" rx="4" transform="rotate(42 173 62)" />
        <circle cx="118" cy="116" r="76" />
      </g>
      <circle cx="118" cy="116" r="63" fill="#fffaf1" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M118 60v10"
          stroke="#3b3442"
          strokeWidth={i % 3 === 0 ? 7 : 4}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 118 116)`}
        />
      ))}
      <path
        data-a="watch"
        d="M118 116V72"
        stroke="#ee5a24"
        strokeWidth="9"
        strokeLinecap="round"
        style={{ transformOrigin: "118px 116px" }}
      />
      <circle cx="118" cy="116" r="8" fill="#3b3442" />
    </svg>
  );
}

/** Endless: a marigold light, with its tail, that never stops going round the sideways 8. */
function EndlessOrb({ size }: { size: number }) {
  const still = useReducedMotion() ?? false;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="kp-orb">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="0.35" stopColor="#ffc24a" />
          <stop offset="1" stopColor="#f08a1c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={LOOP} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.800" />
      <path
        d={LOOP}
        data-a="shade"
        pathLength={1}
        stroke="#f5a623"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      {[0, 0.07, 0.14].map((lag, i) => (
        <circle key={lag} r={3.4 - i * 0.9} fill="url(#kp-orb)" opacity={1 - i * 0.3}>
          {still ? (
            <set attributeName="cx" to="8" />
          ) : (
            <animateMotion
              dur="2.6s"
              begin={`${-2.6 * (1 - lag)}s`}
              repeatCount="indefinite"
              path={LOOP}
            />
          )}
        </circle>
      ))}
    </svg>
  );
}

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  if (name === "trial") return <TrialWatch size={size} />;
  if (name === "endless") return <EndlessOrb size={size} />;
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
    <span className={styles.tile} style={{ "--tint": TINTS[name] ?? "#d9a441" } as CSSProperties}>
      <Icon name={name} size={name === "trial" ? 34 : 28} />
    </span>
  );
}

/**
 * The main button: an outline that fills with green when hovered. Its six states are resting, hovered,
 * focused, pressed, loading and disabled. Pressing it shows an orb while it loads (nothing really loads
 * yet), then calls `onDone`.
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
        }, 1600);
      }}
    >
      {loading ? (
        <span className={styles.orb} role="img" aria-label="Loading" />
      ) : (
        <>
          <span>{children}</span>
          <Icon name="go" size={20} />
        </>
      )}
    </button>
  );
}

const TASKS = [
  {
    key: "daily",
    icon: "daily",
    name: "Daily 10",
    what: "Ten questions across your skills.",
    streak: null,
  },
  {
    key: "challenge",
    icon: "challenge",
    name: "Challenge question",
    what: "One hard question.",
    streak: "3 day streak",
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
          <li key={task.key} className={styles.task}>
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
              {task.streak && (
                <span className={styles.streak}>
                  <Icon name="flame" size={18} />
                  {task.streak}
                </span>
              )}
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

const MODES: { icon: IconName; name: string }[] = [
  { icon: "trial", name: "Time trials" },
  { icon: "endless", name: "Endless mode" },
  { icon: "strategy", name: "Strategy quizzes" },
  { icon: "cards", name: "Flashcards" },
  { icon: "word", name: "Word Line" },
  { icon: "exam", name: "Full-length exams" },
];

/** The other ways to practise: one row of names, each with its icon. The same six on both sides. */
export function Modes() {
  return (
    <section className={`${styles.glass} ${styles.modes}`} aria-label="More ways to practise">
      <h2>More ways to practise</h2>
      <ul>
        {MODES.map((mode) => (
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
