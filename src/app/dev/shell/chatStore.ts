// Chat's messages, kept in one place so that the Chat page and the mark on its menu icon read the
// same thing (founder, 2026-11-16; his answers are in the project's notes). Everything here is a
// stand-in held in memory: the live chat (Slack behind the scenes, with its own moderation) is not
// wired to this page yet.
//   Who a Cohort student can write to: Announcements (only the tutor posts there), the class chat,
//   their tutor, and any classmate. A Private student has their tutor only.
//   What can be sent: words, a photo, or a question they bookmarked or flagged.
//   A message can be reacted to and replied to. A private chat shows Delivered, then Read.
//   Outside the tutor's hours (9 AM to 9 PM Central) an assistant answers at once, marked as not a
//   person, and the tutor follows up in the morning.
//   Sending is checked first. The live check is three layers; here only its first rule is shown:
//   a phone number or an email address is not sent.
import { useSyncExternalStore } from "react";

export type Person = { id: string; name: string; tint: string; role?: "tutor" | "assistant" };
export const PEOPLE: Record<string, Person> = {
  tutor: { id: "tutor", name: "Jordan Ellis", tint: "#7a5cf0", role: "tutor" },
  assistant: { id: "assistant", name: "Karman Assistant", tint: "#e89a2c", role: "assistant" },
  priya: { id: "priya", name: "Priya", tint: "#e0218a" },
  sam: { id: "sam", name: "Sam", tint: "#22a35a" },
  leo: { id: "leo", name: "Leo", tint: "#2f7fe6" },
  amara: { id: "amara", name: "Amara", tint: "#e2772e" },
};
export const CLASSMATES = ["priya", "sam", "leo", "amara"];

export type Shared = { skill: string; prompt: string; flagged: boolean };
export const REACTIONS = ["heart", "up", "ha", "wow", "what"] as const;
export type Reaction = (typeof REACTIONS)[number];
export type Msg = {
  id: string;
  from: string; // a person's id, or "me"
  at: number;
  text?: string;
  photo?: string;
  question?: Shared;
  replyTo?: string;
  /** Who reacted, and how. */
  reactions: Record<string, Reaction>;
  /** A message of the student's own: on its way, sent, read, or stopped by the check. */
  state?: "sending" | "sent" | "read" | "blocked";
};
export type ThreadKind = "news" | "class" | "tutor" | "dm";
export type Thread = {
  id: string;
  kind: ThreadKind;
  name: string;
  with?: string;
  msgs: Msg[];
  unread: number;
  typing?: string;
};
type State = { threads: Thread[]; afterHours: boolean };

const MIN = 60_000;
let n = 0;
const made = (from: string, ago: number, text: string, more: Partial<Msg> = {}): Msg => ({
  id: `m${n++}`,
  from,
  at: Date.now() - ago * MIN,
  text,
  reactions: {},
  ...more,
});

const cohort = (): Thread[] => [
  {
    id: "news",
    kind: "news",
    name: "Announcements",
    unread: 0,
    msgs: [
      made("tutor", 60 * 26, "Welcome to week 3. Exam 3 opens Saturday at 6 AM."),
      made(
        "tutor",
        60 * 5,
        "Tuesday's class starts with the questions most of you missed on exam 2."
      ),
    ],
  },
  {
    id: "class",
    kind: "class",
    name: "Class chat",
    unread: 2,
    msgs: [
      made("priya", 190, "did anyone get number 14 on the exam"),
      made("sam", 186, "the circle one? I guessed"),
      made("me", 180, "I got 15 for the radius but I'm not sure why", { state: "sent" }),
      made(
        "tutor",
        172,
        "Good instinct. We will go through it Tuesday. Try completing the square first.",
        {
          reactions: { priya: "heart", sam: "up" },
        }
      ),
      made("leo", 44, "is the daily 10 harder today or is it just me"),
      made("amara", 41, "it's not just you"),
    ],
  },
  {
    id: "tutor",
    kind: "tutor",
    name: PEOPLE.tutor.name,
    with: "tutor",
    unread: 1,
    msgs: [
      made("me", 60 * 22, "I keep running out of time on the last reading passage", {
        state: "read",
      }),
      made(
        "tutor",
        60 * 21,
        "That is common in week 3. I added a reading time trial to your homework."
      ),
      made("tutor", 95, "How did the time trial feel?"),
    ],
  },
  {
    id: "dm-priya",
    kind: "dm",
    name: "Priya",
    with: "priya",
    unread: 0,
    msgs: [
      made("priya", 60 * 30, "want to do the strategy quiz together later"),
      made("me", 60 * 29, "yes, after class", { state: "read" }),
    ],
  },
];
const alone = (): Thread[] => cohort().filter((t) => t.kind === "tutor");

