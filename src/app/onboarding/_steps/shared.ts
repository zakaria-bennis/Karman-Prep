export type Role = "student" | "parent";

/** Every word of the plan-finder (/onboarding). Short and plain; no dashes. Each question is one a test
 *  prep company needs answered to place a student (founder, 2026-11-14), and each feeds the plan
 *  (lib/onboarding/recommend-plan.ts). */
export const FINDER = {
  hello: "Welcome. I'm Karman. Let's find your plan.",
  helloButton: "Take off",
  next: "Continue",
  role: {
    say: "Who's flying with us?",
    headline: "Who is this for?",
    student: ["I'm the student", "I'm taking the SAT."],
    parent: ["I'm a parent", "My child is taking the SAT."],
    parentBusy: "Opening your parent portal",
  },
  month: {
    say: "Where are we headed?",
    headline: "Which SAT are you taking?",
    notSure: "Not sure yet",
  },
  score: {
    say: "Where are we taking off from?",
    headline: "Your latest SAT score",
    field: "SAT score",
    none: "No SAT yet",
  },
  goal: {
    say: "And where do you want to land?",
    headline: "Your goal score",
    field: "Goal score",
  },
  time: {
    say: "A College Board and Khan Academy study linked 20 hours of practice to a 115-point average gain.",
    headline: "How much time can you give the SAT each week?",
    options: [
      [2, "2 to 3 hours"],
      [5, "4 to 6 hours"],
      [8, "7 to 10 hours"],
      [12, "More than 10 hours"],
    ] as [number, string][],
  },
  study: {
    say: "Be honest. There's no wrong answer.",
    headline: "How do you study for the SAT best?",
    options: {
      on_my_own: "On my own. I stick to a plan.",
      with_checkins: "With a teacher and a set class time.",
      needs_structure: "I put it off unless someone is expecting me.",
    },
  },
  miss: {
    say: "This tells me how to teach you.",
    headline: "When you miss an SAT question, what helps?",
    options: {
      quick: "Reading the explanation is enough.",
      average: "A few more questions like it.",
      slower: "Someone walking me through it.",
    },
  },
  prior: {
    say: "Last one.",
    headline: "Have you prepped for the SAT before?",
    options: {
      first_time: "No, this is my first time.",
      worked: "Yes, and my score improved.",
      didnt_move: "Yes, but my score didn't improve.",
    },
  },
  building: "I can see it from here.",
  plan: {
    say: "We've landed. Here's your plan.",
    because: "From your answers",
    also: "Or",
    save: "Save my plan",
    saveNote: "A free account keeps this plan. It takes a few seconds.",
    all: "See every plan",
    busy: "One moment",
  },
  errors: { score: "Enter a score from 400 to 1600 that ends in 0." },
} as const;

/** Karman's answer to the scores: the distance, said plainly. */
export function gapLine(baseline: number | null, goal: number): string {
  if (baseline === null) return `A ${goal}. Good place to land.`;
  const gap = goal - baseline;
  if (gap <= 0) return `You're already at ${baseline}. Let's climb past ${goal}.`;
  return `From ${baseline} to ${goal}. That's ${gap} points to gain.`;
}

/** How far along the landscape's route the plan-finder has flown, from 0 to 1. Each answer is a short leg;
 *  the plan's own page starts where the last leg ends, so the landscape carries on when the visitor
 *  arrives there (each page's stretch is set in its page.tsx). */
export const LANDING: Record<string, number> = {
  "/reserve": 0.3,
  "/call": 0.5,
  "/pricing": 0.56,
};
export function flownAt(step: number, total: number, landing: number | null): number {
  if (landing !== null) return landing;
  return (step / (total - 1)) * 0.27;
}
