/* Shared shapes for quiz runs (Daily 10, practice set, Domain quiz, full-length test, diagnostic,
   time trial). */
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import type { SkillLevel } from "@/lib/levels/rules";
import type { TrialRoundResult, TrialStanding } from "@/lib/student/time-trial";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

export type RunKind =
  | "daily-ten"
  | "practice-set"
  | "domain-quiz"
  | "full-test"
  | "diagnostic"
  | "time-trial";

export type RunSectionForm = {
  key: string;
  title: string;
  subject: "reading" | "math";
  /** Countdown seconds for timed sections; null counts up. */
  seconds: number | null;
  /** Fixed questions; for a routed Module 2 this fills in when Module 1 is submitted. */
  questionIds: string[];
  /** Module 2 variants, routed by the right answers in `routeFrom`. */
  variants?: { easier: string[]; harder: string[]; routeFrom: string; route?: "easier" | "harder" };
  /** A break screen comes before this section. */
  breakBefore?: boolean;
};

export type RunForm = {
  title: string;
  /** "instant" grades each answer; "end" grades a whole timed section when it is submitted. */
  grading: "instant" | "end";
  sections: RunSectionForm[];
  /** Practice set: questions are chosen one at a time from the frozen pool. */
  adaptive?: { size: number; skillId: string; startDifficulty: number; maxDifficulty: number };
  /** Time trial: the round and pace this run was started at. */
  trial?: TrialStanding;
};

export type RunResponse = {
  ordinal: number;
  sectionKey: string;
  questionId: string;
  skillId: string;
  difficulty: number;
  studentAnswer: string;
  isCorrect: boolean;
  usedHint: boolean;
  seconds: number;
  answeredAt: string;
  levelBefore: SkillLevel | null;
  levelAfter: SkillLevel | null;
};

export type SkillMove = {
  skillId: string;
  label: string;
  from: SkillLevel;
  to: SkillLevel;
  right: number;
  total: number;
};

export type RunResult = {
  right: number;
  total: number;
  /** Per section: right of total. */
  sections: {
    key: string;
    title: string;
    subject: "reading" | "math";
    right: number;
    total: number;
  }[];
  /** Skills touched, most moved first. */
  skills: SkillMove[];
  tokens: number;
  /** Full-length test and diagnostic only: one predicted number per section and a total. */
  predicted?: { reading: number; math: number; total: number };
  /** Daily 10 only. */
  streak?: number;
  /** Time trial only: the round's pace, accuracy and the next round's pace. */
  trial?: TrialRoundResult;
};

export type RunRecord = {
  id: string;
  studentId: string;
  kind: RunKind;
  runKey: string;
  scope: string | null;
  form: RunForm;
  snapshots: CatalogDeliverySnapshot[];
  sequence: string[];
  startedAt: string;
  completedAt: string | null;
  result: RunResult | null;
};

export type RunReview = StudentQuizReview & { questionId: string };

/** What crosses the action boundary: no answer key before a response is saved. */
export type RunView = {
  id: string;
  kind: RunKind;
  title: string;
  scope: string | null;
  grading: "instant" | "end";
  startedAt: string;
  completedAt: string | null;
  sections: {
    key: string;
    title: string;
    subject: "reading" | "math";
    seconds: number | null;
    total: number;
    breakBefore: boolean;
    done: boolean;
    /** Skill label per question id, for the topic line. */
    topics: Record<string, string>;
    questions: StudentQuizQuestion[];
  }[];
  /** Index of the first section still open; null when the run is finished. */
  current: number | null;
  reviews: Record<string, RunReview>;
  answered: number;
  total: number;
  result: RunResult | null;
};
