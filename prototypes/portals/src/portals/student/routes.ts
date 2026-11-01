import type { ScreenRoute } from "../../gallery/types.ts";

/**
 * The student portal's screens, home first (the gallery opens the first one).
 * Erasable TypeScript only: scripts/shots.mjs imports this through Node's
 * type stripping.
 */
const r = (id: string, title: string, module: string): ScreenRoute => ({
  id,
  portal: "student",
  title,
  roles: ["student"],
  module,
});

export const studentRoutes: ScreenRoute[] = [
  r("home", "Home", "student/Home.tsx"),
  r("daily10", "Your Daily 10", "student/Daily10.tsx"),
  r("practice", "Practice by skill", "student/Practice.tsx"),
  r("endless", "Endless mode", "student/Endless.tsx"),
  r("trials", "Time trials", "student/TimeTrials.tsx"),
  r("test", "Full-length tests", "student/FullLength.tsx"),
  r("test-review", "Full-length test results", "student/TestReview.tsx"),
  r("classes", "Classes and sessions", "student/Classes.tsx"),
  r("progress", "Progress", "student/Progress.tsx"),
  r("rewards", "Rewards", "student/Rewards.tsx"),
  r("onboarding", "Onboarding", "student/Onboarding.tsx"),
  r("diagnostic", "The diagnostic", "student/Diagnostic.tsx"),
  r("settings", "Settings", "student/Settings.tsx"),
];
