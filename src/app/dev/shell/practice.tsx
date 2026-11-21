"use client";

// Pieces of the Library that are about practicing, not about one skill:
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
import { UpcomingWorkshops } from "./Workshops";
import { openEndless } from "./endless";

const LOOP =
  "M8 8.300c-2.300 0-4 1.700-4 3.700s1.700 3.700 4 3.700c3.700 0 4.300-7.400 8-7.400 2.300 0 4 1.700 4 3.700s-1.700 3.700-4 3.700c-3.700 0-4.300-7.400-8-7.400z";

const ICONS = {
  // the Daily 10: a sun with ten rays
  daily: (
    <>
      <g data-a="rays" stroke="#f2a93b" strokeWidth="2.200">
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d="M12 1.800v3" transform={`rotate(${i * 36} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="5" fill="#ffc94d" stroke="#e08a1e" strokeWidth="1.400" />
    </>
  ),
  // a bolt: one hard question. Solid and bright, with a dark edge, so it pops
  challenge: (
    <path
      data-a="jolt"
      d="M13.800 1.800L4.800 13.600h5.600l-1.200 8.600 9.900-12.600h-6z"
      fill="#ffb81f"
      stroke="#8a4a00"
      strokeWidth="1.500"
    />
  ),
  // a compass: a white face with N, E, S and W, a notch at each point between, and a needle red to the
  // north and blue to the south
  strategy: (
    <>
      <circle cx="12" cy="12" r="10.300" fill="#fffdf8" stroke="#3b3442" strokeWidth="1.300" />
      {/* the dial: a fine tick every 15 degrees, a longer one at each point between N, E, S and W */}
      <circle cx="12" cy="12" r="8.300" stroke="#3b3442" strokeWidth="0.500" fill="none" />
      {Array.from({ length: 24 }, (_, i) => i * 15)
        .filter((a) => a % 90 !== 0)
        .map((a) => (
          <path
            key={a}
            d={a % 45 === 0 ? "M12 2.200v2.300" : "M12 2.200v1.100"}
            stroke="#3b3442"
            strokeWidth={a % 45 === 0 ? 1 : 0.6}
            transform={`rotate(${a} 12 12)`}
          />
        ))}
      {(
        [
          ["N", 12, 5.9],
          ["E", 18.7, 13.3],
          ["S", 12, 20.3],
          ["W", 5.3, 13.3],
        ] as const
      ).map(([letter, x, y]) => (
        <text
          key={letter}
          x={x}
          y={y}
          textAnchor="middle"
          fontSize="3.800"
          fontWeight="700"
          fill="#3b3442"
          stroke="none"
        >
          {letter}
        </text>
      ))}
      <g data-a="needle">
        <path d="M12 7l1.900 5h-3.800z" fill="#d8453c" stroke="none" />
        <path d="M12 17l1.900-5h-3.800z" fill="#3f73d6" stroke="none" />
      </g>
      <circle cx="12" cy="12" r="0.900" fill="#3b3442" stroke="none" />
    </>
  ),
  // pale yellow index cards stood on end; they fan out like a hand of cards and spring back
  cards: (
    <>
      {[-2, -1, 0, 1, 2].map((n) => (
        <g key={n} data-a="card" style={{ "--n": n } as CSSProperties}>
          <rect
            x="7.800"
            y="4.500"
            width="8.400"
            height="13"
            rx="1.100"
            fill="#fbe7a0"
            stroke="#b9902f"
            strokeWidth="0.900"
          />
          <path
            d="M9.500 8h5M9.500 10.300h5M9.500 12.600h3.200"
            stroke="#c9a54a"
            strokeWidth="0.700"
          />
        </g>
      ))}
    </>
  ),
  // a whole test: pages with lines of text, and a clock at the foot that turns
  exam: (
    <>
      <rect
        x="7"
        y="2.500"
        width="12"
        height="15"
        rx="1.400"
        fill="#e9e3d6"
        stroke="#3b3442"
        strokeWidth="1.100"
      />
      <rect
        x="4.500"
        y="4.500"
        width="12"
        height="15"
        rx="1.400"
        fill="#fffdf8"
        stroke="#3b3442"
        strokeWidth="1.100"
      />
      <path
        d="M6.800 8h7.400M6.800 10.500h7.400M6.800 13h7.400M6.800 15.500h3.600"
        stroke="#8a8394"
        strokeWidth="0.900"
      />
      <circle cx="16.800" cy="18" r="4.300" fill="#fffdf8" stroke="#3b3442" strokeWidth="1.200" />
      <path data-a="clock" d="M16.800 18v-2.500" stroke="#d8453c" strokeWidth="1.300" />
      <path d="M16.800 18h1.700" stroke="#3b3442" strokeWidth="1.100" />
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
export type IconName = keyof typeof ICONS | "trial" | "endless" | "word";

/** The tile behind each practice icon takes a little of this colour. */
const TINTS: Partial<Record<IconName, string>> = {
  daily: "#f2a93b",
  challenge: "#ffb81f",
  cards: "#e6c65a",
  word: "#6aaa64",
  exam: "#8a93c9",
  strategy: "#c9862e",
};

/** The home page's racing stopwatch, flames streaming off its back, made small. */
function TrialWatch({ size }: { size: number }) {
  return (
    <svg viewBox="-52 -54 340 340" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        {[
          ["kp-fire-a", "#c2200c", "#ff5c1c"],
          ["kp-fire-b", "#ff7d1c", "#ffb93a"],
          ["kp-fire-c", "#ffd75a", "#fff6cc"],
        ].map(([id, tip, root]) => (
          <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1="-172" x2="-58">
            <stop offset="0" stopColor={tip} stopOpacity="0" />
            <stop offset="0.45" stopColor={tip} stopOpacity="0.7" />
            <stop offset="1" stopColor={root} stopOpacity="0.95" />
          </linearGradient>
        ))}
      </defs>
      {/* the fire: one body that wraps the left half of the watch and streams back from it, so no
          flame can ever sit apart from the rim. Layers go from deep red outside to pale gold at the
          heart; each fades to nothing at its tips and they show through one another, like real fire.
          Every other layer is the same shape upside down, so the tongues never line up. */}
      <g transform="translate(118 116) rotate(32)">
        <g data-a="roar">
          {(
            [
              ["a", 0.9, -1, 0.55],
              ["a", 0.9, 1, 0.9],
              ["b", 0.77, -1, 0.9],
              ["b", 0.7, 1, 0.75],
              ["c", 0.6, -1, 0.95],
            ] as const
          ).map(([tone, by, flip, show], n) => (
            <g key={n} transform={`scale(${by} ${by * flip})`} opacity={show}>
              <path
                data-a="flame"
                style={{ "--lag": `${n * -0.11}s` } as CSSProperties}
                fill={`url(#kp-fire-${tone})`}
                d="M0-78C-34-86-72-82-122-110C-96-82-88-66-92-54C-114-60-142-56-166-68C-142-40-124-26-114-12C-134-8-154 4-168 24C-140 26-118 34-104 48C-118 60-126 74-128 94C-88 88-38 88 0 78Z"
              />
            </g>
          ))}
        </g>
      </g>
      {/* wind: streaks that rush past to the left, so the watch reads as flying to the right */}
      <g data-a="gust" stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        {[
          [140, -22, 70],
          [222, 34, 46],
          [228, 198, 50],
          [140, 254, 76],
          [240, 116, 34],
        ].map(([x, y, long], i) => (
          <path
            key={i}
            data-a="wind"
            style={{ "--lag": `${i * 0.13}s` } as CSSProperties}
            d={`M${x} ${y}h${long}`}
          />
        ))}
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

/** Endless: the sign itself, in marigold paint, with a shine that travels round it. */
function EndlessSign({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={LOOP} stroke="#8a4f00" strokeWidth="4.200" strokeLinecap="round" />
      <path d={LOOP} stroke="#f2a51f" strokeWidth="3" strokeLinecap="round" />
      <path
        d={LOOP}
        data-a="shade"
        pathLength={1}
        stroke="#fff3c4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Word Line: six bordered squares that hop in turn; each round they take the next colouring, from all
 *  grey to all green, and then begin again. */
const GREY = "#c9c5cf";
const YELLOW = "#e6c34a";
const GREEN = "#5fae62";
const ROUNDS = [
  [0, 0],
  [0, 2],
  [1, 2],
  [3, 1],
  [5, 0],
  [6, 0],
];
function WordLine({ size }: { size: number }) {
  const still = useReducedMotion() ?? false;
  const [stage, setStage] = useState(0);
  const [pick, setPick] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => {
      setStage((n) => (n + 1) % ROUNDS.length);
      setPick([0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5));
    }, 1100);
    return () => clearInterval(id);
  }, [still]);
  // how many green and yellow squares this round has; `pick` says which squares get them
  const [greens, yellows] = ROUNDS[stage];
  const colour = (i: number) => {
    const rank = pick.indexOf(i);
    return rank < greens ? GREEN : rank < greens + yellows ? YELLOW : GREY;
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={`${stage} ${i}`}
          data-a="hop"
          style={{ "--n": i } as CSSProperties}
          x={2.5 + (i % 3) * 6.7}
          y={5.8 + Math.floor(i / 3) * 6.7}
          width="5.600"
          height="5.600"
          rx="1.100"
          fill={colour(i)}
          stroke="#3b3442"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  if (name === "trial") return <TrialWatch size={size} />;
  if (name === "endless") return <EndlessSign size={size} />;
  if (name === "word") return <WordLine size={size} />;
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
      <Icon name={name} size={name === "trial" ? 44 : 28} />
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
        }, 450);
      }}
    >
      {loading ? (
        <span className={styles.orb} role="img" aria-label="Loading">
          <i />
          <i />
          <i />
        </span>
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

/** The other ways to practice: one row of names, each with its icon. The same six on both sides. */
export function Modes({
  workshops = false,
  section,
}: {
  workshops?: boolean;
  /** The section these are for: its Endless mode runs the whole section. */
  section?: string;
}) {
  return (
    <section className={`${styles.glass} ${styles.modes}`} aria-label="More ways to practice">
      <header className={styles.modesHead}>
        <h2>More ways to practice</h2>
        {/* a Pro student opens the workshops coming up from here */}
        {workshops && <UpcomingWorkshops />}
      </header>
      <ul>
        {MODES.map((mode) => (
          <li key={mode.name}>
            <button
              type="button"
              className={styles.mode}
              onClick={() => {
                tick();
                if (mode.icon === "endless" && section)
                  openEndless({ kind: "section", name: section });
              }}
            >
              <Tile name={mode.icon} />
              <b>{mode.name}</b>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Endless mode for one skill or one domain, as a row like the modes above (SkillPage, DomainPage). */
export function EndlessButton({ kind, name }: { kind: "skill" | "domain"; name: string }) {
  return (
    <button
      type="button"
      className={styles.mode}
      onClick={() => {
        tick();
        openEndless({ kind, name });
      }}
    >
      <Tile name="endless" />
      <b>Endless mode</b>
    </button>
  );
}
