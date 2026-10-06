"use client";

// ============================================================
// QuizContext — Adaptive quiz state machine
// Holds everything the QuizEngine + floating windows (Desmos,
// Scratchpad) need to read or mutate without prop-drilling.
// ============================================================

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  AdaptiveStep,
  ConfidenceBand,
  QuizDifficulty,
  QuizDifficultyLevel,
  StudentQuizQuestion,
  StudentQuizReview,
  QuestionResponse,
} from "@/types/quiz";
import { stepDifficultyLevel, levelToLegacyDifficulty } from "@/types/quiz";
import { prepareQuizSession, selectNextQuestion, QUIZ_LENGTH } from "@/lib/quiz-session";
import {
  actionStartQuiz,
  actionRecordResponse,
  actionCompleteQuiz,
  actionFlagQuestion,
} from "@/app/learn/quiz-actions";
import type { Subject } from "@/data/curriculum";
import { playSound } from "@/lib/sounds";
import * as Sentry from "@sentry/nextjs";

// ── State / events ───────────────────────────────────────────

export type QuizPhase =
  | "idle"
  | "loading"
  | "answering"
  | "submitted_correct"
  | "submitted_wrong"
  | "video_prompt"
  | "completing"
  | "complete";

export interface PerQuestionRecord {
  questionId: string;
  /** The raw answer a student gave — letter A/B/C/D for MC, numeric string for numeric_entry. */
  studentAnswer: string | null;
  isCorrect: boolean | null;
  difficulty: QuizDifficulty; // legacy
  difficultyLevel: QuizDifficultyLevel;
  responseTimeSeconds: number;
  flagged: boolean;
  flagNote?: string | null;
}

export interface QuizState {
  phase: QuizPhase;
  nodeId: string | null;
  subject: Subject | null;
  attemptId: string | null;

  allQuestions: StudentQuizQuestion[];
  selectedQuestions: StudentQuizQuestion[];
  reviews: Record<string, StudentQuizReview>;
  usedQuestionIds: Set<string>;

  currentIndex: number;
  currentLevel: QuizDifficultyLevel;
  selectedAnswer: string | null; // letter or numeric string
  questionStartedAt: number;

  records: PerQuestionRecord[];
  adaptivePath: AdaptiveStep[];
  consecutiveWrong: number;

  isDesmosOpen: boolean;
  isScratchpadOpen: boolean;

  score: number | null;
  correctCount: number;
  targetLength: number;
  confidenceBand: ConfidenceBand | null;
  newStatus: string | null;
}

const initialState: QuizState = {
  phase: "idle",
  nodeId: null,
  subject: null,
  attemptId: null,
  allQuestions: [],
  selectedQuestions: [],
  reviews: {},
  usedQuestionIds: new Set<string>(),
  currentIndex: 0,
  currentLevel: 1,
  selectedAnswer: null,
  questionStartedAt: 0,
  records: [],
  adaptivePath: [],
  consecutiveWrong: 0,
  isDesmosOpen: false,
  isScratchpadOpen: false,
  score: null,
  correctCount: 0,
  targetLength: QUIZ_LENGTH,
  confidenceBand: null,
  newStatus: null,
};

