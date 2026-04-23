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
  AnswerLetter,
  ConfidenceBand,
  QuizDifficulty,
  QuizQuestionWithChoices,
} from "@/types/quiz";
import {
  DIFFICULTY_ORDER,
  getConfidenceBand,
  stepDifficulty,
} from "@/types/quiz";
import {
  actionStartQuiz,
  actionRecordResponse,
  actionCompleteQuiz,
  actionFlagQuestion,
} from "@/app/learn/quiz-actions";
import type { Subject } from "@/data/curriculum";
import { playSound } from "@/lib/sounds";

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
  studentAnswer: AnswerLetter | null;
  isCorrect: boolean | null;
  difficulty: QuizDifficulty;
  responseTimeSeconds: number;
  flagged: boolean;
  flagNote?: string | null;
}

export interface QuizState {
  phase: QuizPhase;
  nodeId: string | null;
  subject: Subject | null;
  attemptId: string | null;

  allQuestions: QuizQuestionWithChoices[];
  selectedQuestions: QuizQuestionWithChoices[];
  usedQuestionIds: Set<string>;

  currentIndex: number;
  currentDifficulty: QuizDifficulty;
  selectedAnswer: AnswerLetter | null;
  questionStartedAt: number;

  records: PerQuestionRecord[];
  adaptivePath: AdaptiveStep[];
  consecutiveWrong: number;

  isDesmosOpen: boolean;
  isScratchpadOpen: boolean;

  score: number | null;
  correctCount: number;
  confidenceBand: ConfidenceBand | null;
  newStatus: string | null;
}

const QUIZ_LENGTH = 10;

const initialState: QuizState = {
  phase: "idle",
  nodeId: null,
  subject: null,
  attemptId: null,
  allQuestions: [],
  selectedQuestions: [],
  usedQuestionIds: new Set<string>(),
  currentIndex: 0,
  currentDifficulty: "foundational",
  selectedAnswer: null,
  questionStartedAt: 0,
  records: [],
  adaptivePath: [],
  consecutiveWrong: 0,
  isDesmosOpen: false,
  isScratchpadOpen: false,
  score: null,
  correctCount: 0,
  confidenceBand: null,
  newStatus: null,
};

type Action =
  | { type: "RESET" }
  | { type: "START_LOADING"; nodeId: string; subject: Subject }
  | {
      type: "QUIZ_LOADED";
      attemptId: string;
      allQuestions: QuizQuestionWithChoices[];
      first: QuizQuestionWithChoices;
    }
  | { type: "SELECT_ANSWER"; answer: AnswerLetter }
  | {
      type: "SUBMIT_ANSWER";
      isCorrect: boolean;
      responseTimeSeconds: number;
    }
  | {
      type: "ADVANCE_TO_NEXT";
      next: QuizQuestionWithChoices | null;
      nextDifficulty: QuizDifficulty;
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
      const used = new Set<string>();
      used.add(action.first.id);
      return {
        ...state,
        phase: "answering",
        attemptId: action.attemptId,
        allQuestions: action.allQuestions,
        selectedQuestions: [action.first],
        usedQuestionIds: used,
        currentIndex: 0,
        currentDifficulty: action.first.difficulty,
        questionStartedAt: Date.now(),
        records: [],
        adaptivePath: [],
      };
    }

    case "SELECT_ANSWER":
      if (state.phase !== "answering") return state;
      return { ...state, selectedAnswer: action.answer };

    case "SUBMIT_ANSWER": {
      if (state.phase !== "answering" || !state.selectedAnswer) return state;
      const q = state.selectedQuestions[state.currentIndex];
      const record: PerQuestionRecord = {
        questionId: q.id,
        studentAnswer: state.selectedAnswer,
        isCorrect: action.isCorrect,
        difficulty: q.difficulty,
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
          was_correct: action.isCorrect,
        },
      ];

      const consecutiveWrong = action.isCorrect ? 0 : state.consecutiveWrong + 1;

      return {
        ...state,
        phase: action.isCorrect ? "submitted_correct" : "submitted_wrong",
        records,
        adaptivePath,
        consecutiveWrong,
        correctCount: state.correctCount + (action.isCorrect ? 1 : 0),
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
        currentDifficulty: action.nextDifficulty,
        selectedAnswer: null,
        questionStartedAt: Date.now(),
        selectedQuestions: [...state.selectedQuestions, action.next],
        usedQuestionIds: used,
      };
    }

    case "SHOW_VIDEO_PROMPT":
      return { ...state, phase: "video_prompt" };

    case "DISMISS_VIDEO_PROMPT":
      return { ...state, phase: state.selectedAnswer ? "submitted_wrong" : "answering", consecutiveWrong: 0 };

    case "FLAG_CURRENT": {
      const records = [...state.records];
      const existing = records[state.currentIndex] ?? {
        questionId: state.selectedQuestions[state.currentIndex].id,
        studentAnswer: null,
        isCorrect: null,
        difficulty: state.currentDifficulty,
        responseTimeSeconds: 0,
        flagged: false,
      };
      records[state.currentIndex] = { ...existing, flagged: true, flagNote: action.note ?? null };
      return { ...state, records };
    }

    case "TOGGLE_DESMOS":
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

