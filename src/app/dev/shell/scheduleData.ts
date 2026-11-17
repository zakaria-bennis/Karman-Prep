// Schedule: the rules, and stand-in sessions to show them with (founder, 2026-11-16; his answers are
// in the project's notes). Only Private 10 and Private 20 students have this tab.
//   Hours     Time is counted in hours, not sessions. A session is 60, 90 or 120 minutes; Private 10
//             books 60 minutes a week at most. Hours run out 12 months after they were bought.
//   Booking   At least 24 hours ahead and at most 4 weeks ahead, always with the student's own tutor.
//             Times are shown in the student's own time, with no time zone written anywhere.
//   Changes   With more than 24 hours to go a session can be moved or canceled (the hours go back).
//             Moving is limited to three a month. Inside 24 hours there is one free pass a package,
//             which the tutor can give back.
//   The day   Join opens 5 minutes before. A student who has not joined 10 minutes in loses the
//             session, which still ends on time. If the tutor misses it, the hours go back with 30
//             minutes more.
//   After     The recording, the tutor's notes, what was covered and the homework set, for 6 months.
// Nothing here reads or writes a real booking yet.
import { GUARANTEE, PRIVATE_PACKAGES } from "@/lib/marketing/offer";
import { DAY, TODAY } from "./progressData";
import { guessPlace, skyAt, type Place, type Sky } from "@/lib/schedule/sun";
import { SECTIONS, SKILLS } from "./skills72";

export { DAY };
export const MIN = 60_000;
export const HOUR = 3_600_000;

export const RULES = {
  noticeHours: GUARANTEE.private.cancelHours,
  aheadDays: 28,
  joinMinutes: 5,
  graceMinutes: 10,
  movesAMonth: 3,
  expiryMonths: 12,
  recordingMonths: 6,
  tutorMissMinutes: 30,
  hourPrice: GUARANTEE.private.extraSessionPrice,
} as const;

export type Pack = "private-10" | "private-20";
export type Length = 60 | 90 | 120;
export const LENGTHS: Length[] = [60, 90, 120];
/** Private 10 has 60 minutes a week; Private 20 chooses. */
export const lengthsFor = (pack: Pack): Length[] => (pack === "private-10" ? [60] : LENGTHS);
export const hoursIn = (pack: Pack) => PRIVATE_PACKAGES.find((p) => p.id === pack)!.hours;

export interface Recap {
  notes: string;
  covered: string[];
  homework: string[];
}
export interface Session {
  id: string;
  start: number;
  minutes: Length;
  /** What the student asked to work on. */
  focus: string[];
  note?: string;
  state: "booked" | "done" | "missed" | "canceled";
  /** Booked as the same time every week. */
  weekly?: boolean;
  joined?: boolean;
  recap?: Recap;
}
export interface Account {
  pack: Pack;
  /** Hours bought in all, and when the package began. */
  bought: number;
  boughtAt: number;
  /** Minutes given back on top (the tutor missed a session). */
  bonusMinutes: number;
  /** The one free change inside 24 hours. */
  latePass: boolean;
  /** When each move was made, to count this month's. */
  moves: number[];
  sessions: Session[];
}

export const TUTOR = "Jordan Ellis";
export const SAT_DAY = TODAY.getTime() + 20 * DAY;

export const endOf = (s: Session) => s.start + s.minutes * MIN;
const dayStart = (t: number) => new Date(t).setHours(0, 0, 0, 0);
/** The Monday that begins a time's week. */
export const weekStart = (t: number) => {
  const d = new Date(dayStart(t));
  return d.getTime() - ((d.getDay() + 6) % 7) * DAY;
};

// ---- hours ----

export function hours(account: Account) {
  const sum = (states: Session["state"][]) =>
    account.sessions
      .filter((s) => states.includes(s.state))
      .reduce((n, s) => n + s.minutes / 60, 0);
  const total = account.bought + account.bonusMinutes / 60;
  const used = sum(["done", "missed"]);
  const booked = sum(["booked"]);
  return { total, used, booked, left: Math.max(0, total - used - booked) };
}

