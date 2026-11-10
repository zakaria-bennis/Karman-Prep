// The tutors pictured on the home page (TutorArc.tsx). `kind` is one of the names in the "Tutors" section
// of site-copy.ts ("PhD students", "Professors", ...): it is the title shown when that photo is at the top
// of the arc.

export interface TutorPhoto {
  /** A path under public/. */
  src: string;
  kind: string;
}

/**
 * The real photos. EMPTY until the founder supplies his six (2026-11-10): while it is empty the live site
 * keeps the five drawings. Add the files under public/site/tutors/ and list them here; then delete
 * STAND_IN_TUTORS, the drawings and their branch in page.tsx.
 */
export const TUTOR_PHOTOS: TutorPhoto[] = [];

/**
 * Development only. Open-licence stock portraits of strangers (Unsplash), so the layout can be judged
 * before the real photos arrive. The files are kept out of git (.gitignore) and are never used in
 * production: these people are not Karman tutors.
 */
export const STAND_IN_TUTORS: TutorPhoto[] = [
  { src: "/site/tutors/standin/p1.jpg", kind: "PhD students" },
  { src: "/site/tutors/standin/p2.jpg", kind: "Medical students" },
  { src: "/site/tutors/standin/p3.jpg", kind: "Published writers" },
  { src: "/site/tutors/standin/p4.jpg", kind: "Published researchers" },
  { src: "/site/tutors/standin/p5.jpg", kind: "Professors" },
  { src: "/site/tutors/standin/p6.jpg", kind: "PhD students" },
];
