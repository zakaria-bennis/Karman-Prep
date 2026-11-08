import { useTheme } from "@/design-system/theme";

/*
 * Every way a student answers questions now runs on the real quiz engine, shown by the quiz
 * modes prototype (prototypes/quiz-modes, `node prototypes/quiz-modes/server.mjs`, port
 * 5180). These screens keep their entry rows and their locked, loading and error states, and
 * hand the questions themselves to it, in the same light or dark mode.
 */
export const QUIZ_MODES_URL = "http://127.0.0.1:5180/";

export type QuizMode =
  | "daily10"
  | "challenge"
  | "endless-math"
  | "endless-rw"
  | "full-adaptive"
  | "full-linear"
  | "trials"
  | "skill"
  | "diagnostic";

/** The quiz modes prototype's domain keys, by this portal's domain labels. */
const DOMAIN_KEYS: Record<string, string> = {
  "Information and Ideas": "info_ideas",
  "Craft and Structure": "craft_structure",
  "Expression of Ideas": "expression_ideas",
  "Standard English Conventions": "conventions",
  Algebra: "algebra",
  "Advanced Math": "advanced_math",
  "Problem-Solving and Data Analysis": "data_analysis",
  "Geometry and Trigonometry": "geometry",
};

export function quizModeHref(mode: QuizMode, dark: boolean, domain?: string): string {
  const q = new URLSearchParams({ mode, theme: dark ? "dark" : "light" });
  const key = domain ? DOMAIN_KEYS[domain] : undefined;
  if (key) q.set("skill", key);
  return `${QUIZ_MODES_URL}?${q.toString()}`;
}

/** Opens a mode in the quiz engine, in the portal's current light or dark mode. */
export function useOpenQuizMode() {
  const { dark } = useTheme();
  return (mode: QuizMode, domain?: string) => location.assign(quizModeHref(mode, dark, domain));
}