export const expiresAt = (account: Account) => {
  const d = new Date(account.boughtAt);
  d.setMonth(d.getMonth() + RULES.expiryMonths);
  return d.getTime();
};

/** "7.5" or "7": hours never need more than a half. */
export const hoursText = (n: number) => String(Math.round(n * 2) / 2);
export const priceOf = (count: number) =>
  (count * RULES.hourPrice).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(count * RULES.hourPrice) ? 0 : 2,
  });

// ---- the tutor's open times (a stand-in: weekday afternoons and Saturday mornings) ----

const STEP = 30;
/** The same "taken by someone else" answer for the same slot on every load. */
const taken = (t: number) => {
  // by the hour, as a tutor's other students would hold it
  let x = Math.floor(t / HOUR) + Math.floor(t / DAY) * 7919;
  x = Math.imul(x ^ (x >>> 3), 0x45d9f3b);
  x ^= x >>> 13;
  return (x >>> 0) % 10 < 3;
};

function tutorStarts(day: number): number[] {
  const weekday = new Date(day).getDay();
  const [from, to] = weekday === 0 ? [0, 0] : weekday === 6 ? [9, 14] : [15, 21];
  const out: number[] = [];
  for (let h = from; h < to; h += STEP / 60) out.push(day + h * HOUR);
  return out;
}

export interface DayChoice {
  day: number;
  /** Start times with room for the asked length. */
  times: number[];
  /** Every time the tutor works that day that the length fits in, open or not: the ones that
   *  are not open are shown grayed out. */
  slots: { t: number; open: boolean }[];
  /** Why nothing can be booked this day, when that is a rule and not a full day. */
  why?: "week" | "hours";
}

/** The days that can be booked from `now`, each with its open times for a session of `minutes`.
 *  `moving` is the session being moved: its own time and its own week do not count against it. */
export function choices(
  account: Account,
  now: number,
  minutes: Length,
  moving?: Session,
  full = false
): DayChoice[] {
  const first = now + RULES.noticeHours * HOUR;
  const last = now + RULES.aheadDays * DAY;
  const mine = account.sessions.filter((s) => s.state === "booked" && s.id !== moving?.id);
  const left = hours(account).left + (moving ? moving.minutes / 60 : 0);
  const days: DayChoice[] = [];
  const shut = (day: number) => {
    const starts = tutorStarts(day);
    return starts
      .filter((t) => starts.includes(t + (minutes - STEP) * MIN))
      .map((t) => ({ t, open: false }));
  };
  for (let day = dayStart(first); day <= dayStart(last); day += DAY) {
    // a day of 23 or 25 hours (the clocks changing) still begins at midnight
    day = dayStart(day + HOUR);
    if (left < minutes / 60) {
      days.push({ day, times: [], slots: shut(day), why: "hours" });
      continue;
    }
    if (account.pack === "private-10" && mine.some((s) => weekStart(s.start) === weekStart(day))) {
      days.push({ day, times: [], slots: shut(day), why: "week" });
      continue;
    }
    const open = (t: number) =>
      !full &&
      t >= first &&
      t <= last &&
      !taken(t) &&
      !mine.some((s) => t < endOf(s) && t + STEP * MIN > s.start);
    const starts = tutorStarts(day);
    const fits = starts.filter((t) => starts.includes(t + (minutes - STEP) * MIN));
    const free = (t: number) => {
      for (let part = t; part < t + minutes * MIN; part += STEP * MIN)
        if (!open(part)) return false;
      return true;
    };
    const slots = fits.map((t) => ({ t, open: free(t) }));
    days.push({ day, times: slots.filter((slot) => slot.open).map((slot) => slot.t), slots });
  }
  // a first day too close to book anything on is not shown
  while (days.length > 1 && days[0].times.length === 0 && !days[0].why) days.shift();
  return days;
}

