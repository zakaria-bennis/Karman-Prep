/**
 * The schedule rows: the private sessions and the open slots, the cohort's
 * homework, the chat's last lines, office hours and the next live class.
 * Demo data beside src/mock, never a real student.
 */
import { TODAY, addDays, COHORTS, type DueItem } from "@/mock";

/** Private sessions: seven done, the next one unbooked. Hours are one per session. */
export interface Session {
  id: string;
  date: string;
  time: string;
  title: string;
}
export const SESSIONS: Session[] = [
  { id: "s1", date: "2026-06-16", time: "5:00 pm ET", title: "First session" },
  { id: "s2", date: "2026-07-07", time: "5:00 pm ET", title: "Full-length review session" },
  { id: "s3", date: "2026-07-21", time: "5:00 pm ET", title: "Questions to the tutor" },
  { id: "s4", date: "2026-08-11", time: "5:00 pm ET", title: "Full-length review session" },
  { id: "s5", date: "2026-09-01", time: "4:00 pm ET", title: "Questions to the tutor" },
  { id: "s6", date: "2026-09-29", time: "5:00 pm ET", title: "Questions to the tutor" },
  { id: "s7", date: "2026-10-27", time: "5:00 pm ET", title: "Full-length review session" },
];

/** Open slots next week, 4 to 6 pm ET; a taken slot stays visible. */
export const SLOT_DAYS = [0, 1, 2, 3, 4].map((i) => ({
  date: addDays("2026-11-02", i),
  slots: [
    { time: "16:00", available: i !== 1 },
    { time: "17:00", available: i !== 0 && i !== 3 },
    { time: "18:00", available: i !== 4 },
  ],
}));

/** Cohort homework (each a skill set) and the chat's last lines. */
export const HOMEWORK: (DueItem & { skill: string })[] = [
  {
    id: "h1",
    title: "Linear functions practice",
    due: addDays(TODAY, 2),
    kind: "practice",
    skill: "ma-skill-linear-functions",
  },
  {
    id: "h2",
    title: "Transitions practice",
    due: addDays(TODAY, 4),
    kind: "practice",
    skill: "rw-skill-transitions",
  },
];
export const CHAT = [
  {
    id: "c1",
    who: "David",
    when: "Thu 6:12 pm",
    text: "Tonight we go through the linear functions set. Bring one question you missed.",
  },
  { id: "c2", who: "Sam", when: "Thu 6:30 pm", text: "Is Saturday's test proctored?" },
  {
    id: "c3",
    who: "David",
    when: "Thu 6:34 pm",
    text: "Yes, 10 am on Zoom. Camera on, one sitting.",
  },
];
export const OFFICE_HOURS = { day: "Sundays", time: "4:00 to 5:00 pm ET", next: addDays(TODAY, 1) };

/** The next live class of the March cohort from its class days (1 Monday, 3 Wednesday). */
export function nextClassDate(from = TODAY): string {
  const days = COHORTS[0].classDays;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(from, i);
    if (days.includes(new Date(d + "T12:00:00").getDay())) return d;
  }
  return addDays(from, 1);
}
export const CLASS_TIME = COHORTS[0].classTime;

console.assert(SESSIONS.length === 7, "seven hours used");
console.assert(
  SLOT_DAYS.length === 5 && SLOT_DAYS[0].date === "2026-11-02",
  "slots start Monday Nov 2"
);
console.assert(nextClassDate() === "2026-11-02", `next class Monday Nov 2, got ${nextClassDate()}`);
console.assert(
  HOMEWORK.every((h) => h.due > TODAY),
  "homework is due after today"
);
