// The greetings the sign-in pages type in (CabinStage.tsx). One is picked at random on each visit.
// They live here, not in site-copy.ts, because that file is at its size limit.
export const GREETINGS = {
  "sign-in": [
    "Welcome back. We missed you.",
    "There you are. Come on in.",
    "Good to see you again.",
    "Welcome back. Pick up right where you left off.",
    "Come in. It's warm inside.",
  ],
  "sign-up": ["Welcome. Come on in.", "New here? Make yourself at home.", "Come in from the cold."],
} as const;