/** The same time in the weeks after `start` that are open and paid for, inside the four weeks. */
export function weeklyAfter(
  account: Account,
  now: number,
  start: number,
  minutes: Length
): number[] {
  const days = choices(account, now, minutes);
  let room = hours(account).left - minutes / 60;
  const out: number[] = [];
  for (let n = 1; n <= 4; n++) {
    const at = new Date(start);
    at.setDate(at.getDate() + n * 7);
    const t = at.getTime();
    if (room < minutes / 60) break;
    if (days.some((d) => d.times.includes(t))) {
      out.push(t);
      room -= minutes / 60;
    }
  }
  return out;
}

// ---- changing a session ----

export const movesLeft = (account: Account, now: number) => {
  const month = new Date(now).getMonth();
  const year = new Date(now).getFullYear();
  const made = account.moves.filter(
    (t) => new Date(t).getMonth() === month && new Date(t).getFullYear() === year
  ).length;
  return Math.max(0, RULES.movesAMonth - made);
};
/** The first of next month, when the moves come back. */
export const movesBack = (now: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
};

export interface Change {
  /** Inside 24 hours: a change spends the free pass. */
  late: boolean;
  move: boolean;
  cancel: boolean;
  why?: "started" | "pass" | "moves";
}
export function changeOf(account: Account, session: Session, now: number): Change {
  if (now >= session.start) return { late: true, move: false, cancel: false, why: "started" };
  const late = session.start - now < RULES.noticeHours * HOUR;
  if (late && !account.latePass) return { late, move: false, cancel: false, why: "pass" };
  const moves = movesLeft(account, now) > 0;
  return { late, move: moves, cancel: true, why: moves ? undefined : "moves" };
}

// ---- the day of a session ----

export type Door = "early" | "open" | "in" | "closed" | "over";
/** Join opens 5 minutes before. Not joined 10 minutes in, the session is closed and its hours used. */
export function doorOf(session: Session, now: number): Door {
  if (now >= endOf(session)) return "over";
  if (session.joined) return "in";
  if (now < session.start - RULES.joinMinutes * MIN) return "early";
  if (now > session.start + RULES.graceMinutes * MIN) return "closed";
  return "open";
}

/** A recording can be watched for 6 months after its session. */
export const recordingUntil = (session: Session) => {
  const d = new Date(session.start);
  d.setMonth(d.getMonth() + RULES.recordingMonths);
  return d.getTime();
};

// ---- what to work on: the five skills that most need it ----

export interface Pick {
  skill: string;
  subject: "rw" | "math";
  /** 0 Not started, 1 Learning, 2 Understanding, 3 Proficient. */
  level: number;
}
/** The skills that most need work, most needed first: the lowest level first, and among skills on
 *  the same level the two subjects take turns, so the list is never all one subject. (The levels
 *  are the Library's; when real results are read, this is where they come in.) */
export function recommend(skills: Pick[], count = 5): Pick[] {
  const byLevel = [...skills].sort((a, b) => a.level - b.level);
  const out: Pick[] = [];
  while (out.length < count && byLevel.length > 0) {
    const level = byLevel[0].level;
    const last = out[out.length - 1]?.subject;
    const at = byLevel.findIndex((s) => s.level === level && s.subject !== last);
    out.push(byLevel.splice(at === -1 ? 0 : at, 1)[0]);
  }
  return out;
}
export const RECOMMENDED: Pick[] = recommend(
  SECTIONS.flatMap((section) =>
    SKILLS[section].flatMap((domain) =>
      domain.skills.map((skill) => ({
        skill: skill.name,
        subject: section === "Math" ? ("math" as const) : ("rw" as const),
        level: skill.level,
      }))
    )
  )
);
const WEAKEST = RECOMMENDED.map((pick) => pick.skill);

/** Which subject a skill belongs to, for its color (fuchsia for Reading and Writing, blue for Math). */
export const subjectOf = (skill: string): "rw" | "math" =>
  SKILLS.Math.some((domain) => domain.skills.some((s) => s.name === skill)) ? "math" : "rw";

/** What the sky is doing at a time, where the student is: it chooses the small picture beside a
 *  time (a rising sun, a sun, a setting sun, a moon) and its color. The place is guessed from the
 *  device's time zone; see src/lib/schedule/sun.ts. */
