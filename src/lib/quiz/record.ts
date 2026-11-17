// What is written down while a student answers (founder, 2026-11-17: "collect as much data as
// humanly possible to train the algorithm for our adaptive tests", to help tutors know the
// student, and to know "with as much information as possible if the student is cheating").
//
// The quiz engine tells this file what happened (a question came up, a choice was picked, the
// page was left) and it keeps one record a question and one a sitting. It is plain arithmetic on
// the times it is given, so it runs the same in the browser, on the server and in a test.
//
// A question's record holds:
//   time      how long it was really worked on (the page in front, the student not idle), how
//             long the page was away, how long nothing was touched, and how long until the
//             first thing was done
//   answers   every choice picked, in order, each with its time (so a change of mind, and which
//             way it went, can be read back), and every choice crossed out
//   tools     how often and how long the calculator was open; how long the explanation was read
//   conduct   times the page was left, and anything pasted or copied
//   setting   where the question came in the sitting, the order its choices were shown in, its
//             difficulty at the time, and how it was answered (touch, mouse or keys)
// Nothing here decides anything about a student: integrity.ts reads these records and lists what
// a tutor may want to look at.

/** A student who has touched nothing for this long is counted idle until they touch something. */
export const IDLE_AFTER_MS = 30_000;

export type Input = "touch" | "mouse" | "keys";

export interface Pick {
  /** The choice: its letter, or for a typed answer what was typed. */
  choice: string;
  /** Working time on the question when it was picked, in ms. */
  at: number;
}

export interface QuestionRecord {
  questionId: string;
  /** Its place in the sitting, counted from 0, in the order questions were first shown. */
  position: number;
  /** The order its choices were shown in, by letter. */
  order: string[];
  /** The question's difficulty when it was asked, if the bank gave one. */
  level: number | null;
  /** When it first came up (clock time, ms). */
  shownAt: number;
  /** Working time before the first pick or cross-out; null if nothing was done. */
  firstActionMs: number | null;
  picks: Pick[];
  crossed: { choice: string; on: boolean; at: number }[];
  /** The answer given; null when time ran out or it was left unanswered. */
  answer: string | null;
  right: boolean | null;
  /** Working time when the answer was given. */
  answeredMs: number | null;
  /** Time with the page in front and the student not idle, while the question was open. */
  activeMs: number;
  /** Time with the page hidden or the window not in front, and how many times it was left. */
  awayMs: number;
  aways: number;
  /** Time past the idle limit with nothing touched. */
  idleMs: number;
  calculatorOpens: number;
  calculatorMs: number;
  /** Time the explanation was on screen. */
  explanationMs: number;
  /** Times the question was opened (more than 1 means it was come back to). */
  visits: number;
  /** Marked to come back to (the test's own "mark for review"). */
  marked: boolean;
  pastes: number;
  copies: number;
  /** How the answer was given. */
  input: Input | null;
}

export interface Device {
  width: number;
  height: number;
  /** A touch screen with no fine pointer. */
  touch: boolean;
  /** Minutes the device's clock is from UTC. */
  utcOffset: number;
}

export interface SittingRecord {
  id: string;
  /** "skill", "daily", "trial" and so on (the engine's own names). */
  mode: string;
  /** What it was for: a skill's name, or nothing. */
  skill: string | null;
  /** The homework it answers, if it was assigned. */
  assignmentId: string | null;
  startedAt: number;
  endedAt: number | null;
  device: Device;
  questions: QuestionRecord[];
}

export type Happened =
  | { type: "shown"; questionId: string; order: string[]; level?: number | null }
  | { type: "picked"; choice: string; input: Input | null }
  | { type: "crossed"; choice: string; on: boolean }
  | { type: "answered"; right: boolean | null }
  | { type: "away" }
  | { type: "back" }
  | { type: "touched" }
  | { type: "calculator"; open: boolean }
  | { type: "explanation"; open: boolean }
  | { type: "marked"; on: boolean }
  | { type: "pasted" }
  | { type: "copied" }
  | { type: "ended" };

/** The record, and what is going on at the moment (which is not kept once the sitting ends). */
export interface Sitting {
  record: SittingRecord;
  /** The question open now, by its place in `record.questions`; -1 for none. */
  open: number;
  /** When the clock was last read. */
  now: number;
  away: boolean;
  /** When anything was last touched. */
  touchedAt: number;
  calculatorOpen: boolean;
  explanationOpen: boolean;
}

export function begin(
  id: string,
  about: { mode: string; skill?: string | null; assignmentId?: string | null; device: Device },
  now: number
): Sitting {
  return {
    record: {
      id,
      mode: about.mode,
      skill: about.skill ?? null,
      assignmentId: about.assignmentId ?? null,
      startedAt: now,
      endedAt: null,
      device: about.device,
      questions: [],
    },
    open: -1,
    now,
    away: false,
    touchedAt: now,
    calculatorOpen: false,
    explanationOpen: false,
  };
}

const blank = (
  questionId: string,
  position: number,
  order: string[],
  level: number | null,
  now: number
): QuestionRecord => ({
  questionId,
  position,
  order,
  level,
  shownAt: now,
  firstActionMs: null,
  picks: [],
  crossed: [],
  answer: null,
  right: null,
  answeredMs: null,
  activeMs: 0,
  awayMs: 0,
  aways: 0,
  idleMs: 0,
  calculatorOpens: 0,
  calculatorMs: 0,
  explanationMs: 0,
  visits: 0,
  marked: false,
  pastes: 0,
  copies: 0,
  input: null,
});

