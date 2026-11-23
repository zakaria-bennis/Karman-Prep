// Schedule: the rules, and stand-in sessions to show them with (founder, 2026-11-16; his answers are
// in the project's notes). Only Private 10 and Private 20 students have this tab.
//   Hours     Time is counted in hours, not sessions. A session is 60, 90 or 120 minutes; Private 10
//             books 60 minutes a week at most. Hours run out 12 months after they were bought.
//   Booking   At least 24 hours ahead and at most 4 weeks ahead, always with the student's own tutor,
//             one session at a time (a repeating weekly booking was taken out, 2026-11-17: he
//             fears double bookings).
//             The tutor can be booked from 8 am to midnight on the tutor's own clock (Central
//             time; founder, 2026-11-17: "any times from 8 am my time to midnight my time"; he
//             will set his own availability in his portal later). Times are shown in the
//             student's own time, with no time zone written anywhere; a time that falls after
//             the student's midnight is listed under the student's next day.
//   Changes   With more than 24 hours to go a session can be moved or canceled (the hours go back).
//             Moving is limited to three a month. Inside 24 hours there is one free pass a package,
//             which the tutor can give back.
//   The day   Join opens 5 minutes before. A student who has not joined 10 minutes in loses the
//             session, which still ends on time. If the tutor misses it, the hours go back with 30
//             minutes more.
//   After     The recording, the tutor's notes, what was covered and the homework set, for 6 months.
// A real Private student's sessions come from the server (src/lib/portal/schedule.ts); while they are
// shown, the tutor's open times are the ones their booking calendar gives (`setCalendarTimes`).
// The rules the booking endpoints enforce live in src/lib/bookings/rules.ts and are used here too,
// so the page and the server agree.
import { GUARANTEE } from "@/lib/marketing/offer";
import {
  BOOKING,
  LENGTHS,
  hoursLedger,
  lengthsFor,
  movesLeftIn,
  packHours,
  weeklyCap,
  type Length,
  type Pack,
} from "@/lib/bookings/rules";
import { DAY, STUDENTS, TODAY, activity } from "./progressData";
import { ledger, minSec } from "./progressStats";
import { guessPlace, skyAt, type Place, type Sky } from "@/lib/schedule/sun";
import { SECTIONS, SKILLS, type Domain, type Section } from "./skills72";

export { DAY };
export const MIN = 60_000;
export const HOUR = 3_600_000;

export const RULES = {
  noticeHours: BOOKING.noticeHours,
  aheadDays: BOOKING.aheadDays,
  joinMinutes: 5,
  graceMinutes: 10,
  movesAMonth: BOOKING.movesAMonth,
  expiryMonths: 12,
  recordingMonths: 6,
  tutorMissMinutes: 30,
  hourPrice: GUARANTEE.private.extraSessionPrice,
} as const;

export type { Length, Pack };
/** Private 10 has 60 minutes a week; Private 20 chooses. */
export { LENGTHS, lengthsFor };
export const hoursIn = packHours;

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
  joined?: boolean;
  recap?: Recap;
  /** The meeting's address (a Zoom link). The tutor's and the admin's portals will set it; when
   *  it is there, Join opens it. */
  joinUrl?: string;
  /** Moved once already: a session can be moved once (the tutor can move it again). */
  moved?: boolean;
  /** It has a recording to watch. Real sessions have none yet. */
  recording?: boolean;
}
export interface Account {
  pack: Pack;
  /** Hours bought in all, and when the package began (null until a real purchase date is known). */
  bought: number;
  boughtAt: number | null;
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
/** The Sunday that begins a time's week (the calendar runs Sunday to Saturday). */
export const weekStart = (t: number) => {
  const d = new Date(dayStart(t));
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
};

// ---- hours ----

/** The same count the booking endpoints make (src/lib/bookings/rules.ts). */
export const hours = (account: Account) => hoursLedger(account);

export const expiresAt = (account: Account): number | null => {
  if (account.boughtAt === null) return null;
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

// ---- the tutor's times: 8 am to midnight on the tutor's clock, shown on the student's ----

const STEP = 30;
/** The tutor's own clock, and the hours of it a session may fill. */
export const TUTOR_ZONE = "America/Chicago";
export const TUTOR_HOURS = { from: 8, to: 24 } as const;

/** The tutor's open start times from their booking calendar, for a real student, one set for each
 *  length (a start is open when the whole session fits); null for the design page, whose tutor is
 *  made up. */
let calendarOpen: ReadonlyMap<number, ReadonlySet<number>> | null = null;
export const setCalendarTimes = (open: ReadonlyMap<number, ReadonlySet<number>> | null) => {
  calendarOpen = open;
};

/** The same "taken by someone else" answer for the same slot on every load (the design page). */
const taken = (t: number) => {
  // by the hour, as a tutor's other students would hold it
  let x = Math.floor(t / HOUR) + Math.floor(t / DAY) * 7919;
  x = Math.imul(x ^ (x >>> 3), 0x45d9f3b);
  x ^= x >>> 13;
  return (x >>> 0) % 10 < 2;
};

const zoneParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TUTOR_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});
/** The date and time on the tutor's clock at a moment, as if it were UTC. */
function tutorWall(t: number): number {
  const part: Record<string, number> = {};
  for (const { type, value } of zoneParts.formatToParts(t)) part[type] = Number(value);
  return Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute);
}
/** The moment the tutor's clock shows a date and time (given as if it were UTC). */
function fromTutorWall(wall: number): number {
  let t = wall;
  // twice, so a day the clocks change still lands on the right hour
  for (let i = 0; i < 2; i++) t = wall - (tutorWall(t) - t);
  return t;
}

