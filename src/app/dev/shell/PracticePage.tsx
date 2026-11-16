"use client";

// The Practice section (Free, Practice and Pro students), in two pages like the Library:
//   PracticePage   today's two tasks, anything left unfinished, and the six ways to practise as six
//                  large buttons that fill the rest of the screen. Choosing one opens its page.
//   ModePage       one way to practise: what it is in a line, the choices to make, one Start button,
//                  and the student's own record beside it. The breakdown is a button under the record
//                  (founder: "a button under the report, not shown first").
// On a phone the first page is split in two with buttons, so nobody scrolls a long way: Today, Practise.
// It follows the Library's rules: frosted glass, one green, rounded squares, 13, 16 and 20 text, numbers
// right beside what they count, outline Start buttons, whole pieces clickable, quick plain arrivals.
// Every number and name of a quiz, deck or exam is a stand-in: no student data is read and nothing
// starts yet. What is true: how time trials tighten and how endless mode picks skills (as the site and
// the current app describe them), and the number of full-length exams in the Practice plan (offer.ts).
import { motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { QUESTION_BANK } from "@/lib/marketing/offer";
import lib from "./library.module.css";
import { GoButton, Tile, Today, type IconName } from "./practice";
import practice from "./practice.module.css";
import styles from "./practicePage.module.css";
import { SECTIONS, type Section } from "./skills72";
import { buzz, tick } from "./sound";

const SLIDE = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
const STILL = { duration: 0 } as const;

/** One line of a record: a name, sometimes a share drawn as a band, a value, sometimes a way in. */
type Row = {
  name: string;
  value?: string;
  /** 0 to 1: drawn as a band filled that far. */
  share?: number;
  /** A square before the name: done or not. */
  done?: boolean;
  /** The row can be opened. */
  open?: boolean;
};

type Choice = { label: string; options: readonly string[] | Record<Section, readonly string[]> };

export type ModeKey = "trial" | "endless" | "strategy" | "cards" | "word" | "exam";

/** A small picture of the student's record, drawn on a way's button. */
type Figure =
  /** so many rounded squares, the first `on` filled; `here` marks the last filled one */
  | { kind: "steps"; total: number; on: number; here?: boolean; ends?: readonly [string, string] }
  /** one band filled part of the way */
  | { kind: "band"; share: number }
  /** columns to compare, the tallest in the dark green */
  | { kind: "bars"; values: readonly number[]; ends?: readonly [string, string] }
  /** a slot for each thing; a filled slot carries its result */
  | { kind: "slots"; labels: readonly (string | null)[] };

type Mode = {
  icon: IconName;
  name: string;
  /** The student's own record, on the button: a number and what it counts. */
  fact: readonly [string, string];
  figure: Figure;
  /** What it is, in a line. */
  what: string;
  /** Does the student choose Reading and Writing or Math first? */
  sides: boolean;
  choice?: Choice;
  start: string;
  note?: string;
  record: { title: string; rows: Row[]; after?: string };
};

/** The pace of a time trial, in steps of 5%, from the first round to the fastest. */
const PACES = [1.25, 1.2, 1.15, 1.1, 1.05, 1, 0.95, 0.9, 0.85, 0.8, 0.75];
const PACE_NOW = 3;
const EXAMS = QUESTION_BANK.practiceTests;
const EXAMS_TAKEN = [1180, 1240];

export const MODES: Record<ModeKey, Mode> = {
  trial: {
    icon: "trial",
    name: "Time trials",
    fact: [`${PACES[PACE_NOW].toFixed(2)}x`, "the real SAT pace"],
    figure: {
      kind: "steps",
      total: PACES.length,
      on: PACE_NOW + 1,
      here: true,
      ends: [`${PACES[0].toFixed(2)}x`, `${PACES[PACES.length - 1].toFixed(2)}x`],
    },
    what: "One section against the clock. The clock tightens each round, as long as your accuracy holds.",
    sides: true,
    start: "Start time trial",
    record: {
      title: "Your last rounds",
      rows: [
        { name: "1.10x pace", share: 0.82, value: "82% right" },
        { name: "1.15x pace", share: 0.86, value: "86% right" },
        { name: "1.20x pace", share: 0.91, value: "91% right" },
        { name: "1.25x pace", share: 0.77, value: "77% right" },
      ],
      after: "Review your mistakes",
    },
  },
  endless: {
    icon: "endless",
    name: "Endless mode",
    fact: ["42", "questions, your longest run"],
    figure: { kind: "bars", values: [12, 28, 42, 19, 33, 24], ends: ["Six runs ago", "Last run"] },
    what: "Practice with no clock that keeps going. Each round is on the skill you need most.",
    sides: true,
    choice: { label: "Questions from", options: ["The skill I need most", "My mistakes"] },
    start: "Start endless mode",
    record: {
      title: "Your mistake log",
      rows: [
        { name: "Transitions", value: "4 missed", open: true },
        { name: "Linear inequalities", value: "3 missed", open: true },
        { name: "Command of evidence", value: "3 missed", open: true },
        { name: "Circles", value: "2 missed", open: true },
      ],
    },
  },
  strategy: {
    icon: "strategy",
    name: "Strategy quizzes",
    fact: ["5", "of 14 done"],
    figure: { kind: "steps", total: 14, on: 5 },
    what: "Short quizzes on how to take the test, not on what is in it.",
    sides: true,
    start: "Start the next quiz",
    record: {
      title: "Strategies",
      rows: [
        { name: "Pacing a module", done: true, value: "Done" },
        { name: "Crossing out wrong answers", done: true, value: "Done" },
        { name: "Reading the question first", done: true, value: "Done" },
        { name: "When to guess and move on", done: false, value: "Next" },
        { name: "Checking with the calculator", done: false, value: "Not started" },
      ],
    },
  },
  cards: {
    icon: "cards",
    name: "Flashcards",
    fact: ["236", "of 600 cards known"],
    figure: { kind: "band", share: 236 / 600 },
    what: "Flip through a deck until you know every card.",
    sides: true,
    choice: {
      label: "Deck",
      options: {
        "Reading and Writing": ["Words in context", "Transitions", "Grammar rules"],
        Math: ["Formulas", "Math vocabulary", "Graph shapes"],
      },
    },
    start: "Start flashcards",
    record: {
      title: "Your decks",
      rows: [
        { name: "Words in context", share: 96 / 240, value: "96 of 240" },
        { name: "Transitions", share: 44 / 60, value: "44 of 60" },
        { name: "Grammar rules", share: 38 / 90, value: "38 of 90" },
        { name: "Formulas", share: 58 / 80, value: "58 of 80" },
      ],
    },
  },
  word: {
    icon: "word",
    name: "Word Line",
    fact: ["9", "words solved"],
    figure: { kind: "bars", values: [0, 1, 3, 4, 1, 0], ends: ["1 try", "6 tries"] },
    what: "One SAT word to work out, new every day.",
    sides: false,
    start: "Play today's word",
    record: {
      title: "How many tries you took",
      rows: [
        { name: "2 tries", share: 1 / 4, value: "1" },
        { name: "3 tries", share: 3 / 4, value: "3" },
        { name: "4 tries", share: 1, value: "4" },
        { name: "5 tries", share: 1 / 4, value: "1" },
      ],
    },
  },
  exam: {
    icon: "exam",
    name: "Full-length exams",
    fact: [String(EXAMS_TAKEN.length), `of ${EXAMS} taken`],
    figure: {
      kind: "slots",
      labels: Array.from({ length: EXAMS }, (_, i) =>
        i < EXAMS_TAKEN.length ? String(EXAMS_TAKEN[i]) : null
      ),
    },
    what: "The whole test in one timed sitting, with a score at the end.",
    sides: false,
    start: `Start practice exam ${EXAMS_TAKEN.length + 1}`,
    note: "2 hours 14 minutes, in one sitting.",
    record: {
      title: "Your exams",
      rows: Array.from({ length: EXAMS }, (_, i) => ({
        name: `Practice exam ${i + 1}`,
        done: i < EXAMS_TAKEN.length,
        value: i < EXAMS_TAKEN.length ? String(EXAMS_TAKEN[i]) : "Not taken",
        open: i < EXAMS_TAKEN.length,
      })),
    },
  },
};
const ORDER: ModeKey[] = ["trial", "endless", "strategy", "cards", "word", "exam"];

const CHEVRON = (
  <svg className={styles.chev} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
  </svg>
);

function Fig({ figure }: { figure: Figure }) {
  const ends = "ends" in figure && figure.ends && (
    <span className={styles.ends}>
      <span>{figure.ends[0]}</span>
      <span>{figure.ends[1]}</span>
    </span>
  );
  if (figure.kind === "band")
    return (
      <span className={styles.figure} aria-hidden="true">
        <span className={styles.band}>
          <i style={{ width: `${figure.share * 100}%` }} />
        </span>
      </span>
    );
  if (figure.kind === "steps")
    return (
      <span className={styles.figure} aria-hidden="true">
        <span className={styles.steps} style={{ "--n": figure.total } as CSSProperties}>
          {Array.from({ length: figure.total }, (_, i) => (
            <i
              key={i}
              data-on={i < figure.on || undefined}
              data-here={(figure.here && i === figure.on - 1) || undefined}
              style={{ "--s": i } as CSSProperties}
            />
          ))}
        </span>
        {ends}
      </span>
    );
  if (figure.kind === "bars") {
    const top = Math.max(...figure.values);
    return (
      <span className={styles.figure} aria-hidden="true">
        <span className={styles.bars}>
          {figure.values.map((value, i) => (
            <i
              key={i}
              data-top={value === top || undefined}
              data-none={value === 0 || undefined}
              style={{ "--h": value / top, "--s": i } as CSSProperties}
            />
          ))}
        </span>
        {ends}
      </span>
    );
  }
  return (
    <span className={styles.figure} aria-hidden="true">
      <span className={styles.slots} style={{ "--n": figure.labels.length } as CSSProperties}>
        {figure.labels.map((label, i) => (
          <i key={i} data-on={label !== null || undefined}>
            {label}
          </i>
        ))}
      </span>
    </span>
  );
}

/** Work that was begun and not finished: it can be picked up again. */
const UNFINISHED = [
  { icon: "trial", name: "Time trial", where: "Math, question 14 of 22", share: 14 / 22 },
  { icon: "exam", name: "Practice exam 3", where: "Module 2 of 4", share: 1 / 4 },
] as const;

function Unfinished() {
  return (
    <section className={`${lib.glass} ${practice.today}`} aria-label="Unfinished">
      <h2>Unfinished</h2>
      <ul>
        {UNFINISHED.map((item) => (
          <li key={item.name} className={practice.task}>
            <Tile name={item.icon} />
            <span className={practice.taskWords}>
              <b>{item.name}</b>
              <span>{item.where}</span>
              <span className={styles.band} aria-hidden="true">
                <i style={{ width: `${item.share * 100}%` }} />
              </span>
            </span>
            <GoButton label={`Resume ${item.name}`}>Resume</GoButton>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PAGES = ["Today", "Practise"] as const;

export default function PracticePage({
  rail,
  onMode,
}: {
  rail: boolean;
  onMode: (mode: ModeKey) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [page, setPage] = useState<(typeof PAGES)[number]>("Today");
  const show = (name: (typeof PAGES)[number]) => rail || page === name;
  return (
    <div className={`${lib.library} ${styles.page}`}>
      {!rail && (
        <div className={lib.pager} role="group" aria-label="Page">
          {PAGES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={page === name}
              onClick={() => {
                setPage(name);
                tick();
              }}
            >
              {page === name && (
                <motion.span
                  layoutId="practice-pager"
                  className={lib.lens}
                  transition={still ? STILL : SLIDE}
                />
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}

      {show("Today") && (
        <div className={styles.lead}>
          <Today />
          <Unfinished />
        </div>
      )}

      {show("Practise") && (
        <section className={`${lib.glass} ${styles.ways}`} aria-label="Ways to practise">
          <h2>Ways to practise</h2>
          <ul>
            {ORDER.map((key) => {
              const mode = MODES[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`${practice.mode} ${styles.way}`}
                    onClick={() => {
                      tick();
                      buzz(8);
                      onMode(key);
                    }}
                  >
                    <Tile name={mode.icon} big />
                    <span className={styles.wayWords}>
                      <b>{mode.name}</b>
                      <span className={styles.fact}>
                        <b>{mode.fact[0]}</b> {mode.fact[1]}
                      </span>
                    </span>
                    {CHEVRON}
                    <Fig figure={mode.figure} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A bar of choices with a lens on the chosen one. */
function Pick<T extends string>({
  id,
  label,
  options,
  value,
  onPick,
}: {
  id: string;
  label: string;
  options: readonly T[];
  value: T;
  onPick: (next: T) => void;
}) {
  const still = useReducedMotion() ?? false;
  return (
    <div className={styles.pick}>
      <span>{label}</span>
      <div className={lib.filter} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => {
              onPick(option);
              tick();
            }}
          >
            {value === option && (
              <motion.span layoutId={id} className={lib.lens} transition={still ? STILL : SLIDE} />
            )}
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** One way to practise: the choices and Start on one piece of glass, the student's record on another. */
export function ModePage({ mode: key }: { mode: ModeKey }) {
  const mode = MODES[key];
  const [side, setSide] = useState<Section>(SECTIONS[0]);
  const options = mode.choice
    ? Array.isArray(mode.choice.options)
      ? (mode.choice.options as readonly string[])
      : (mode.choice.options as Record<Section, readonly string[]>)[side]
    : [];
  const [chosen, setChosen] = useState(0);
  const banded = mode.record.rows.some((row) => row.share !== undefined);
  return (
    <div className={`${lib.library} ${styles.modePage}`}>
      <section className={`${lib.glass} ${styles.setup}`}>
        <div className={styles.what}>
          <Tile name={mode.icon} big />
          <p>{mode.what}</p>
        </div>

        {key === "trial" && (
          <div className={styles.pace}>
            <p>
              Your pace <b>{PACES[PACE_NOW].toFixed(2)}x</b> the real SAT time
            </p>
            <Fig figure={mode.figure} />
          </div>
        )}

        {mode.sides && (
          <Pick
            id={`${key}-side`}
            label="Section"
            options={SECTIONS}
            value={side}
            onPick={(next) => {
              setSide(next);
              setChosen(0);
            }}
          />
        )}
        {mode.choice && (
          <Pick
            id={`${key}-choice`}
            label={mode.choice.label}
            options={options}
            value={options[chosen] ?? options[0]}
            onPick={(next) => setChosen(options.indexOf(next))}
          />
        )}

        <div className={styles.start}>
          <GoButton wide>{mode.start}</GoButton>
          {mode.note && <p className={lib.bank}>{mode.note}</p>}
        </div>
      </section>

      <section className={`${lib.glass} ${styles.record}`} aria-label={mode.record.title}>
        <h2>{mode.record.title}</h2>
        <ul data-banded={banded || undefined}>
          {mode.record.rows.map((row) => {
            const inner = (
              <>
                {row.done !== undefined && (
                  <i className={styles.mark} data-on={row.done || undefined} />
                )}
                <span className={styles.rowName}>{row.name}</span>
                {row.share !== undefined && (
                  <span className={styles.band} aria-hidden="true">
                    <i style={{ width: `${row.share * 100}%` }} />
                  </span>
                )}
                {row.value && <span className={styles.value}>{row.value}</span>}
                {row.open && CHEVRON}
              </>
            );
            return (
              <li key={row.name}>
                {row.open ? (
                  <button type="button" className={styles.row} onClick={() => tick()}>
                    {inner}
                  </button>
                ) : (
                  <span className={styles.row}>{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
        {mode.record.after && (
          <button type="button" className={`${styles.row} ${styles.after}`} onClick={() => tick()}>
            <span className={styles.rowName}>{mode.record.after}</span>
            {CHEVRON}
          </button>
        )}
      </section>
    </div>
  );
}
