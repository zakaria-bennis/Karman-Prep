import type { ScreenRoute } from "../../gallery/types.ts";

/** The parent portal’s screens. Erasable TypeScript only (no enums): scripts/shots.mjs imports it with Node’s type stripping. */
const roles: ScreenRoute["roles"] = ["parent", "admin"];
export const parentRoutes: ScreenRoute[] = [
  { id: "home", portal: "parent", title: "Progress", roles, module: "parent/Home.tsx" },
  { id: "skills", portal: "parent", title: "Skills", roles, module: "parent/Skills.tsx" },
  { id: "updates", portal: "parent", title: "Weekly updates", roles, module: "parent/Updates.tsx" },
  { id: "update", portal: "parent", title: "Weekly update", roles, module: "parent/Update.tsx" },
  { id: "schedule", portal: "parent", title: "Schedule", roles, module: "parent/Schedule.tsx" },
  { id: "plan", portal: "parent", title: "Plan and billing", roles, module: "parent/Plan.tsx" },
  { id: "settings", portal: "parent", title: "Settings", roles, module: "parent/Settings.tsx" },
];