/** The time from `from` to `to` that falls after the idle limit ran out at `touchedAt`. */
const idleIn = (from: number, to: number, touchedAt: number) =>
  Math.max(0, to - Math.max(from, touchedAt + IDLE_AFTER_MS));

/** Moves the clock to `now`, giving the time since it was last read to whatever was going on. */
function pass(s: Sitting, now: number): Sitting {
  const span = Math.max(0, now - s.now);
  const q = s.record.questions[s.open];
  if (!q || span === 0) return { ...s, now: Math.max(now, s.now) };
  const next = { ...q };
  if (s.away) next.awayMs += span;
  else {
    const idle = idleIn(s.now, now, s.touchedAt);
    next.idleMs += idle;
    const active = span - idle;
    // an answered question's time is its explanation's; before that it is the question's own
    if (s.explanationOpen) next.explanationMs += active;
    else if (q.answeredMs === null) next.activeMs += active;
    if (s.calculatorOpen) next.calculatorMs += active;
  }
  const questions = s.record.questions.slice();
  questions[s.open] = next;
  return { ...s, now, record: { ...s.record, questions } };
}

const edit = (s: Sitting, change: (q: QuestionRecord) => QuestionRecord): Sitting => {
  const q = s.record.questions[s.open];
  if (!q) return s;
  const questions = s.record.questions.slice();
  questions[s.open] = change(q);
  return { ...s, record: { ...s.record, questions } };
};

/** What happened, and when: gives back the sitting with it written down. */
export function note(sitting: Sitting, what: Happened, now: number): Sitting {
  let s = pass(sitting, now);
  // anything the student does ends an idle spell; leaving and coming back are not "doing"
  if (what.type !== "away" && what.type !== "ended") s = { ...s, touchedAt: s.now };
  switch (what.type) {
    case "shown": {
      const at = s.record.questions.findIndex((q) => q.questionId === what.questionId);
      const questions = s.record.questions.slice();
      const open = at === -1 ? questions.length : at;
      const q =
        at === -1
          ? blank(what.questionId, open, what.order, what.level ?? null, s.now)
          : questions[at];
      questions[open] = { ...q, visits: q.visits + 1 };
      return {
        ...s,
        open,
        calculatorOpen: false,
        explanationOpen: false,
        record: { ...s.record, questions },
      };
    }
    case "picked":
      return edit(s, (q) =>
        q.answeredMs !== null
          ? q
          : {
              ...q,
              firstActionMs: q.firstActionMs ?? q.activeMs,
              picks:
                q.picks.at(-1)?.choice === what.choice
                  ? q.picks
                  : [...q.picks, { choice: what.choice, at: q.activeMs }],
              input: what.input ?? q.input,
            }
      );
    case "crossed":
      return edit(s, (q) =>
        q.answeredMs !== null
          ? q
          : {
              ...q,
              firstActionMs: q.firstActionMs ?? q.activeMs,
              crossed: [...q.crossed, { choice: what.choice, on: what.on, at: q.activeMs }],
            }
      );
    case "answered":
      return edit(s, (q) =>
        q.answeredMs !== null
          ? q
          : {
              ...q,
              answer: q.picks.at(-1)?.choice ?? null,
              right: what.right,
              answeredMs: q.activeMs,
            }
      );
    case "away":
      return s.away ? s : { ...edit(s, (q) => ({ ...q, aways: q.aways + 1 })), away: true };
    case "back":
      return { ...s, away: false };
    case "touched":
      return s;
    case "calculator":
      if (what.open === s.calculatorOpen) return s;
      return {
        ...edit(s, (q) => (what.open ? { ...q, calculatorOpens: q.calculatorOpens + 1 } : q)),
        calculatorOpen: what.open,
      };
    case "explanation":
      return { ...s, explanationOpen: what.open };
    case "marked":
      return edit(s, (q) => ({ ...q, marked: what.on }));
    case "pasted":
      return edit(s, (q) => ({ ...q, pastes: q.pastes + 1 }));
    case "copied":
      return edit(s, (q) => ({ ...q, copies: q.copies + 1 }));
    case "ended":
      return {
        ...s,
        open: -1,
        calculatorOpen: false,
        explanationOpen: false,
        record: { ...s.record, endedAt: s.now },
      };
  }
}

// ---- reading a record back ----

/** The first choice picked, when it was not the one answered with: a change of mind. */
export const firstPick = (q: QuestionRecord) => q.picks[0]?.choice ?? null;
export const changedMind = (q: QuestionRecord) =>
  q.answer !== null && q.picks.length > 0 && q.picks[0].choice !== q.answer;
/** Whether the answer went from right to wrong, wrong to right or wrong to wrong. */
export function changeOf(
  q: QuestionRecord,
  correct: string
): "none" | "to-right" | "to-wrong" | "wrong-wrong" {
  if (!changedMind(q)) return "none";
  if (q.answer === correct) return "to-right";
  return q.picks[0].choice === correct ? "to-wrong" : "wrong-wrong";
}

export function totals(record: SittingRecord) {
  const done = record.questions.filter((q) => q.answeredMs !== null);
  const sum = (pick: (q: QuestionRecord) => number) =>
    record.questions.reduce((n, q) => n + pick(q), 0);
  return {
    asked: record.questions.length,
    answered: done.filter((q) => q.answer !== null).length,
    right: done.filter((q) => q.right).length,
    activeMs: sum((q) => q.activeMs),
    awayMs: sum((q) => q.awayMs),
    idleMs: sum((q) => q.idleMs),
    aways: sum((q) => q.aways),
    changed: done.filter(changedMind).length,
  };
}
