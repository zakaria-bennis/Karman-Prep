// The portal's activities on the quiz-run machinery (overnight build, 2026-11-22, Quiz modes).
// A run started from the portal carries `form.play` (what it is and how it ends) and, once it
// finishes, `result.play` (the 72-skill levels it moved, the coins it banked, the endless run).
// Pure types, safe on the client and the server.

/** The portal's four levels: 0 Not started, 1 Learning, 2 Understanding, 3 Proficient. */
export type Level72 = 0 | 1 | 2 | 3;

export type PlayMode = "set" | "daily" | "endless" | "review" | "trial";

/** Where an endless run or a time trial draws from. */
export type PlayScope =
  | { kind: "skill"; skillId: string }
  | { kind: "domain"; domain: string }
  | { kind: "section"; section: "Reading and Writing" | "Math" };

export type PlayForm = {
  mode: PlayMode;
  /** The 72-skill a skill set or a skill's endless run, trial or review is on. */
  skillId?: string;
  scope?: PlayScope;
  /** Endless: misses that end the run. */
  hearts?: number;
  /** Each question's 72-skill (and domain), for the levels, the coins and endless's picking. */
  skills?: Record<string, { s: string; d: string }>;
  /** Daily 10: the questions that are spaced reviews of due skills (src/lib/play/reviews.ts). */
  reviews?: string[];
  /** Endless: how much each skill is leaned on (weaker skills more), by 72-skill id. */
  weights?: Record<string, number>;
  /** Skill sets: the question put right with a Second chance (one a set). */
  rescued?: string;
};

export type PlayAnswer = {
  questionId: string;
  /** The 72-skill's name. */
  skill: string;
  ok: boolean;
  rescued?: boolean;
  /** A spaced review of a due skill (Daily 10). */
  review?: boolean;
  seconds: number;
};

export type PlayCoins = {
  total: number;
  lines: { label: string; coins: number }[];
  multiplier: number;
  /** The coin balance before this run's coins were banked. */
  walletBefore: number;
};

export type PlayResult = {
  mode: PlayMode;
  answers: PlayAnswer[];
  coins: PlayCoins;
  /** Skill set: the 72-skill's level before and after. */
  level?: { skillId: string; skill: string; from: Level72; to: Level72 };
  /** Daily 10: every 72-skill that moved. */
  moves?: { skillId: string; skill: string; from: Level72; to: Level72 }[];
  /** Endless: right answers in the run, and the best run before it. */
  endless?: { run: number; best: number; hearts: number };
  /** Daily 10: days in a row with today, and the best. */
  streak?: { days: number; best: number };
};
