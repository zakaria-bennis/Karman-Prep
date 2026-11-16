// The Mistake Log's data: every session a student sat and every question in it. All of it is a
// stand-in, built from the same made-up daily log as the rest of Progress, so the counts agree with
// the calendar. Real sessions and answers will replace `sittingsOf` one for one.
//   A session is one sitting of one kind of work: a skill set (8 questions on one skill), the Daily
//   10, a full-length exam, the challenge question, a time trial or a run of endless mode.
//   The question shown for a past answer is one of eight samples, one for each domain: the bank's
//   own questions take their place once the Mistake Log reads real answers.
import { everySkill, type Found } from "./progressBreakdowns";
import type { DayLog, Student } from "./progressData";
import type { Section } from "./skills72";

export type Mode = "skill" | "daily" | "exam" | "challenge" | "trial" | "endless";
export const MODES: Record<Mode, string> = {
  skill: "Skill set",
  daily: "Daily 10",
  exam: "Full-length exam",
  challenge: "Challenge question",
  trial: "Time trial",
  endless: "Endless mode",
};

export type Sample = { prompt: string; choices: string[]; answer: number; why: string };
/** One sample question for each domain (stand-ins written for this page, not from the bank). */
const SAMPLES: Record<string, Sample> = {
  "Information and Ideas": {
    prompt:
      "A team of biologists compared sea turtle nests on beaches with street lighting and on dark beaches. Turtles laid about the same number of eggs on both. On the lit beaches, though, far fewer hatchlings reached the water. Which choice best states the main idea of the text?",
    choices: [
      "Street lighting reduces the number of eggs that sea turtles lay.",
      "Street lighting does not change how many eggs are laid, but fewer hatchlings reach the water.",
      "Sea turtles choose dark beaches over lit ones when they nest.",
      "Hatchlings from dark beaches grow faster than those from lit beaches.",
    ],
    answer: 1,
    why: "The text says two things: the number of eggs was about the same, and fewer hatchlings from lit beaches reached the water. Only this choice says both. The first choice contradicts the text, and the last two are never discussed.",
  },
  "Craft and Structure": {
    prompt:
      "The committee's report was notably ______: in just two pages, it set out every finding without a wasted word. Which choice completes the text with the most logical and precise word?",
    choices: ["verbose", "concise", "tentative", "ornate"],
    answer: 1,
    why: "The words after the colon describe a report that is short and wastes nothing. That is what concise means. Verbose and ornate mean the opposite, and tentative is about doubt, which the text never mentions.",
  },
  "Expression of Ideas": {
    prompt:
      "The first bridge design was cheaper to build. ______ it would have needed repairs twice as often, so the city chose the second design. Which choice completes the text with the most logical transition?",
    choices: ["Similarly,", "However,", "For example,", "Therefore,"],
    answer: 1,
    why: "The second sentence gives a drawback that works against the first sentence's advantage. A contrast needs however. The other choices signal likeness, an example or a result.",
  },
  "Standard English Conventions": {
    prompt:
      "The museum's newest exhibit, which opened in March, ______ more than 300 photographs from the 1920s. Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["feature", "features", "have featured", "are featuring"],
    answer: 1,
    why: "The subject is exhibit, which is singular, so the verb must be singular: features. The clause between the commas does not change the subject.",
  },
  Algebra: {
    prompt: "If 3x + 7 = 25, what is the value of 6x − 5?",
    choices: ["13", "25", "31", "36"],
    answer: 2,
    why: "Subtract 7 from both sides to get 3x = 18, so x = 6. Then 6x − 5 = 36 − 5 = 31.",
  },
  "Advanced Math": {
    prompt: "What is the positive solution to the equation x² − 5x − 14 = 0?",
    choices: ["2", "5", "7", "14"],
    answer: 2,
    why: "The left side factors as (x − 7)(x + 2), so x = 7 or x = −2. The positive solution is 7.",
  },
  "Problem-Solving and Data Analysis": {
    prompt:
      "A store raises the price of a $40 jacket by 25%. Later it takes 20% off the new price. What is the final price of the jacket?",
    choices: ["$38", "$40", "$42", "$45"],
    answer: 1,
    why: "Raising $40 by 25% gives $50. Taking 20% off $50 removes $10, which leaves $40. The two percents are taken of different amounts, so they cancel here.",
  },
  "Geometry and Trigonometry": {
    prompt: "A right triangle has legs of length 9 and 12. What is the length of its hypotenuse?",
    choices: ["13", "15", "18", "21"],
    answer: 1,
    why: "By the Pythagorean theorem, the hypotenuse is the square root of 9² + 12² = 81 + 144 = 225, which is 15.",
  },
};

export type Asked = {
  id: string;
  /** Its place in its session, counted from 1. */
  number: number;
  day: number;
  mode: Mode;
  session: string;
  sessionName: string;
  found: Found;
  right: boolean;
  seconds: number;
  /** The choice the student gave, counted from 0. */
  picked: number;
  sample: Sample;
  bookmarked: boolean;
  /** Flagged for the tutor (Cohort and Private students). A flagged question is bookmarked too. */
  flagged: boolean;
};

export type Session = {
  id: string;
  day: number;
  mode: Mode;
  /** A skill set is named for its skill; everything else for its kind. */
  name: string;
  asked: Asked[];
  right: number;
  seconds: number;
  /** A full-length exam's score. */
  score?: number;
};

