// Schedule's sessions and hours, kept in one place so the page's parts read the same thing. On the
// design page it is a stand-in held in memory. For a real student (`schedule.load`) every booking,
// move and cancel also goes to the booking endpoints (/api/bookings/*, through Cal.com), and is put
// back if the server refuses it, with the server's own sentence said to the student.
import { useSyncExternalStore } from "react";
import type { RealSchedule } from "@/lib/portal/schedule";
import {
  TUTOR,
  setCalendarTimes,
  RULES,
  changeOf,
  lengthsFor,
  newId,
  standIn,
  HOUR,
  type Account,
  type Length,
  type Pack,
  type Session,
} from "./scheduleData";

export type Sync = "ask" | "apple" | "google" | "later";
type State = {
  account: Account;
  /** Whether the family has been offered their own calendar, and what they chose. */
  sync: Sync;
  /** The tutor has nothing open (to see that state). */
  full: boolean;
  /** The session just booked or moved, so its row can be shown arriving. */
  fresh: string[];
  /** A real student: their tutor's booking calendar. Null on the design page. */
  live: { eventTypeId: number; tutorClerkId: string } | null;
  /** A real student (not the design page), with or without a booking calendar. */
  real: boolean;
  /** The tutor's name; null for a real student with no tutor yet. */
  tutorName: string | null;
  satDay: number | null;
};

const SYNC_KEY = "kp-schedule-sync";
let state: State = {
  account: standIn("private-20", Date.now()),
  sync: "ask",
  full: false,
  fresh: [],
  live: null,
  real: false,
  tutorName: TUTOR,
  satDay: null,
};
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};
const edit = (with_: (a: Account) => Account, fresh: string[] = []) =>
  set({ ...state, account: with_(state.account), fresh });

export const schedule = {
  /** Starts the page for a package. `soon` puts the next session that many minutes away. */
  start: (pack: Pack, now: number, opts: { soon?: number; empty?: boolean; full?: boolean }) => {
    let sync: Sync = "ask";
    try {
      const kept = window.localStorage.getItem(SYNC_KEY);
      if (kept === "apple" || kept === "google" || kept === "later") sync = kept;
    } catch {
      // private windows keep nothing: the banner is simply offered again
    }
    set({
      ...state,
      account: standIn(pack, now, opts),
      sync,
      full: !!opts.full,
      fresh: [],
      live: null,
      real: false,
      tutorName: TUTOR,
      satDay: null,
    });
  },
  /** Starts the page for a real student, and asks their tutor's calendar for open times. */
  load: (real: RealSchedule) => {
    const t = real.tutor;
    const live =
      t && t.eventTypeId !== null ? { eventTypeId: t.eventTypeId, tutorClerkId: t.clerkId } : null;
    set({
      ...state,
      account: real.account,
      sync: keptSync(),
      full: false,
      fresh: [],
      live,
      real: true,
      tutorName: t?.name ?? null,
      satDay: real.satDay,
    });
    // with no booking calendar yet, nothing can be booked
    setCalendarTimes(new Map());
    if (live) void openTimes(live.eventTypeId, lengthsFor(real.account.pack));
  },
  sync: (choice: Sync) => {
    try {
      window.localStorage.setItem(SYNC_KEY, choice);
    } catch {
      // nothing kept; the choice holds for this visit
    }
    set({ ...state, sync: choice });
  },
  /** Books a session. Resolves true once it is booked (at once on the design page). */
  book: async (wanted: { start: number; minutes: Length; focus: string[]; note?: string }) => {
    if (cannot()) return false;
    const made: Session = { id: newId(), ...wanted, state: "booked" };
    const before = state.account;
    edit((a) => ({ ...a, sessions: [...a.sessions, made] }), [made.id]);
    if (!state.live) return true;
    const row = await send(
      "/api/bookings/create",
      {
        eventTypeId: state.live.eventTypeId,
        tutorClerkId: state.live.tutorClerkId,
        start: new Date(wanted.start).toISOString(),
        timeZone: zone(),
        minutes: wanted.minutes,
      },
      before
    );
    // the booking's own id, so it can be moved or canceled
    const id = (row as { booking?: { id?: string } } | null)?.booking?.id;
    if (id)
      edit((a) => ({
        ...a,
        sessions: a.sessions.map((s) => (s.id === made.id ? { ...s, id } : s)),
      }));
    return row !== null;
  },
  /** Moves a session, keeping its length. Inside 24 hours it spends the free pass; either way it is
   *  one of the month's three moves, and the session's one move. */
  move: async (id: string, start: number, now: number) => {
    if (cannot()) return false;
    const before = state.account;
    const sent = state.live
      ? send(
          "/api/bookings/reschedule",
          { bookingId: id, newStart: new Date(start).toISOString(), timeZone: zone() },
          before
        )
      : null;
    edit(
      (a) => {
        const session = a.sessions.find((s) => s.id === id);
        if (!session) return a;
        const change = changeOf(a, session, now);
        if (!change.move) return a;
        return {
          ...a,
          latePass: change.late ? false : a.latePass,
          moves: [...a.moves, now],
          sessions: a.sessions.map((s) => (s.id === id ? { ...s, start, moved: true } : s)),
        };
      },
      [id]
    );
    return sent ? (await sent) !== null : true;
  },
  /** Cancels a session: its hours go back. Inside 24 hours it spends the free pass. */
  cancel: async (id: string, now: number) => {
    if (cannot()) return false;
    const sent = state.live ? send("/api/bookings/cancel", { bookingId: id }, state.account) : null;
    edit((a) => {
      const session = a.sessions.find((s) => s.id === id);
      if (!session) return a;
      const change = changeOf(a, session, now);
      if (!change.cancel) return a;
      return {
        ...a,
        latePass: change.late ? false : a.latePass,
        sessions: a.sessions.map((s) => (s.id === id ? { ...s, state: "canceled" } : s)),
      };
    });
    return sent ? (await sent) !== null : true;
  },
  join: (id: string) =>
    edit((a) => ({
      ...a,
      sessions: a.sessions.map((s) => (s.id === id ? { ...s, joined: true } : s)),
    })),
  /** A session not joined in its first ten minutes is closed and its hours are used. */
  miss: (id: string) =>
    edit((a) => ({
      ...a,
      sessions: a.sessions.map((s) =>
        s.id === id && s.state === "booked" ? { ...s, state: "missed" } : s
      ),
    })),
  buy: (count: number) => edit((a) => ({ ...a, bought: a.bought + count })),
  seen: () => state.fresh.length > 0 && set({ ...state, fresh: [] }),
};

