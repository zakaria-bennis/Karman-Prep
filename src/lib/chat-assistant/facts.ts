/*
 * What the after-hours assistant knows about Karman. It is gathered from the places the site itself
 * reads (offer.ts for every price, date and term; the published FAQ in site-copy.ts), so an answer
 * can never drift from the site. The few facts about how the student portal works are written here
 * from the founder's own answers. Nothing is invented: what is not here, the assistant says it
 * does not know and leaves for the tutor.
 */
import {
  CALL_MINUTES,
  COHORT_SCHOLARSHIP,
  CONTACT,
  FREE_PLAN,
  FREE_PRACTICE_TEST,
  GUARANTEE,
  INTAKE_NOTE,
  MARCH_PROGRAM,
  NEXT_PROGRAMS,
  NEXT_PROGRAMS_ENROLLMENT_LABEL,
  PLAN_RENEWAL,
  PRACTICE_PLAN,
  PRIVATE_INCLUDES,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  QUESTION_BANK,
  SAT_DATES,
} from "@/lib/marketing/offer";
import { pairs, section } from "@/lib/marketing/site-copy";

/** How the student portal works (founder's answers, November 2026). */
export const PORTAL_FACTS = [
  "Tutors answer chat from 9 AM to 9 PM Central time. Outside those hours an automated assistant answers and the tutor follows up in the morning.",
  "Full-length practice exams can be started only on Saturday, from 6 AM to midnight. An exam pass, bought with coins on the Rewards page, lets a student start one on another day.",
  "Cohort and private students take one full-length practice exam every week.",
  "A skill has four levels: Not started, Learning, Understanding, Proficient. A skill set is 8 questions and can move a skill up one level at a time.",
  "The Daily 10 is ten questions a day across a student's skills. The challenge question is one hard question a day.",
  "Homework is assigned by the tutor: skill sets, strategy quizzes, flashcards and time trials. Late homework closes and shows as missing.",
  "The Mistake Log keeps every question a student has answered, with bookmarks and flags. A bookmarked or flagged question can be sent into a chat to ask about it.",
  "Chat is for working questions out together. Sharing answers, contact details or social accounts is not allowed.",
  "A parent can read the chat between their child and the tutor.",
  "Practice tests are Karman's own. They are not official College Board tests.",
].join("\n");

const lines = (label: string, value: unknown) => `${label}:\n${JSON.stringify(value, null, 1)}`;

/** Everything the assistant may answer from, as one text. */
export function karmanFacts(): string {
  const faq = section(71);
  const answered = ["money", "promise", "classes", "start"]
    .flatMap((group) => pairs(faq[group]))
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n");
  return [
    "HOW THE PORTAL WORKS\n" + PORTAL_FACTS,
    "QUESTIONS PARENTS ASK, WITH KARMAN'S OWN ANSWERS\n" + answered,
    "THE OFFER, AS DATA (prices are in US dollars)",
    lines("Cohort program", MARCH_PROGRAM),
    lines("Later cohorts", { programs: NEXT_PROGRAMS, note: NEXT_PROGRAMS_ENROLLMENT_LABEL }),
    lines("SAT dates", SAT_DATES),
    lines("Private tutoring packages", PRIVATE_PACKAGES),
    lines("Private tutoring includes", PRIVATE_INCLUDES),
    lines("Free plan", FREE_PLAN),
    lines("Practice plan", PRACTICE_PLAN),
    lines("Pro plan", PRO_PLAN),
    `Plan renewal: ${PLAN_RENEWAL}`,
    lines("Free practice test", FREE_PRACTICE_TEST),
    lines("Question bank", QUESTION_BANK),
    lines("Score guarantee", GUARANTEE),
    `Who the program takes: ${INTAKE_NOTE}`,
    lines("Cohort scholarship", COHORT_SCHOLARSHIP),
    `A first call with Karman is ${CALL_MINUTES} minutes and free.`,
    lines("Contact", CONTACT),
  ].join("\n\n");
}