/** The same "random" number every time for the same day and purpose. */
const noise = (a: number, b: number, c = 0) => {
  const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return v - Math.floor(v);
};
const of = (section: Section) => everySkill.filter((f) => f.section === section);

/** Every session, newest first. */
export function sittingsOf(student: Student, logs: DayLog[]): Session[] {
  const rw = of("Reading and Writing");
  const math = of("Math");
  const all = everySkill;
  const out: Session[] = [];
  for (let day = student.days; day >= 0; day--) {
    const log = logs[day];
    if (!log.questions) continue;
    // the day in the order it was sat: an exam first, then the Daily 10, the challenge question, the
    // skill sets and the short timed work
    const drafts: { mode: Mode; name: string; skills: Found[] }[] = [];
    if (log.exam)
      drafts.push({
        mode: "exam",
        name: `${MODES.exam} ${log.exam}`,
        skills: [
          ...Array.from({ length: 54 }, (_, i) => rw[i % rw.length]),
          ...Array.from({ length: 44 }, (_, i) => math[i % math.length]),
        ],
      });
    if (log.daily10) {
      const start = Math.floor(noise(day, 11) * all.length);
      drafts.push({
        mode: "daily",
        name: MODES.daily,
        skills: Array.from({ length: 10 }, (_, i) => all[(start + i * 7) % all.length]),
      });
    }
    if (log.challenge)
      drafts.push({
        mode: "challenge",
        name: MODES.challenge,
        skills: [all[Math.floor(noise(day, 12) * all.length)]],
      });
    for (let s = 0; s < log.sets; s++) {
      const found = all[Math.floor(noise(day, 13, s) * all.length)];
      drafts.push({ mode: "skill", name: found.skill.name, skills: Array(8).fill(found) });
    }
    for (let f = 0; f < log.fives; f++) {
      const mode: Mode =
        log.fives === 2 ? (f ? "endless" : "trial") : noise(day, 14) < 0.5 ? "trial" : "endless";
      const side = noise(day, 15, f) < 0.5 ? rw : math;
      const start = Math.floor(noise(day, 16, f) * side.length);
      drafts.push({
        mode,
        name: MODES[mode],
        skills: Array.from({ length: 5 }, (_, i) => side[(start + i * 5) % side.length]),
      });
    }
    // as many right answers as the day's log says, spread over the day's questions
    const total = drafts.reduce((n, d) => n + d.skills.length, 0);
    const right = new Set(
      Array.from({ length: total }, (_, n) => n)
        .sort((a, b) => noise(day, 17, a) - noise(day, 17, b))
        .slice(0, log.correct)
    );
    let n = 0;
    const sessions = drafts.map((draft, k): Session => {
      const id = `${day}-${k}`;
      const asked = draft.skills.map((found, i): Asked => {
        const at = n++;
        const ok = right.has(at);
        const sample = SAMPLES[found.domain];
        const marked = noise(day, 19, at) < (ok ? 0.012 : 0.06);
        return {
          id: `${id}-${i}`,
          number: i + 1,
          day,
          mode: draft.mode,
          session: id,
          sessionName: draft.name,
          found,
          right: ok,
          seconds: Math.max(
            12,
            Math.round(
              log.pace *
                (found.section === "Math" ? 1.17 : 0.86) *
                (ok ? 0.92 : 1.22) *
                (0.65 + noise(day, 18, at) * 0.7) *
                (draft.mode === "trial" ? 0.7 : 1)
            )
          ),
          picked: ok ? sample.answer : (sample.answer + 1 + Math.floor(noise(day, 20, at) * 3)) % 4,
          sample,
          bookmarked: marked,
          flagged: marked && noise(day, 21, at) < 0.4,
        };
      });
      return {
        id,
        day,
        mode: draft.mode,
        name: draft.name,
        asked,
        right: asked.filter((q) => q.right).length,
        seconds: asked.reduce((sum, q) => sum + q.seconds, 0),
        score: draft.mode === "exam" ? student.exams[log.exam - 1].score : undefined,
      };
    });
    // the day's last sitting comes first
    out.push(...sessions.reverse());
  }
  return out;
}

/** What the log is narrowed to. Each list may hold several choices, and an empty list means all of
 *  them (founder, 2026-11-16: "you should be able to select multiple, so I can look at my mistakes on
 *  daily 10 and skill sets if I want"). Domains and skills add to one another: a question fits if it
 *  is in any chosen domain or is any chosen skill. */
export type Sift = { modes: Mode[]; domains: string[]; skills: string[] };
export const NO_SIFT: Sift = { modes: [], domains: [], skills: [] };
export const sifted = (sift: Sift) =>
  sift.modes.length + sift.domains.length + sift.skills.length > 0;
export const fits = (q: Asked, sift: Sift) =>
  (!sift.modes.length || sift.modes.includes(q.mode)) &&
  ((!sift.domains.length && !sift.skills.length) ||
    sift.domains.includes(q.found.domain) ||
    sift.skills.includes(q.found.skill.name));

/** The activities as a filter names them. */
export const MODES_MANY: Record<Mode, string> = {
  skill: "Skill sets",
  daily: "Daily 10",
  exam: "Full-length exams",
  challenge: "Challenge questions",
  trial: "Time trials",
  endless: "Endless mode",
};
