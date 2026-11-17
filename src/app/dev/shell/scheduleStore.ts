// Schedule's sessions and hours, kept in one place so the page's parts read the same thing. A
// stand-in held in memory: nothing here books a real session or takes a real payment yet.
import { useSyncExternalStore } from "react";
import {
  RULES,
  changeOf,
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
};

const SYNC_KEY = "kp-schedule-sync";
let state: State = {
  account: standIn("private-20", Date.now()),
  sync: "ask",
  full: false,
  fresh: [],
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
    set({ account: standIn(pack, now, opts), sync, full: !!opts.full, fresh: [] });
  },
  sync: (choice: Sync) => {
    try {
      window.localStorage.setItem(SYNC_KEY, choice);
    } catch {
      // nothing kept; the choice holds for this visit
    }
    set({ ...state, sync: choice });
  },
  /** Books a session. Returns its id. */
  book: (wanted: { start: number; minutes: Length; focus: string[]; note?: string }) => {
    const made: Session = { id: newId(), ...wanted, state: "booked" };
    edit((a) => ({ ...a, sessions: [...a.sessions, made] }), [made.id]);
    return made.id;
  },
  /** Moves a session. Inside 24 hours it spends the free pass; either way it is one of the month's
   *  three moves. */
  move: (id: string, start: number, now: number) =>
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
          sessions: a.sessions.map((s) => (s.id === id ? { ...s, start } : s)),
        };
      },
      [id]
    ),
  /** Cancels a session: its hours go back. Inside 24 hours it spends the free pass. */
  cancel: (id: string, now: number) =>
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
    }),
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