let state: State = { threads: cohort(), afterHours: false };
const heard = new Set<() => void>();
const set = (next: State) => {
  state = next;
  heard.forEach((tell) => tell());
};
const change = (id: string, with_: (t: Thread) => Thread) =>
  set({ ...state, threads: state.threads.map((t) => (t.id === id ? with_(t) : t)) });

export const useChat = () =>
  useSyncExternalStore(
    (tell) => {
      heard.add(tell);
      return () => heard.delete(tell);
    },
    () => state,
    () => state
  );

/** What is waiting: how many messages, and whether an announcement is among them. */
export const waiting = (s: State) => ({
  count: s.threads.reduce((sum, t) => sum + t.unread, 0),
  news: s.threads.some((t) => t.kind === "news" && t.unread > 0),
});

export const chat = {
  /** A Cohort student has every kind of chat; a Private student has their tutor only. */
  start: (plan: "cohort" | "private") =>
    set({ ...state, threads: plan === "cohort" ? cohort() : alone() }),
  afterHours: (on: boolean) => set({ ...state, afterHours: on }),
  read: (id: string) => change(id, (t) => (t.unread ? { ...t, unread: 0 } : t)),
  /** A chat with a classmate, begun if there is none yet. Returns its id. */
  open: (who: string) => {
    const id = `dm-${who}`;
    if (!state.threads.some((t) => t.id === id))
      set({
        ...state,
        threads: [
          ...state.threads,
          { id, kind: "dm", name: PEOPLE[who].name, with: who, unread: 0, msgs: [] },
        ],
      });
    return id;
  },
  react: (thread: string, msg: string, how: Reaction) =>
    change(thread, (t) => ({
      ...t,
      msgs: t.msgs.map((m) => {
        if (m.id !== msg) return m;
        const reactions = { ...m.reactions };
        if (reactions.me === how) delete reactions.me;
        else reactions.me = how;
        return { ...m, reactions };
      }),
    })),
  /** Someone else writes. `seen` is true when the student has that chat open. */
  arrive: (thread: string, from: string, text: string, seen = false) =>
    change(thread, (t) => ({
      ...t,
      typing: undefined,
      unread: seen ? 0 : t.unread + 1,
      msgs: [...t.msgs, made(from, 0, text)],
    })),
  /** The student sends. It is checked, sent, and then answered as that chat would be. */
  send: (thread: string, body: Pick<Msg, "text" | "photo" | "question" | "replyTo">) => {
    const mine = made("me", 0, body.text ?? "", { ...body, state: "sending" });
    change(thread, (t) => ({ ...t, msgs: [...t.msgs, mine] }));
    const mark = (to: Msg["state"]) =>
      change(thread, (t) => ({
        ...t,
        msgs: t.msgs.map((m) => (m.id === mine.id ? { ...m, state: to } : m)),
      }));
    // the check: a phone number or an email address is stopped (the live check does much more)
    const personal = /(\+?\d[\d\s().-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)/.test(body.text ?? "");
    window.setTimeout(() => {
      if (personal) return mark("blocked");
      mark("sent");
      const t = state.threads.find((x) => x.id === thread);
      if (!t || t.kind === "news") return;
      // who answers: the assistant after hours in the tutor's chat, else the tutor or a classmate
      const off = t.kind === "tutor" && state.afterHours;
      const who = off ? "assistant" : (t.with ?? (body.question ? "tutor" : "priya"));
      const says = off
        ? "I am Karman's assistant, not a person. Here is a first step: write down what the question gives you and what it asks for. Your tutor will see this at 9 AM and follow up."
        : body.question
          ? "Good one to bring. Tell me the step where it stops making sense and we will start there."
          : t.kind === "tutor"
            ? "Got it. Keep going, and send me the next one you get stuck on."
            : t.kind === "class"
              ? "same here, let's ask on Tuesday"
              : "ok sounds good";
      window.setTimeout(() => {
        if (t.kind !== "class") mark("read");
        change(thread, (x) => ({ ...x, typing: who }));
        window.setTimeout(() => chat.arrive(thread, who, says, true), off ? 1100 : 1900);
      }, 700);
    }, 380);
  },
};

/** Whether it is outside the tutor's hours right now: before 9 AM or from 9 PM, Central time. */
export const closedNow = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Chicago",
    }).format(new Date())
  );
  return hour < 9 || hour >= 21;
};

/** The questions a student can bring into a chat: the ones they bookmarked or flagged (stand-ins). */
export const BROUGHT: Shared[] = [
  {
    skill: "Circle equations",
    prompt: "A circle has the equation x² + y² − 6x + 8y = 0. What is its radius?",
    flagged: true,
  },
  {
    skill: "Transitions",
    prompt: "Which choice completes the text with the most logical transition?",
    flagged: false,
  },
  {
    skill: "Percentages",
    prompt:
      "A store raises the price of a $40 jacket by 25%. Later it takes 20% off the new price. What is the final price?",
    flagged: true,
  },
];