type Action =
  | { type: "RESET" }
  | { type: "START_LOADING"; nodeId: string; subject: Subject }
  | {
      type: "QUIZ_LOADED";
      attemptId: string;
      allQuestions: StudentQuizQuestion[];
      responses: QuestionResponse[];
      reviews: Record<string, StudentQuizReview>;
    }
  | { type: "SELECT_ANSWER"; answer: string }
  | {
      type: "SUBMIT_ANSWER";
      review: StudentQuizReview;
      responseTimeSeconds: number;
    }
  | {
      type: "ADVANCE_TO_NEXT";
      next: StudentQuizQuestion | null;
      nextLevel: QuizDifficultyLevel;
    }
  | { type: "SHOW_VIDEO_PROMPT" }
  | { type: "DISMISS_VIDEO_PROMPT" }
  | { type: "FLAG_CURRENT"; note?: string }
  | { type: "TOGGLE_DESMOS" }
  | { type: "TOGGLE_SCRATCHPAD" }
  | {
      type: "COMPLETE";
      score: number;
      confidenceBand: ConfidenceBand;
      newStatus: string;
    };

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case "RESET":
      return { ...initialState, usedQuestionIds: new Set() };

    case "START_LOADING":
      return {
        ...initialState,
        usedQuestionIds: new Set(),
        phase: "loading",
        nodeId: action.nodeId,
        subject: action.subject,
      };

    case "QUIZ_LOADED": {
      const plan = prepareQuizSession(action.allQuestions, action.responses);
      const selectedQuestions = plan.next
        ? [...plan.answeredQuestions, plan.next]
        : plan.answeredQuestions;
      const last = plan.responses.at(-1);
      const records: PerQuestionRecord[] = plan.responses.map((response, index) => ({
        questionId: response.question_id,
        studentAnswer: response.student_answer,
        isCorrect: response.is_correct,
        difficulty: plan.answeredQuestions[index].difficulty,
        difficultyLevel: plan.answeredQuestions[index].difficulty_level,
        responseTimeSeconds: response.response_time_seconds,
        flagged: response.flagged,
        flagNote: response.flag_note,
      }));
      const used = new Set(plan.used);
      if (plan.next) used.add(plan.next.id);
      return {
        ...state,
        phase: plan.next ? "answering" : last?.is_correct ? "submitted_correct" : "submitted_wrong",
        attemptId: action.attemptId,
        allQuestions: plan.questions,
        selectedQuestions,
        reviews: action.reviews,
        usedQuestionIds: used,
        currentIndex: plan.next ? plan.responses.length : Math.max(0, plan.responses.length - 1),
        currentLevel: plan.next
          ? plan.next.difficulty_level
          : (plan.answeredQuestions.at(-1)?.difficulty_level ?? 1),
        selectedAnswer: plan.next ? null : (last?.student_answer ?? null),
        questionStartedAt: Date.now(),
        records,
        adaptivePath: plan.responses.map((response, index) => ({
          question_id: response.question_id,
          difficulty: plan.answeredQuestions[index].difficulty,
          was_correct: response.is_correct,
        })),
        correctCount: plan.responses.filter((response) => response.is_correct).length,
        targetLength: plan.targetLength,
      };
    }

    case "SELECT_ANSWER":
      if (state.phase !== "answering") return state;
      return { ...state, selectedAnswer: action.answer };

    case "SUBMIT_ANSWER": {
      if (state.phase !== "answering" || !state.selectedAnswer) return state;
      const q = state.selectedQuestions[state.currentIndex];
      const level = (q.difficulty_level ?? 1) as QuizDifficultyLevel;
      const record: PerQuestionRecord = {
        questionId: q.id,
        studentAnswer: action.review.studentAnswer,
        isCorrect: action.review.isCorrect,
        difficulty: q.difficulty,
        difficultyLevel: level,
        responseTimeSeconds: action.responseTimeSeconds,
        flagged: state.records[state.currentIndex]?.flagged ?? false,
        flagNote: state.records[state.currentIndex]?.flagNote,
      };

      const records = [...state.records];
      records[state.currentIndex] = record;

      const adaptivePath: AdaptiveStep[] = [
        ...state.adaptivePath,
        {
          question_id: q.id,
          difficulty: q.difficulty,
          was_correct: action.review.isCorrect,
        },
      ];

      const consecutiveWrong = action.review.isCorrect ? 0 : state.consecutiveWrong + 1;

      return {
        ...state,
        phase: action.review.isCorrect ? "submitted_correct" : "submitted_wrong",
        records,
        reviews: { ...state.reviews, [q.id]: action.review },
        selectedAnswer: action.review.studentAnswer,
        adaptivePath,
        consecutiveWrong,
        correctCount: state.correctCount + (action.review.isCorrect ? 1 : 0),
      };
    }

    case "ADVANCE_TO_NEXT": {
      const nextIndex = state.currentIndex + 1;
      if (!action.next) {
        return state;
      }
      const used = new Set(state.usedQuestionIds);
      used.add(action.next.id);
      return {
        ...state,
        phase: "answering",
        currentIndex: nextIndex,
        currentLevel: action.nextLevel,
        selectedAnswer: null,
        questionStartedAt: Date.now(),
        selectedQuestions: [...state.selectedQuestions, action.next],
        usedQuestionIds: used,
      };
    }

    case "SHOW_VIDEO_PROMPT":
      return { ...state, phase: "video_prompt" };

    case "DISMISS_VIDEO_PROMPT":
      return {
        ...state,
        phase: state.selectedAnswer ? "submitted_wrong" : "answering",
        consecutiveWrong: 0,
      };

    case "FLAG_CURRENT": {
      const records = [...state.records];
      const existing = records[state.currentIndex] ?? {
        questionId: state.selectedQuestions[state.currentIndex].id,
        studentAnswer: null,
        isCorrect: null,
        difficulty: levelToLegacyDifficulty(state.currentLevel),
        difficultyLevel: state.currentLevel,
        responseTimeSeconds: 0,
        flagged: false,
      };
      records[state.currentIndex] = { ...existing, flagged: true, flagNote: action.note ?? null };
      return { ...state, records };
    }

    case "TOGGLE_DESMOS":
      if (
        state.subject !== "math" ||
        state.selectedQuestions[state.currentIndex]?.subject !== "math"
      )
        return { ...state, isDesmosOpen: false };
      return { ...state, isDesmosOpen: !state.isDesmosOpen, isScratchpadOpen: false };

    case "TOGGLE_SCRATCHPAD":
      return { ...state, isScratchpadOpen: !state.isScratchpadOpen, isDesmosOpen: false };

    case "COMPLETE":
      return {
        ...state,
        phase: "complete",
        score: action.score,
        confidenceBand: action.confidenceBand,
        newStatus: action.newStatus,
      };

    default:
      return state;
  }
}

