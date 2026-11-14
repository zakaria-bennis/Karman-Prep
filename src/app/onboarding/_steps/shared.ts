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

/** What the fox says at each step (docs/forms/onboarding-notes.md). Short, kind, never guilt. */
export const GUIDE = {
  hello: "Hi! Eight quick questions, about a minute. Then I'll show you the plan that fits.",
  role: "First, who am I talking to?",
  sat: "Good. Which test, and when?",
  baseline: "Where are you starting from? A rough idea is fine.",
  goal: "Now the fun part. What score are you aiming for?",
  minutes: "Small and steady beats big and rare. Pick what you'll really do.",
  independence: "Be honest. There's no wrong answer here.",
  pace: "This helps me pick how you're taught.",
  prior: "Last one.",
  building: "Putting your plan together...",
  recommendation: "Here it is. This is the plan I'd pick for you.",
} as const;

/** The fox's answer to the scores: the gap, said plainly, or encouragement when there is no starting score. */
export function gapLine(baseline: number | null, goal: number): string {
  if (baseline === null)
    return `A ${goal}. Good target. We'll find your starting point first, then close the gap.`;
  const gap = goal - baseline;
  if (gap <= 0) return `You're already at ${baseline}. Let's hold it and push past ${goal}.`;
  return `From ${baseline} to ${goal}. That's ${gap} points, and it's doable with steady work.`;
}
