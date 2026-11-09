import { studentRoutes } from "../portals/student/routes.ts";
import { parentRoutes } from "../portals/parent/routes.ts";
import { tutorRoutes } from "../portals/tutor/routes.ts";
import { schoolRoutes } from "../portals/school/routes.ts";
import { daily10Routes } from "../portals/daily10/routes.ts";
import type { ScreenRoute } from "./types.ts";

/** Every screen the gallery can open, by portal. scripts/shots.mjs reads this file too. */
export const ROUTES: ScreenRoute[] = [
  ...studentRoutes,
  ...parentRoutes,
  ...tutorRoutes,
  ...schoolRoutes,
  ...daily10Routes,
];

/** The gallery's switches and their values, in the order the start page shows them. */
export const SWITCHES = {
  portal: ["student", "parent", "tutor", "school", "daily10"],
  role: ["student", "parent", "tutor", "teacher", "admin"],
  plan: ["free", "practice", "pro", "cohort", "private10", "private20", "school"],
  device: ["phone", "narrow", "ipad", "desktop"],
  theme: [
    "observatory",
    "charcoal",
    "forest",
    "plum",
    "ivory",
    "paper",
    "sand",
    "sage",
    "lavender",
    "peach",
    "rose",
    "blush",
  ],
  mode: ["device", "light", "dark"],
  state: ["long-time", "first-day", "empty", "loading", "error", "locked"],
  type: ["hanken", "plex"],
  bg: ["sky", "ruled", "contour", "grain"],
  glass: ["refract", "frost"],
} as const;

export const DEFAULTS = {
  portal: "student",
  role: "student",
  plan: "pro",
  device: "phone",
  theme: "",
  mode: "device",
  state: "long-time",
  type: "hanken",
  bg: "contour",
  glass: "refract",
} as const;
