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
  // after paying for a plan without an account (src/lib/checkout/guest.ts)
  "paid-sign-up": ["You're paid up. Now make your account."],
  "paid-sign-in": ["You're paid up. Sign in to open your plan."],
} as const;

/** The greetings for a visitor: the "paid" ones when they come from /checkout/done. */
export function greetingsFor(mode: "sign-in" | "sign-up", redirectUrl: string | undefined) {
  const paid = typeof redirectUrl === "string" && redirectUrl.startsWith("/checkout/done");
  return GREETINGS[paid ? (`paid-${mode}` as const) : mode];
}
