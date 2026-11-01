import type { ScreenRoute } from "../../gallery/types.ts";

/**
 * The tutor portal's screens. Keep this file erasable TypeScript (no enums):
 * scripts/shots.mjs imports it with Node's type stripping. The first route is
 * a dispatcher: the gallery falls back to a portal's first route when its
 * role switch (default student) does not match, and the dispatcher reads the
 * screen from the hash itself.
 */
const roles: ScreenRoute["roles"] = ["tutor", "admin"];
const shared: ScreenRoute["roles"] = ["tutor", "teacher", "admin"];
const r = (id: string, title: string, module: string, who = roles): ScreenRoute => ({
  id,
  portal: "tutor",
  title,
  roles: who,
  module: `tutor/screens/${module}.tsx`,
});

export const tutorRoutes: ScreenRoute[] = [
  r("portal", "Tutor portal (any role)", "Portal", [
    "student",
    "parent",
    "tutor",
    "teacher",
    "admin",
  ]),
  r("today", "Today", "Today"),
  r("students", "Students", "Students", shared),
  r("student", "Student: the 1:1 briefing", "Student", shared),
  r("cohorts", "Cohorts", "Cohorts"),
  r("class", "Class: the next class", "Class", shared),
  r("homework", "Homework", "Homework"),
  r("schedule", "Schedule", "Schedule"),
  r("guarantee", "Guarantee", "Guarantee"),
  r("queue", "Score reports", "Queue"),
  r("earnings", "Earnings", "Earnings"),
  r("update", "Parent update", "Update"),
  r("notes", "Notes", "Notes", shared),
];
