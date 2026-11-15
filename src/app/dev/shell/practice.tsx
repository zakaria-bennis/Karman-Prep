"use client";

// Two pieces of the Library page that are about practising, not about one skill:
//   Today: the Daily 10 and the Challenge question, each to start if it has not been done yet.
//   Modes: where time trials, endless mode, strategy quizzes, full-length exams, flashcards and the word
//          game live (founder, 2026-11-15: "we need to see where [they] live").
// The icons are Karman's own line family (24 grid, 1.6 line, a wash, one clay accent), drawn here.
// Everything is a stand-in: nothing starts yet, and the streak and the coins are made-up numbers.
import { useState, type ReactNode } from "react";
import styles from "./library.module.css";
import type { Section } from "./skills72";
import { buzz, chosen, tick } from "./sound";

const WASH = { fill: "currentColor", fillOpacity: 0.13 } as const;
const CLAY = "var(--clay)";

const ICONS = {
  // the sun coming up: once a day
  daily: (
    <>
      <path d="M2.500 18h19" />
      <path d="M6.500 18a5.500 5.500 0 0 1 11 0z" {...WASH} />
      <path
        d="M12 6v2.500M4.800 9.300l1.800 1.800M19.200 9.300l-1.800 1.800"
        stroke={CLAY}
        strokeWidth="1.900"
      />
    </>
  ),
  // a bolt: one hard question
  challenge: (
    <>
      <path d="M13.200 2.800L5.500 13.500h5.200L9.800 21.200l8.700-11.200h-5.600z" {...WASH} />
      <path
        d="M17.500 3.500l.6 1.600 1.600.6-1.600.6-.6 1.600-.6-1.600-1.600-.6 1.600-.6z"
        fill={CLAY}
        stroke="none"
      />
    </>
  ),
  trial: (
    <>
      <circle cx="12" cy="13.500" r="7.500" {...WASH} />
      <path d="M10 3h4M12 3v3" />
      <path d="M12 13.500l3-3.500" stroke={CLAY} strokeWidth="1.900" />
    </>
  ),
  endless: (
    <path d="M8 9c-2.200 0-3.800 1.600-3.800 3.500S5.800 16 8 16c3.600 0 4.400-7 8-7 2.200 0 3.800 1.600 3.800 3.500S18.200 16 16 16c-3.600 0-4.400-7-8-7z" />
  ),
  strategy: (
    <>
      <circle cx="12" cy="12" r="8.700" {...WASH} />
      <path
        d="M15.800 8.200l-2.200 5.400-5.400 2.200 2.200-5.400z"
        fill={CLAY}
        fillOpacity="0.3"
        stroke={CLAY}
      />
    </>
  ),
  exam: (
    <>
      <path
        d="M7 3.500h7l4.500 4.500v10.500a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"
        {...WASH}
      />
      <path d="M14 3.500V8h4.500" />
      <path d="M8.500 12h7M8.500 15.500h7" />
      <path d="M8.500 19h3.500" stroke={CLAY} strokeWidth="1.900" />
    </>
  ),
  cards: (
    <>
      <rect x="7.500" y="3.500" width="13" height="10.500" rx="2.200" />
      <rect x="3.500" y="9" width="13" height="11" rx="2.200" {...WASH} />
      <path d="M7 14.500h6" stroke={CLAY} strokeWidth="1.900" />
    </>
  ),
  word: (
    <>
      <rect x="2.500" y="8.700" width="5.800" height="6.600" rx="1.500" {...WASH} />
      <rect
        x="9.100"
        y="8.700"
        width="5.800"
        height="6.600"
        rx="1.500"
        fill={CLAY}
        fillOpacity="0.3"
        stroke={CLAY}
      />
      <rect x="15.700" y="8.700" width="5.800" height="6.600" rx="1.500" />
    </>
  ),
  // small marks for the facts beside a task
  list: <path d="M5 7h14M5 12h14M5 17h9" />,
  flame: (
    <path
      d="M12 3c1.500 4 6 5.500 6 11a6 6 0 0 1-12 0c0-3 2-4.500 2.800-7 1.200 1.800 1.600 3 2 4.500.9-2.500 1.500-5.500 1.200-8.500z"
      {...WASH}
    />
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.500" {...WASH} />
      <path d="M10 8v8M14.500 8l-4.500 4 4.500 4" />
    </>
  ),
  up: <path d="M5 16l5-5.500 3.500 3L19 7M14.500 7H19v4.500" />,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" strokeWidth="2.200" />,
} satisfies Record<string, ReactNode>;

export function Icon({ name, size = 24 }: { name: keyof typeof ICONS; size?: number }) {
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

const TASKS = [
  {
    key: "daily",
    icon: "daily",
    name: "Daily 10",
    what: "Ten questions across your skills. Right answers move skills up.",
    facts: [
      ["list", "10 questions"],
      ["up", "Keeps skills from slipping"],
    ],
  },
  {
    key: "challenge",
    icon: "challenge",
    name: "Challenge question",
    what: "One hard question. See how you did against everyone else.",
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
    <section
      className={`${styles.glass} ${styles.today}`}
      style={{ "--i": 1 } as React.CSSProperties}
      aria-label="Today"
    >
      <h2>Today</h2>
      <ul>
        {TASKS.map((task) => (
          <li key={task.key} data-done={done[task.key] || undefined}>
            <span className={styles.tile}>
              <Icon name={done[task.key] ? "check" : task.icon} size={26} />
            </span>
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
              <button
                type="button"
                className={styles.start}
                aria-label={`Start ${task.name}`}
                onClick={() => {
                  // nothing starts yet: the demo only shows the done state
                  setDone({ ...done, [task.key]: true });
                  chosen();
                  buzz(12);
                }}
              >
                Start
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const MODES: { icon: keyof typeof ICONS; name: string; what: string; only?: Section }[] = [
  { icon: "trial", name: "Time trials", what: "Speed and accuracy, on the clock." },
  { icon: "endless", name: "Endless mode", what: "Keep going until you stop." },
  { icon: "strategy", name: "Strategy quizzes", what: "How to approach each kind of question." },
  {
    icon: "cards",
    name: "Flashcards",
    what: "Word parts and vocabulary.",
    only: "Reading and Writing",
  },
  {
    icon: "word",
    name: "Word game",
    what: "Guess the word in six tries.",
    only: "Reading and Writing",
  },
  { icon: "exam", name: "Full-length exams", what: "A whole test, timed." },
];

/** The other ways to practise this side. */
export function Modes({ section }: { section: Section }) {
  return (
    <section className={`${styles.glass} ${styles.modes}`} aria-label="More ways to practise">
      <h2>More ways to practise</h2>
      <ul>
        {MODES.filter((m) => !m.only || m.only === section).map((mode) => (
          <li key={mode.name}>
            <button type="button" className={styles.mode} onClick={() => tick()}>
              <span className={styles.tile}>
                <Icon name={mode.icon} size={26} />
              </span>
              <span className={styles.taskWords}>
                <b>{mode.name}</b>
                <span>{mode.what}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
