export type Role = "student" | "parent";

// The questionnaire's wording. Only students take it: a parent gets a parent account at the
// role step and goes to the parent portal (founder, 2026-11-08).
export const COPY = {
  student: {
    sat: "Which test are you taking, and when?",
    goal: "What's your goal SAT score?",
    baselineQ: "Have you taken the SAT or PSAT recently?",
    baselineYes: "Yes — I'll enter my score",
    baselineNo: "Not yet",
    minutes: "How much can you practice each day?",
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

/** What Karman the fox says at each step (docs/forms/onboarding-notes.md). Short, kind, never guilt. The
 *  intake is a flight: Ollie the owl flies the route, and each answer is a leg of it. */
export const GUIDE = {
  hello:
    "I'm Karman. Ollie's flying us to your plan. Eight quick questions on the way, about a minute.",
  role: "Before we take off: who's flying with us?",
  sat: "Good. Where are we headed? Pick the test and the date.",
  baseline: "Where are we taking off from? A rough idea is fine.",
  goal: "And where do you want to land?",
  minutes: "Little and often gets you there. Pick what you'll really do.",
  independence: "Be honest. There's no wrong answer up here.",
  pace: "This tells me how you like to be taught.",
  prior: "Last one. We're nearly there.",
  building: "Ollie can see it from here. Putting your plan together...",
  recommendation: "We've landed. This is the plan I'd pick for you.",
} as const;

/** Karman's answer to the scores: the distance, said plainly, or encouragement when there is no starting
 *  score. */
export function gapLine(baseline: number | null, goal: number): string {
  if (baseline === null)
    return `A ${goal}. Good place to land. We'll find where you're taking off from first.`;
  const gap = goal - baseline;
  if (gap <= 0) return `You're already at ${baseline}. Let's hold it and climb past ${goal}.`;
  return `From ${baseline} to ${goal}. That's ${gap} points to fly, and steady work covers it.`;
}

/** How far along the landscape's route the intake has flown, from 0 to 1. Each answer is a short leg; the
 *  plan's own page starts where the last leg ends, so the landscape carries on when the visitor arrives
 *  there (each page's stretch is set in its page.tsx). */
export const LANDING: Record<string, number> = {
  "/reserve": 0.3,
  "/private-tutoring#call": 0.5,
  "/pricing": 0.56,
};
export function flownAt(step: number, total: number, landing: number | null): number {
  if (landing !== null) return landing;
  return (step / (total - 1)) * 0.27;
}
