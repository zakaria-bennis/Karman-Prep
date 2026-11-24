// Every page the site can show, for the Page Studio (/studio). One entry per screen: the marketing
// site, sign-up and start, the student portal and its quizzes, and the parent, tutor, school and
// admin portals. The entries live in pages-public.ts and pages-portals.ts; inventory.test.ts checks
// that every page file under src/app is listed in one of them, so a new page cannot be missed.
//
// `path` is the address, with [params] where the page needs one. A param is filled from:
//   · `samples`: a fixed example from the site's own lists (a skill, a domain, exam 1), see samples.ts;
//   · or what the studio has seen while browsing (the parent's child, a cohort), learned from `from`.
import { PORTAL_PAGES } from "./pages-portals";
import { PUBLIC_PAGES } from "./pages-public";

export type Persona = "visitor" | "student" | "parent" | "tutor" | "teacher" | "admin";

export type AreaId =
  | "site"
  | "start"
  | "student"
  | "quiz"
  | "parent"
  | "tutor"
  | "school"
  | "admin";

/** A fixed example value for a param, resolved on the server (samples.ts). */
export type SampleKey = "subSkill" | "catalogSkill" | "skill72" | "domain" | "examForm" | "rwNode";

export interface StudioPage {
  /** Stable key: notes and review marks are kept against it. */
  id: string;
  area: AreaId;
  title: string;
  /** Address with [params], plus an optional query string. */
  path: string;
  /** The page file under src/app (for the coverage test). */
  file: string;
  /** Who should be looking. */
  as: Persona;
  /** Fixed examples for params. */
  samples?: Record<string, SampleKey>;
  /** Where to open first when a data param has not been seen yet. */
  from?: string;
  /** One short line: how to reach this state, or what it needs. */
  hint?: string;
  /** Only sends the visitor elsewhere: listed, skipped when flipping. */
  redirects?: string;
}

export const AREAS: ReadonlyArray<{ id: AreaId; label: string }> = [
  { id: "site", label: "Marketing site" },
  { id: "start", label: "Sign up and start" },
  { id: "student", label: "Student portal" },
  { id: "quiz", label: "Quizzes and tests" },
  { id: "parent", label: "Parent portal" },
  { id: "tutor", label: "Tutor portal" },
  { id: "school", label: "School portal" },
  { id: "admin", label: "Admin" },
];

/** Page files that are not part of the site anyone sees, with the reason. */
export const NOT_LISTED: ReadonlyArray<{ prefix: string; why: string }> = [
  {
    prefix: "src/app/dev/",
    why: "Design pages: only on a developer's computer, 404 on the live site",
  },
  { prefix: "src/app/studio/", why: "This review tool itself, for admins only" },
];

/** Every page, in the order the page list shows them. */
export const STUDIO_PAGES: readonly StudioPage[] = [...PUBLIC_PAGES, ...PORTAL_PAGES];

/** The pages worth flipping through (not the old addresses that only send you on). */
export const FLIP_PAGES: readonly StudioPage[] = STUDIO_PAGES.filter((p) => !p.redirects);

export function pageById(id: string): StudioPage | undefined {
  return STUDIO_PAGES.find((p) => p.id === id);
}
