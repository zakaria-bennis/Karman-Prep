/**
 * The score-report reader, one swappable module. Onboarding asks for a photo or
 * screenshot of the SAT or PSAT score report; the student never types a score.
 * Until the image service has a key, `WAITING_READER` answers "waiting for a
 * person to read it" and the upload waits in the tutor view. A real reader
 * returns the scores, the test date, and asks for a retake when the picture is
 * blurry, cropped or not a score report. The image is private student data and
 * never leaves the page in this prototype.
 */
export type ReaderResult =
  | { status: "waiting" }
  | { status: "retake"; reason: "blurry" | "cropped" | "not-a-report" }
  | {
      status: "read";
      test: "SAT" | "PSAT";
      date: string;
      total: number;
      rw: number;
      math: number;
    };

export interface ScoreReportReader {
  name: string;
  read(file: File): Promise<ReaderResult>;
}

export const WAITING_READER: ScoreReportReader = {
  name: "A person reads it",
  async read() {
    return { status: "waiting" };
  },
};

/** The swap point: the app replaces this with the image service once its key exists. */
export const reader: ScoreReportReader = WAITING_READER;

export const COHORT_SPLIT = 1250;
/** Which cohort a score points at, from the 1250 split (plan ladder, 2026-10-30). */
export const suggestCohort = (total: number) =>
  total >= COHORT_SPLIT ? ("above" as const) : ("below" as const);

export const RETAKE_COPY: Record<Extract<ReaderResult, { status: "retake" }>["reason"], string> = {
  blurry: "The picture is blurry. Hold still and take it again.",
  cropped: "Part of the report is cut off. Fit the whole page in the picture.",
  "not-a-report":
    "That doesn't look like a score report. Open the report and take a picture of it.",
};

console.assert(
  suggestCohort(1180) === "below" && suggestCohort(1250) === "above",
  "the split is 1250"
);
