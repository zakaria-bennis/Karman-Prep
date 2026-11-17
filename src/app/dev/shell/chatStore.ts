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
//   Sending is checked first (see `judge`): contact details and social accounts are not sent; vulgar
//   or sexual words are not sent, with nothing said, and go to the tutor; passing answers about is
//   not sent, warned about once, and the second time pauses the chats until the tutor has looked.
//   While the student is in a skill set, a quiz or an exam there is no chat and no sign of it.
import { useSyncExternalStore } from "react";
import type { Emoji } from "./ChatEmoji";

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

export type Shared = {
  skill: string;
  section: "Reading and Writing" | "Math";
  /** Where the student met it: "Daily 10, Nov 14". */
  from: string;
  prompt: string;
  choices: string[];
  flagged: boolean;
};
export type Reaction = Emoji;
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
  /** Why it was stopped: contact details or a social account, or something not fit to send. */
  why?: "contact" | "content" | "answers";
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
/** The tutor: online, offline within their hours, or after hours (9 PM to 9 AM Central), when the
 *  assistant answers. */
export type Presence = "online" | "offline" | "after";
type State = {
  threads: Thread[];
  presence: Presence;
  /** How many times the check has caught answer-sharing. The first brings a warning; the second
   *  pauses the student's chats until the tutor has looked. */
  strikes: number;
  warning: boolean;
  paused: boolean;
  /** The student is in a skill set, a quiz or an exam: no chat and no sign of it. */
  inQuiz: boolean;
};

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
          reactions: { priya: "check", sam: "up" },
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

let state: State = {
  threads: cohort(),
  presence: "online",
  strikes: 0,
  warning: false,
  paused: false,
  inQuiz: false,
};
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
export const waiting = (s: State) =>
  // in a quiz nothing is shown at all
  s.inQuiz ? 0 : s.threads.reduce((sum, t) => sum + t.unread, 0);

/** The check, as far as this page shows it. The live one must do far more (the project's notes say
 *  what he asked for): these few patterns only show what each outcome looks like.
 *    contact   a phone number, an email address, a social account or its name: not sent
 *    content   vulgar or sexual words: not sent, nothing said, the tutor reviews it
 *    answers   passing answers about instead of working the question out: not sent, and counted */
const CONTACT =
  /(\+?\d[\d\s().-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(^|\s)@\w{2,}|\b(insta(gram)?|ig|discord|snap(chat)?|tik\s?tok|whats\s?app|telegram|face\s?time|my (number|handle|username))\b/i;
const CONTENT =
  /\b(f+u+c+k+\w*|s+h+i+t+\w*|b+i+t+c+h+\w*|a+s+s+h+o+l+e+\w*|d+i+c+k+\w*|porn\w*|nudes?|sex\w*|horny)\b/i;
const ANSWERS =
  /\b(what(')?s|whats|send|give|tell|share|drop)\b.{0,24}\banswers?\b|\banswer (key|is|was)\b|\b(it'?s|its|is|was|pick|choose|put) [abcd]\b|\b(number |#)?\d{1,2} (is|was|=) [abcd]\b|\ball the answers\b/i;
export const judge = (text: string): Msg["why"] | undefined =>
  CONTACT.test(text)
    ? "contact"
    : CONTENT.test(text)
      ? "content"
      : ANSWERS.test(text)
        ? "answers"
        : undefined;

export const chat = {
  /** A Cohort student has every kind of chat; a Private student has their tutor only. */
  start: (plan: "cohort" | "private") =>
    set({ ...state, threads: plan === "cohort" ? cohort() : alone() }),
  presence: (presence: Presence) => set({ ...state, presence }),
  quiz: (inQuiz: boolean) => set({ ...state, inQuiz }),
  /** The warning has been read. */
  heard: () => set({ ...state, warning: false }),
  /** The tutor has looked and lets the chats go on. */
  approve: () => set({ ...state, strikes: 0, warning: false, paused: false }),
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
    const why = judge(body.text ?? "");
    window.setTimeout(() => {
      if (why) {
        change(thread, (t) => ({
          ...t,
          msgs: t.msgs.map((m) => (m.id === mine.id ? { ...m, state: "blocked", why } : m)),
        }));
        // answer-sharing is counted: a warning the first time, then the chats are paused
        if (why === "answers") {
          const strikes = state.strikes + 1;
          set({ ...state, strikes, warning: strikes === 1, paused: strikes >= 2 });
        }
        return;
      }
      mark("sent");
      const t = state.threads.find((x) => x.id === thread);
      if (!t || t.kind === "news") return;
      // who answers: the assistant after hours in the tutor's chat, else the tutor or a classmate
      const off = t.kind === "tutor" && state.presence === "after";
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

/** The tutor's presence by the clock: after hours before 9 AM and from 9 PM, Central time; online
 *  otherwise (whether a tutor is really at their desk will come from the live chat). */
export const presenceNow = (): Presence => {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Chicago",
    }).format(new Date())
  );
  return hour < 9 || hour >= 21 ? "after" : "online";
};

/** The questions a student can bring into a chat: the ones they bookmarked or flagged (stand-ins). */
export const BROUGHT: Shared[] = [
  {
    skill: "Circle equations",
    section: "Math",
    from: "Full-length exam 2, Nov 14",
    prompt: "A circle has the equation x² + y² − 6x + 8y = 0. What is its radius?",
    choices: ["3", "4", "5", "25"],
    flagged: true,
  },
  {
    skill: "Transitions",
    section: "Reading and Writing",
    from: "Daily 10, Nov 15",
    prompt:
      "The survey found fewer nesting sites than expected. ______ the team extended its search to nearby beaches. Which choice completes the text with the most logical transition?",
    choices: ["For example,", "As a result,", "In contrast,", "Similarly,"],
    flagged: false,
  },
  {
    skill: "Percentages",
    section: "Math",
    from: "Skill set, Nov 13",
    prompt:
      "A store raises the price of a $40 jacket by 25%. Later it takes 20% off the new price. What is the final price?",
    choices: ["$38", "$40", "$42", "$45"],
    flagged: true,
  },
  {
    skill: "Key details",
    section: "Reading and Writing",
    from: "Skill set, Nov 12",
    prompt:
      "According to the text, why do sea turtles choose dark beaches over lit ones when they nest?",
    choices: [
      "The sand is cooler.",
      "Light draws predators.",
      "Hatchlings follow the brightest horizon.",
      "Dark sand holds more water.",
    ],
    flagged: false,
  },
  {
    skill: "Slope and rate of change",
    section: "Math",
    from: "Time trial, Nov 11",
    prompt: "A line passes through (2, 5) and (6, 13). What is its slope?",
    choices: ["1/2", "2", "4", "8"],
    flagged: false,
  },
  {
    skill: "Verb agreement",
    section: "Reading and Writing",
    from: "Daily 10, Nov 10",
    prompt: "The collection of early maps ______ on display through March.",
    choices: ["are", "is", "were", "have been"],
    flagged: true,
  },
];
