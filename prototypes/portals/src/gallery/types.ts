/** One screen a portal agent registers. Erasable TypeScript only: scripts/shots.mjs imports this through Node's type stripping. */
export type Portal = "student" | "parent" | "tutor" | "school" | "daily10";
export type Role = "student" | "parent" | "tutor" | "teacher" | "admin";

export interface ScreenRoute {
  /** The hash segment: #/screen/<portal>/<id>. */
  id: string;
  portal: Portal;
  title: string;
  /** Which roles may open it; the gallery's role switch filters by this. */
  roles: Role[];
  /** The component's module path under src, loaded by the stage through import.meta.glob. */
  module: string;
}