let place: Place | null = null;
export const skyOf = (t: number): Sky => {
  place ??= guessPlace(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset()
  );
  return skyAt(t, place);
};
export type { Sky };

// ---- words ----

export const clock = (t: number) =>
  new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const dateLong = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
export const dateShort = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export const monthDay = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const lengthText = (minutes: number) =>
  minutes === 60 ? "1 hour" : minutes === 90 ? "1.5 hours" : "2 hours";

// ---- stand-in accounts ----

const at = (days: number, hour: number) => TODAY.getTime() + days * DAY + hour * HOUR;
let n = 0;
export const newId = () => `s${n++}`;
const past = (
  days: number,
  hour: number,
  minutes: Length,
  recap: Recap,
  focus: string[]
): Session => ({
  id: newId(),
  start: at(days, hour),
  minutes,
  focus,
  state: "done",
  joined: true,
  recap,
});

const HISTORY: Session[] = [
  past(
    -4,
    16.5,
    60,
    {
      notes:
        "We worked through linear equations from word problems. You set them up well once you name the unknown first. Slow down on the last step: two answers were lost to sign slips, not to method.",
      covered: ["Equations from words", "Solving linear equations"],
      homework: ["Skill set: Equations from words", "Time trial: Solving linear equations"],
    },
    ["Equations from words"]
  ),
  past(
    -11,
    16.5,
    90,
    {
      notes:
        "Went over full-length exam 2 together. Reading held steady. Most of the missed Math questions were in the second module, where pacing slipped after question 14. We practiced skipping and coming back.",
      covered: ["Slope and rate of change", "Number of solutions", "Transitions: contrast"],
      homework: ["Strategy quiz: Pacing the second module", "Skill set: Number of solutions"],
    },
    ["Slope and rate of change"]
  ),
  past(
    -18,
    10,
    60,
    {
      notes:
        "Punctuation day. Colons and dashes are now solid. Commas around extra details still need the read-it-without-it test every time.",
      covered: ["Colons and dashes", "Essential and extra details"],
      homework: ["Skill set: Essential and extra details"],
    },
    ["Colons and dashes"]
  ),
  past(
    -25,
    16.5,
    60,
    {
      notes:
        "First session. We set a plan from your diagnostic: Algebra first, then punctuation, with one full-length exam every Saturday.",
      covered: ["Solving linear equations"],
      homework: ["Skill set: Solving linear equations", "Flashcards: Transition words"],
    },
    []
  ),
  // older than six months: its recording is gone
  past(
    -196,
    16.5,
    60,
    {
      notes: "A trial session before the package began: a look at the test and how it adapts.",
      covered: ["Main idea"],
      homework: [],
    },
    []
  ),
];

/** A fresh stand-in account. `soon` puts the next session minutes from now, to see Join. */
export function standIn(
  pack: Pack,
  now: number,
  opts: { soon?: number; empty?: boolean } = {}
): Account {
  const upcoming: Session[] =
    pack === "private-10"
      ? [{ id: newId(), start: at(3, 16.5), minutes: 60, focus: [WEAKEST[0]], state: "booked" }]
      : [
          { id: newId(), start: at(2, 16.5), minutes: 60, focus: [WEAKEST[0]], state: "booked" },
          {
            id: newId(),
            start: at(6, 10),
            minutes: 90,
            focus: [WEAKEST[1], WEAKEST[2]],
            note: "Go over exam 3",
            state: "booked",
          },
        ];
  if (opts.soon !== undefined) upcoming[0] = { ...upcoming[0], start: now + opts.soon * MIN };
  const history = HISTORY.map((s) => ({ ...s }));
  const account: Account = {
    pack,
    bought: hoursIn(pack),
    boughtAt: at(-27, 12),
    bonusMinutes: 0,
    latePass: true,
    moves: [at(-6, 12)],
    sessions: [...history, ...upcoming],
  };
  if (opts.empty) {
    // every hour used: the rest of the package as one long-finished stretch
    const spare = hours(account).left;
    account.bought -= spare;
  }
  return account;
}
