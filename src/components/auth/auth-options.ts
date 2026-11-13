// TEMPORARY: the words each sign-in layout on offer uses, and which layout the address asks for. Delete this
// file once the founder picks; the chosen words then move to site-copy.ts.
import { FREE_PLAN } from "@/lib/marketing/offer";
import { AUTH_OPTIONS, type AuthOption } from "./auth-option-list";

export function readOption(o: string | undefined): AuthOption {
  return (AUTH_OPTIONS as readonly string[]).includes(o ?? "") ? (o as AuthOption) : "now";
}

const PERKS = [
  `${FREE_PLAN.questionLimit} practice questions`,
  "A full-length practice test, with a score report",
  "No card. No catch.",
];

export function authCopy(mode: "sign-in" | "sign-up", option: AuthOption) {
  if (option === "now") {
    return mode === "sign-in"
      ? { headline: "Sign in.", line: "Good to see you again." }
      : { headline: "Get started.", line: "Make your account in under a minute." };
  }
  if (mode === "sign-in") {
    return {
      headline: "Welcome back.",
      line: "Your score won't raise itself.",
    };
  }
  return {
    headline: "Start free.",
    line: `${FREE_PLAN.questionLimit} practice questions and a full-length practice test. No card. No catch.`,
    perks: PERKS,
    pitch: [
      `${FREE_PLAN.questionLimit} practice questions.`,
      "A full-length practice test.",
      "No card. No catch.",
    ],
  };
}
