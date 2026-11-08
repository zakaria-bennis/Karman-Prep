/**
 * "Tour as Maya": everything a Private 20 student experiences, in order, as
 * gallery routes. The gallery shows it as a list; each stop is one screen
 * with one line. Erasable TypeScript only (the gallery and scripts import it).
 */
export interface TourStop {
  portal: "student" | "daily10" | "parent";
  screen: string;
  plan: "private20";
  state: "first-day" | "long-time";
  /** The gallery's role switch; the parent's view needs the parent role. */
  role?: "parent";
  line: string;
}

export const TOUR: TourStop[] = [
  {
    portal: "student",
    screen: "onboarding",
    plan: "private20",
    state: "first-day",
    line: "Set up: which test, a photo of the score report, the target.",
  },
  {
    portal: "student",
    screen: "diagnostic",
    plan: "private20",
    state: "first-day",
    line: "The diagnostic sets the first Karman predicted score.",
  },
  {
    portal: "student",
    screen: "home",
    plan: "private20",
    state: "long-time",
    line: "Home leads with the next thing to do.",
  },
  {
    portal: "student",
    screen: "daily10",
    plan: "private20",
    state: "long-time",
    line: "Your Daily 10, then the end screen.",
  },
  {
    portal: "daily10",
    screen: "end",
    plan: "private20",
    state: "long-time",
    line: "The end screen: tokens, the box, the fox.",
  },
  {
    portal: "student",
    screen: "practice",
    plan: "private20",
    state: "long-time",
    line: "Practice by skill: pick one of 39, get a set.",
  },
  {
    portal: "student",
    screen: "trials",
    plan: "private20",
    state: "long-time",
    line: "Time trials at the real test's pace.",
  },
  {
    portal: "student",
    screen: "endless",
    plan: "private20",
    state: "long-time",
    line: "Endless mode: the picker chooses every next question.",
  },
  {
    portal: "student",
    screen: "test",
    plan: "private20",
    state: "long-time",
    line: "A full-length test: two modules a section, a break between.",
  },
  {
    portal: "student",
    screen: "test-review",
    plan: "private20",
    state: "long-time",
    line: "The results: the predicted score and every mistake by skill.",
  },
  {
    portal: "student",
    screen: "classes",
    plan: "private20",
    state: "long-time",
    line: "Sessions: book the next hour with Zakaria.",
  },
  {
    portal: "student",
    screen: "rewards",
    plan: "private20",
    state: "long-time",
    line: "Rewards: tokens, the box, the fox's wardrobe, the owl.",
  },
  {
    portal: "student",
    screen: "progress",
    plan: "private20",
    state: "long-time",
    line: "Progress: skills by level and the score ladder.",
  },
  {
    portal: "student",
    screen: "settings",
    plan: "private20",
    state: "long-time",
    line: "Settings, with what every answer saves.",
  },
  {
    portal: "parent",
    screen: "home",
    plan: "private20",
    state: "long-time",
    role: "parent",
    line: "The parent's view of the same student.",
  },
];

/** The hash for a stop, with the gallery's switches it needs. */
export const tourHash = (s: TourStop) =>
  `#/screen/${s.portal}/${s.screen}?portal=${s.portal}&screen=${s.screen}&plan=${s.plan}&state=${s.state}${s.role ? `&role=${s.role}` : ""}`;