function keptSync(): Sync {
  try {
    const kept = window.localStorage.getItem(SYNC_KEY);
    if (kept === "apple" || kept === "google" || kept === "later") return kept;
  } catch {
    // private windows keep nothing
  }
  return "ask";
}

const zone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
};

/** A real student whose tutor has no booking calendar yet: nothing is booked, moved or canceled
 *  from here, and the page says so instead of pretending. */
function cannot(): boolean {
  if (!state.real || state.live) return false;
  window.alert(
    "Your tutor's calendar is not set up yet. Message your tutor to book or change a session."
  );
  return true;
}

/** Sends a change to the booking endpoints. If it is refused, the page goes back to how it was and
 *  says the server's own sentence (every refusal is one short plain sentence). */
async function send(path: string, body: unknown, before: Account): Promise<unknown> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const said = (json as { error?: unknown } | null)?.error;
      throw new Refused(typeof said === "string" && said ? said : `HTTP ${res.status}`, !!said);
    }
    return json ?? {};
  } catch (e) {
    console.error(`[schedule] ${path} failed`, e);
    set({ ...state, account: before, fresh: [] });
    window.alert(
      e instanceof Refused && e.plain
        ? e.message
        : "That change did not go through. Nothing was booked or changed. Please try again, or message your tutor."
    );
    return null;
  }
}
class Refused extends Error {
  constructor(
    message: string,
    readonly plain: boolean
  ) {
    super(message);
  }
}

/** The tutor's open times for the next four weeks, from their booking calendar: for each length the
 *  package books, the starts with room for the whole session. */
async function openTimes(eventTypeId: number, lengths: readonly Length[]) {
  const from = new Date();
  const to = new Date(from.getTime() + (RULES.aheadDays + 1) * 86_400_000);
  const open = new Map<number, Set<number>>();
  await Promise.all(
    lengths.map(async (minutes) => {
      const q = new URLSearchParams({
        eventTypeId: String(eventTypeId),
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
        timeZone: zone(),
        ...(minutes === 60 ? {} : { duration: String(minutes) }),
      });
      try {
        const res = await fetch(`/api/availability?${q}`);
        const json = (await res.json()) as { slots?: { start: string }[] };
        open.set(minutes, new Set((json.slots ?? []).map((s) => Date.parse(s.start))));
      } catch (e) {
        console.error("[schedule] availability failed", e);
        open.set(minutes, new Set());
      }
    })
  );
  setCalendarTimes(open);
  set({ ...state });
}

/** Whether the student has a tutor the page can name. */
export const hasTutor = () => state.tutorName !== null;
/** The tutor has bound a booking calendar, so open times can be asked for. */
export const isLive = () => state.live !== null;
/** The tutor's first name, as the page says it mid-sentence ("your tutor" with no tutor yet). */
export const tutorFirst = () => state.tutorName?.split(" ")[0] ?? "your tutor";
/** The SAT on the calendar: the student's own date (none if they have not entered one), or the
 *  design page's. */
export const satDayOf = (fallback: number): number | null =>
  state.real ? state.satDay : (state.satDay ?? fallback);
/** A real student, not the design page. */
export const isReal = () => state.real;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const read = () => state;
export const useSchedule = () => useSyncExternalStore(subscribe, read, read);

/** Booked sessions still to come, soonest first; and the ones behind, newest first. */
export const split = (account: Account, now: number) => {
  const live = account.sessions.filter(
    (s) => s.state === "booked" && now < s.start + s.minutes * 60_000
  );
  const gone = account.sessions.filter((s) => s.state === "done" || s.state === "missed");
  return {
    upcoming: [...live].sort((a, b) => a.start - b.start),
    past: [...gone].sort((a, b) => b.start - a.start),
  };
};
export const isLate = (session: Session, now: number) =>
  session.start - now < RULES.noticeHours * HOUR;