/** Every start between two moments that leaves room for `minutes` before the tutor's midnight.
 *  The tutor's Sundays are closed (a stand-in, until the tutor's portal holds real hours). */
export function tutorStarts(from: number, to: number, minutes: number): number[] {
  const out: number[] = [];
  // the tutor's days that can touch this stretch: the one it begins on, and the ones around it
  const first = Math.floor(tutorWall(from) / DAY) * DAY - DAY;
  for (let date = first; date <= first + 3 * DAY; date += DAY) {
    if (new Date(date).getUTCDay() === 0) continue;
    for (let m = TUTOR_HOURS.from * 60; m + minutes <= TUTOR_HOURS.to * 60; m += STEP) {
      const t = fromTutorWall(date + m * MIN);
      if (t >= from && t < to) out.push(t);
    }
  }
  return out;
}

export interface DayChoice {
  day: number;
  /** Start times with room for the asked length. */
  times: number[];
  /** Every time on the student's day that the tutor works and the length fits in, open or not:
   *  the ones that are not open are shown grayed out. */
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
  // sessions already held that week count toward Private 10's one a week too
  const held = account.sessions.filter((s) => s.state !== "canceled" && s.id !== moving?.id);
  const cap = weeklyCap(account.pack);
  const left = hours(account).left + (moving ? moving.minutes / 60 : 0);
  const days: DayChoice[] = [];
  // the student's own day, from its midnight to the next
  const startsOn = (day: number) => tutorStarts(day, dayStart(day + DAY + HOUR), minutes);
  const shut = (day: number) => startsOn(day).map((t) => ({ t, open: false }));
  for (let day = dayStart(first); day <= dayStart(last); day += DAY) {
    // a day of 23 or 25 hours (the clocks changing) still begins at midnight
    day = dayStart(day + HOUR);
    if (left < minutes / 60) {
      days.push({ day, times: [], slots: shut(day), why: "hours" });
      continue;
    }
    if (cap !== null && held.filter((s) => weekStart(s.start) === weekStart(day)).length >= cap) {
      days.push({ day, times: [], slots: shut(day), why: "week" });
      continue;
    }
    const open = (t: number) =>
      !full &&
      t >= first &&
      t <= last &&
      !taken(t) &&
      !mine.some((s) => t < endOf(s) && t + STEP * MIN > s.start);
    const fits = startsOn(day);
    const calendar = calendarOpen?.get(minutes);
    const free = (t: number) => {
      // a real tutor's calendar says which starts have room for the whole session
      if (calendarOpen)
        return (
          !full &&
          t >= first &&
          t <= last &&
          !!calendar?.has(t) &&
          !mine.some((s) => t < endOf(s) && t + minutes * MIN > s.start)
        );
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

// ---- changing a session ----

/** Three a month, in the student's own month (this device's clock), as the server counts them. */
export const movesLeft = (account: Account, now: number) =>
  movesLeftIn(account.moves, now, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
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
  why?: "started" | "pass" | "moved" | "moves";
}
export function changeOf(account: Account, session: Session, now: number): Change {
  if (now >= session.start) return { late: true, move: false, cancel: false, why: "started" };
  const late = session.start - now < RULES.noticeHours * HOUR;
  if (late && !account.latePass) return { late, move: false, cancel: false, why: "pass" };
  if (session.moved) return { late, move: false, cancel: true, why: "moved" };
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

/** Where Join goes: the session's meeting (a Zoom link the tutor's or the admin's portal will
 *  set), if it is a safe web address. Without one, Join only marks the session as joined. */
export function meetingOf(session: Session): string | null {
  if (!session.joinUrl) return null;
  try {
    return new URL(session.joinUrl).protocol === "https:" ? session.joinUrl : null;
  } catch {
    return null;
  }
}

/** A recording can be watched for 6 months after its session. */
export const recordingUntil = (session: Session) => {
  const d = new Date(session.start);
  d.setMonth(d.getMonth() + RULES.recordingMonths);
  return d.getTime();
};

// ---- what to work on: the skills that most need it, pacing, and a full-length exam's review ----

export type Subject = "rw" | "math" | "test" | "exam";
export interface Pick {
  skill: string;
  /** Reading and Writing, Math, how the test is taken (pacing), or a full-length exam's review. */
  subject: Subject;
  /** 0 Not started, 1 Learning, 2 Understanding, 3 Proficient. Only a skill has a level. */
  level?: number;
  /** What is shown in place of a level. */
  value?: string;
}
/** The student's pace now, as the Progress page shows it: seconds a question, averaged over the
 *  two weeks ending today. (A stand-in student's, until real results are read.) */
const student = STUDENTS.weeks9;
const PACE_NOW = ledger(student, activity(student)).pace.at(-1) ?? 0;
/** What is not a skill (founder, 2026-11-17: pacing has no level, it shows "the pacing that they
 *  are averaging now"; test-taking strategy is not offered; a full-length exam's review is, in
 *  gold). */
export const PACING = "Pacing";
export const EXAM_REVIEW = "Full-length exam review";
export const EXTRAS: Pick[] = [
  {
    skill: PACING,
    subject: "test",
    value: PACE_NOW ? `${minSec(PACE_NOW)} a question` : undefined,
  },
  { skill: EXAM_REVIEW, subject: "exam" },
];
/** The skills that most need work, the lowest level first, with the two subjects taking turns
 *  among skills on the same level. (The levels are the Library's; when real results are read,
 *  this is where they come in.) */
export function recommend(skills: Pick[], count = 3): Pick[] {
  const byLevel = [...skills].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const chosen: Pick[] = [];
  while (chosen.length < count && byLevel.length > 0) {
    const level = byLevel[0].level;
    const last = chosen[chosen.length - 1]?.subject;
    const at = byLevel.findIndex((s) => s.level === level && s.subject !== last);
    chosen.push(byLevel.splice(at === -1 ? 0 : at, 1)[0]);
  }
  return chosen;
}
/** The five things offered from a student's own skills and pace: three skills, then pacing and a
 *  full-length exam's review. With no pace yet, pacing shows no number. */
export function recommendFor(skills: Record<Section, Domain[]>, pace: number): Pick[] {
  return [
    ...recommend(
      SECTIONS.flatMap((section) =>
        skills[section].flatMap((domain) =>
          domain.skills.map((skill) => ({
            skill: skill.name,
            subject: section === "Math" ? ("math" as const) : ("rw" as const),
            level: skill.level,
          }))
        )
      )
    ),
    { skill: PACING, subject: "test", value: pace ? `${minSec(pace)} a question` : undefined },
    { skill: EXAM_REVIEW, subject: "exam" },
  ];
}
/** The design page's five, from its made-up student. */
export const RECOMMENDED: Pick[] = recommendFor(SKILLS, PACE_NOW);
const WEAKEST = RECOMMENDED.filter((pick) => pick.level !== undefined).map((pick) => pick.skill);

/** What a thing to work on belongs to, for its color: fuchsia for Reading and Writing, blue for
 *  Math, green for pacing, gold for a full-length exam's review. */
export const subjectOf = (skill: string): Subject =>
  EXTRAS.find((pick) => pick.skill === skill)?.subject ??
  (SKILLS.Math.some((domain) => domain.skills.some((s) => s.name === skill)) ? "math" : "rw");

/** What the sky is doing at a time, where the student is: it chooses the picture behind the
 *  next session and the color a time wears. The place is guessed from the
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
  recording: true,
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
