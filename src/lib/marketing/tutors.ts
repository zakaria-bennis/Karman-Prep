// The tutors pictured on the home page (TutorArc.tsx). `kind` is one of the names in the "Tutors" section
// of site-copy.ts ("PhD students", "Professors", ...): it is the title shown when that tutor is at the top
// of the arc.

export interface TutorPhoto {
  /** A path under public/, or "" until the photo is supplied: the arc then shows a plain frame. */
  src: string;
  kind: string;
}

/**
 * The six tutors on the arc. The founder is supplying six real photos (2026-11-10); until each arrives its
 * place is a plain frame with no picture. Add the files under public/site/tutors/ and put their paths here.
 * The pairing of place and kind is a first guess and is his to correct.
 */
export const TUTOR_PHOTOS: TutorPhoto[] = [
  { src: "", kind: "PhD students" },
  { src: "", kind: "Medical students" },
  { src: "", kind: "Published writers" },
  { src: "", kind: "Peer-reviewed researchers" },
  { src: "", kind: "Professors" },
  { src: "", kind: "PhD students" },
];
