/** How a quiz host wants the shared question screen to behave (spec: Modes). */
export type QuizClock =
  | { kind: "up" }
  | { kind: "down"; baseSeconds: number }
  | { kind: "none" };

export type QuizMode = {
  /** "locked" is read-only review or preview. */
  grading: "instant" | "end" | "locked";
  clock: QuizClock;
  /** Bluebook's section-only marker; only when grading waits until the end. */
  markForReview: boolean;
  /** Only students with a cohort or 1:1 tutor see "Flag for my tutor". */
  showTutorFlag: boolean;
  canBookmark: boolean;
};

export type HostKind = "skill" | "catalog" | "daily" | "diagnostic" | "timed" | "review" | "preview";

export function modeFor(
  host: HostKind,
  opts: { baseSeconds?: number; hasTutor: boolean }
): QuizMode {
  switch (host) {
    case "skill":
    case "catalog":
    case "daily":
      return {
        grading: "instant",
        clock: { kind: "up" },
        markForReview: false,
        showTutorFlag: opts.hasTutor,
        canBookmark: true,
      };
    case "diagnostic":
    case "timed": {
      if (!opts.baseSeconds || opts.baseSeconds <= 0)
        throw new Error("A countdown host needs baseSeconds");
      return {
        grading: "end",
        clock: { kind: "down", baseSeconds: opts.baseSeconds },
        markForReview: true,
        showTutorFlag: opts.hasTutor,
        canBookmark: true,
      };
    }
    case "review":
      return {
        grading: "locked",
        clock: { kind: "none" },
        markForReview: false,
        showTutorFlag: opts.hasTutor,
        canBookmark: true,
      };
    case "preview":
      return {
        grading: "locked",
        clock: { kind: "none" },
        markForReview: false,
        showTutorFlag: false,
        canBookmark: false,
      };
  }
}