// ── Adaptive selection helper ───────────────────────────────

export function selectNextQuestion(
  all: QuizQuestionWithChoices[],
  target: QuizDifficulty,
  used: Set<string>
): QuizQuestionWithChoices | null {
  const ordered = DIFFICULTY_ORDER;
  const targetIdx = ordered.indexOf(target);

  // Search outward from target difficulty
  for (let offset = 0; offset < ordered.length; offset++) {
    for (const sign of offset === 0 ? [0] : [-1, 1]) {
      const idx = targetIdx + offset * sign;
      if (idx < 0 || idx >= ordered.length) continue;
      const d = ordered[idx];
      const pool = all.filter((q) => q.difficulty === d && !used.has(q.id));
      if (pool.length > 0) {
        // Pick the one with lowest display_order (stable).
        return pool.sort((a, b) => a.display_order - b.display_order)[0];
      }
    }
  }
  return null;
}

// ── Context shape ────────────────────────────────────────────

interface QuizContextValue {
  state: QuizState;
  startQuiz: (nodeId: string, subject: Subject) => Promise<void>;
  selectAnswer: (answer: AnswerLetter) => void;
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

  const startQuiz = useCallback(async (nodeId: string, subject: Subject) => {
    dispatch({ type: "START_LOADING", nodeId, subject });
    completionInFlightRef.current = false;

    const { attemptId, questions } = await actionStartQuiz(nodeId);

    // Pick a foundational question to start with (or the easiest available).
    const first = selectNextQuestion(questions, "foundational", new Set());
    if (!first) {
      // No questions exist — fail gracefully.
      dispatch({ type: "RESET" });
      throw new Error("This node has no questions yet.");
    }

    dispatch({
      type: "QUIZ_LOADED",
      attemptId,
      allQuestions: questions,
      first,
    });
  }, []);

  const selectAnswer = useCallback((answer: AnswerLetter) => {
    dispatch({ type: "SELECT_ANSWER", answer });
  }, []);

  const submitAnswer = useCallback(async () => {
    if (state.phase !== "answering" || !state.selectedAnswer || !state.attemptId) return;

    const q = state.selectedQuestions[state.currentIndex];
    const isCorrect = state.selectedAnswer === q.correct_answer;
    const responseTimeSeconds = Math.round((Date.now() - state.questionStartedAt) / 1000);

    dispatch({ type: "SUBMIT_ANSWER", isCorrect, responseTimeSeconds });

    if (isCorrect) playSound("nodeComplete");
    else playSound("error");

    // Fire-and-forget server write
    actionRecordResponse({
      attempt_id: state.attemptId,
      question_id: q.id,
      student_answer: state.selectedAnswer,
      is_correct: isCorrect,
      difficulty_at_time: q.difficulty,
      response_time_seconds: responseTimeSeconds,
    }).catch(console.error);

    // 3-consecutive-wrongs video prompt
    if (!isCorrect && state.consecutiveWrong + 1 >= 3) {
      setTimeout(() => dispatch({ type: "SHOW_VIDEO_PROMPT" }), 600);
    }
  }, [state]);

  const nextQuestion = useCallback(async () => {
    if (state.phase !== "submitted_correct" && state.phase !== "submitted_wrong") return;

    const lastRecord = state.records[state.currentIndex];
    const wasCorrect = !!lastRecord?.isCorrect;

    // Reached end of quiz?
    if (state.currentIndex + 1 >= QUIZ_LENGTH) {
      if (completionInFlightRef.current) return;
      completionInFlightRef.current = true;

      const answered = state.currentIndex + 1;
      const correct = state.correctCount;
      const score = Math.round((correct / QUIZ_LENGTH) * 100);
      try {
        const { newStatus, confidenceBand } = await actionCompleteQuiz({
          attemptId: state.attemptId!,
          nodeId: state.nodeId!,
          subject: state.subject!,
          score,
          questions_answered: answered,
          questions_correct: correct,
          adaptive_path: state.adaptivePath,
        });
        dispatch({ type: "COMPLETE", score, confidenceBand, newStatus });
      } catch (err) {
        console.error(err);
        const band = getConfidenceBand(score);
        dispatch({ type: "COMPLETE", score, confidenceBand: band, newStatus: "in_progress" });
      }
      return;
    }

    // Pick the next question adaptively
    const nextDifficulty = stepDifficulty(state.currentDifficulty, wasCorrect);
    const next = selectNextQuestion(state.allQuestions, nextDifficulty, state.usedQuestionIds);
    dispatch({ type: "ADVANCE_TO_NEXT", next, nextDifficulty });
  }, [state]);

  const dismissVideoPrompt = useCallback(() => {
    dispatch({ type: "DISMISS_VIDEO_PROMPT" });
  }, []);

  const flagCurrent = useCallback(async (note?: string) => {
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
  }, [state]);

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
    [state, startQuiz, selectAnswer, submitAnswer, nextQuestion, dismissVideoPrompt, flagCurrent, toggleDesmos, toggleScratchpad, reset, retakeQuiz]
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export const QUIZ_TOTAL_QUESTIONS = QUIZ_LENGTH;
