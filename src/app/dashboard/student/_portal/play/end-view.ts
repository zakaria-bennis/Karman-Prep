// What every activity's ending is told about how it went (overnight build, 2026-11-22). The player
// (PlayLayer.tsx) builds one from the finished run; the ending (ActivityEnd.tsx) draws it. One
// family for every activity: the student's character in a ring at the left, each answer at the
// right, the coins flying up into the corner, one green button for the next step.
//
// Pure types, safe on the client and the server.

export type Activity =
  | "set" // a skill set: 8 questions on one of the 72 skills
  | "daily" // the Daily 10
  | "endless" // endless mode: three hearts, as long as it lasts
  | "trial" // a time trial (skill, domain or section)
  | "challenge" // the two challenge questions of the day
  | "strategy" // a strategy quiz (the compass), at most five questions
  | "review"; // reviewing mistakes

/** The portal's four levels: 0 Not started, 1 Learning, 2 Understanding, 3 Proficient. */
export type Level = 0 | 1 | 2 | 3;

export type EndAnswer = {
  ok: boolean;
  /** A miss put right with a Second chance (skill sets only): it counts as right for the level. */
  rescued?: boolean;
  /** A spaced review of a skill that was due (Daily 10). */
  review?: boolean;
  /** The skill it came from (Daily 10, endless across a domain or section, review). */
  skill?: string;
  /** Seconds spent (time trials; also kept for others). */
  seconds?: number;
};

export type CoinLine = { label: string; coins: number };

export type EndView = {
  activity: Activity;
  /** The name in the chip at the top left: the skill, "Daily 10", "Endless", ... */
  title: string;
  right: number;
  total: number;
  /** Every answer, first to last (endless: the whole run). */
  answers: EndAnswer[];
  /** Coins this activity earned, already multiplied. Banked by the server when the run finished. */
  coins: number;
  /** How they were earned (right answers, finishing, level-ups, streak, the multiplier). */
  coinLines: CoinLine[];
  /** The balance before these coins (the corner counter starts here and ticks up to wallet+coins). */
  wallet: number;
  /** The challenge multiplier the coins were multiplied by (1 when none). */
  multiplier: number;

  /** Skill set: the skill's level before and after (the level-up plays when to > from). */
  level?: { skill: string; from: Level; to: Level };
  /** Daily 10: each skill that moved, up or down. */
  moves?: { skill: string; from: Level; to: Level }[];
  /** Daily 10 and challenge: days in a row, with today, and the best. */
  streak?: { days: number; best: number };
  /** Endless: right answers in the run, the best run before it, and whether this one beat it. */
  endless?: { run: number; best: number; newBest: boolean; hearts: number };
  /** Time trial: pace and accuracy. Seconds are whole seconds. */
  trial?: {
    kind: "skill" | "domain" | "section";
    round: number;
    /** This round's time as a share of the real SAT time (1.25 down to 0.75). */
    multiplier: number;
    /** The next round's share. */
    next: number;
    /** Time allowed and time taken. */
    limitSeconds: number;
    usedSeconds: number;
    /** The student's average seconds a question, and the real SAT's for the section. */
    pace: number;
    testPace: number;
    /** Right of answered, 0 to 1. */
    accuracy: number;
    /** The accuracy the round needed to step down a notch. */
    bar: number;
    held: boolean;
    timeUp: boolean;
  };
  /** Challenge: the multiplier before and after today, and the streak of days. */
  challenge?: { before: number; after: number };
};

/** What the ending's buttons do. The player passes only the ones that apply. */
export type EndActions = {
  /** Back to where the activity was started (the skill page, Homework, the Library). */
  done(): void;
  /** The same activity again (another set, another endless run, the next trial round). */
  again?(): void;
  /** Review this activity's mistakes. */
  review?(): void;
  /** Read (later, watch) the skill's lesson. */
  lesson?(): void;
  /** A skill set on this skill (from a strategy quiz or a review). */
  practice?(): void;
  /** The next skill in the Library. */
  nextSkill?(): void;
};
