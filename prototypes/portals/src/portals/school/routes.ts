import type { ScreenRoute } from "../../gallery/types.ts";

/**
 * The school portal's screens. Keep this file erasable TypeScript (no enums):
 * scripts/shots.mjs imports it with Node's type stripping. The first route is
 * a dispatcher: the gallery falls back to a portal's first route when its
 * role switch (default student) does not match, and the dispatcher reads the
 * screen from the hash itself. Admin screens are the admin's; the class,
 * student and practice screens are shared with the teacher.
 */
const admin: ScreenRoute["roles"] = ["admin"];
const shared: ScreenRoute["roles"] = ["teacher", "admin"];
const r = (id: string, title: string, module: string, who = admin): ScreenRoute => ({
  id,
  portal: "school",
  title,
  roles: who,
  module: `school/screens/${module}.tsx`,
});

export const schoolRoutes: ScreenRoute[] = [
  r("portal", "School portal (any role)", "Portal", [
    "student",
    "parent",
    "tutor",
    "teacher",
    "admin",
  ]),
  r("overview", "Overview", "Overview"),
  r("classes", "Classes", "Classes", shared),
  r("class", "Class", "Class", shared),
  r("students", "Students", "Students", shared),
  r("student", "Student", "Student", shared),
  r("practice", "Practice", "Practice", shared),
  r("keys", "Seat keys", "Keys"),
  r("teachers", "Teachers", "Teachers"),
  r("seats", "Seats and plan", "Seats"),
];