// ── Context shape ────────────────────────────────────────────

interface QuizContextValue {
  state: QuizState;
  startQuiz: (nodeId: string, subject: Subject) => Promise<void>;
  selectAnswer: (answer: string) => void;
  submitAnswer: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  dismissVideoPrompt: () => void;
  flagCurrent: (note?: string) => Promise<void>;
  toggleDesmos: () => void;
  toggleScratchpad: () => void;
  reset: () => void;
  retakeQuiz: () => Promise<void>;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used inside <QuizProvider>");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const completionInFlightRef = useRef(false);
  const submissionInFlightRef = useRef(false);

  const startQuiz = useCallback(async (nodeId: string, subject: Subject) => {
    dispatch({ type: "START_LOADING", nodeId, subject });
    completionInFlightRef.current = false;

    let loaded: Awaited<ReturnType<typeof actionStartQuiz>>;
    try {
      loaded = await actionStartQuiz(nodeId);
    } catch (error) {
      dispatch({ type: "RESET" });
      throw error;
    }
    dispatch({
      type: "QUIZ_LOADED",
      attemptId: loaded.attemptId,
      allQuestions: loaded.questions,
      responses: loaded.responses,
      reviews: loaded.reviews,
    });
  }, []);

  const selectAnswer = useCallback((answer: string) => {
    dispatch({ type: "SELECT_ANSWER", answer });
  }, []);

