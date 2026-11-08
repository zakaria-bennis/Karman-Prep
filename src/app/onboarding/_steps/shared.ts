export type Role = "student" | "parent";

// The questionnaire's wording. Only students take it: a parent gets a parent account at the
// role step and goes to the parent portal (founder, 2026-11-08).
export const COPY = {
  student: {
    sat: "When are you planning to take the SAT?",
    goal: "What's your goal SAT score?",
    baselineQ: "Have you taken the SAT or PSAT recently?",
    baselineYes: "Yes — I'll enter my score",
    baselineNo: "Not yet",
    hours: "How many hours per week can you commit to studying?",
    indeQ: "How well do you stay on track when you're studying alone?",
    indeOnOwn: "I finish what I start without anyone checking on me.",
    indeCheckins: "I do best when someone checks in regularly.",
    indeStructure: "I tend to procrastinate without scheduled time and accountability.",
    paceQ: "When you learn something new, how does it usually go?",
    paceQuick: "I usually get it on the first explanation.",
    paceAvg: "I get it after a couple of practice rounds.",
    paceSlow: "I prefer to work through it multiple ways before it sticks.",
    priorQ: "Have you tried test prep before for the SAT?",
    priorFirst: "First time prepping for the SAT.",
    priorWorked: "Yes — and my score moved.",
    priorFlat: "Yes — but my score didn't really move.",
  },
} as const;