  const submitAnswer = useCallback(async () => {
    if (
      state.phase !== "answering" ||
      !state.selectedAnswer ||
      !state.attemptId ||
      submissionInFlightRef.current
    )
      return;
    submissionInFlightRef.current = true;

    const q = state.selectedQuestions[state.currentIndex];
    const responseTimeSeconds = Math.round((Date.now() - state.questionStartedAt) / 1000);

    try {
      const review = await actionRecordResponse({
        attempt_id: state.attemptId,
        question_id: q.id,
        student_answer: state.selectedAnswer,
        response_time_seconds: responseTimeSeconds,
      });
      dispatch({ type: "SUBMIT_ANSWER", review, responseTimeSeconds });
      if (review.isCorrect) playSound("nodeComplete");
      else playSound("error");
      if (!review.isCorrect && state.consecutiveWrong + 1 >= 3) {
        setTimeout(() => dispatch({ type: "SHOW_VIDEO_PROMPT" }), 600);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: "quiz.record_response" },
        extra: { attemptId: state.attemptId, questionId: q.id },
      });
      throw err;
    } finally {
      submissionInFlightRef.current = false;
    }
  }, [state]);

  const nextQuestion = useCallback(async () => {
    if (state.phase !== "submitted_correct" && state.phase !== "submitted_wrong") return;

    const lastRecord = state.records[state.currentIndex];
    const wasCorrect = !!lastRecord?.isCorrect;

    // Reached end of quiz?
    const nextLevel = stepDifficultyLevel(state.currentLevel, wasCorrect);
    const next = selectNextQuestion(state.allQuestions, nextLevel, state.usedQuestionIds);
    if (state.currentIndex + 1 >= state.targetLength || !next) {
      if (completionInFlightRef.current) return;
      completionInFlightRef.current = true;

      try {
        const { score, newStatus, confidenceBand } = await actionCompleteQuiz({
          attemptId: state.attemptId!,
          nodeId: state.nodeId!,
          subject: state.subject!,
        });
        dispatch({ type: "COMPLETE", score, confidenceBand, newStatus });
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: "quiz.complete" } });
        completionInFlightRef.current = false;
      }
      return;
    }

    // Pick the next question adaptively
    dispatch({ type: "ADVANCE_TO_NEXT", next, nextLevel });
  }, [state]);

  const dismissVideoPrompt = useCallback(() => {
    dispatch({ type: "DISMISS_VIDEO_PROMPT" });
  }, []);

  const flagCurrent = useCallback(
    async (note?: string) => {
      if (!state.selectedQuestions[state.currentIndex] || !state.nodeId) return;
      const q = state.selectedQuestions[state.currentIndex];
      dispatch({ type: "FLAG_CURRENT", note });
      try {
        await actionFlagQuestion({
          question_id: q.id,
          node_id: state.nodeId,
          flag_note: note ?? null,
        });
      } catch (err) {
        console.error(err);
      }
    },
    [state]
  );

  const toggleDesmos = useCallback(() => dispatch({ type: "TOGGLE_DESMOS" }), []);
  const toggleScratchpad = useCallback(() => dispatch({ type: "TOGGLE_SCRATCHPAD" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const retakeQuiz = useCallback(async () => {
    if (!state.nodeId || !state.subject) return;
    const nodeId = state.nodeId;
    const subject = state.subject;
    dispatch({ type: "RESET" });
    await startQuiz(nodeId, subject);
  }, [state, startQuiz]);

  // Inactivity auto-close — parent (QuizEngine) observes `phase === "complete"`
  useEffect(() => {
    if (state.phase !== "complete") return;
    // Parent will watch this phase and close after 2 min; the provider
    // just ensures the completion side-effect (db write) already fired.
  }, [state.phase]);

  const value = useMemo<QuizContextValue>(
    () => ({
      state,
      startQuiz,
      selectAnswer,
      submitAnswer,
      nextQuestion,
      dismissVideoPrompt,
      flagCurrent,
      toggleDesmos,
      toggleScratchpad,
      reset,
      retakeQuiz,
    }),
    [
      state,
      startQuiz,
      selectAnswer,
      submitAnswer,
      nextQuestion,
      dismissVideoPrompt,
      flagCurrent,
      toggleDesmos,
      toggleScratchpad,
      reset,
      retakeQuiz,
    ]
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}
