"use client";

// ============================================================
// Diagnostic state machine — all the useState/useEffect/handler
// plumbing for the 35-question timed flow. Carved out of the
// old monolithic DiagnosticClient.tsx (audit M1).
//
// The component imports the returned shape; rendering stays
// in DiagnosticClient.tsx. Keeps related state + the handlers
// that mutate it in one place rather than scattered across
// the render body.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOMAIN_SECTION, type SATDomain } from "@/types";
import type { ScoredDiagnostic } from "@/lib/diagnostic-scoring";
import type { PassageHighlight } from "../HighlightablePassage";
import { MAX_HINTS } from "../HintButton";

// Per-section time budgets — proportional to the real Digital SAT.
// (SAT Math: 22q in 35 min ≈ 95 s/q; R&W: 27q in 32 min ≈ 71 s/q.
//  Our diagnostic: 20 math + 15 R&W → 32 min math + 18 min R&W.)
export const SECTION_SECONDS: Record<"math" | "rw", number> = {
  math: 32 * 60,
  rw: 18 * 60,
};

export interface DiagnosticQuestion {
  id: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3;
  conceptId: string;
  passageIntro?: string;
  passage?: string;
  text: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface DiagnosticStateArgs {
  questions: DiagnosticQuestion[];
  isSubscribed: boolean;
}

export function useDiagnosticState({ questions, isSubscribed }: DiagnosticStateArgs) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoring, setScoring] = useState<ScoredDiagnostic | null>(null);
  const [desmosOpen, setDesmosOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const router = useRouter();
  // Constrain Desmos / Scratchpad drag to the diagnostic shell.
  const shellRef = useRef<HTMLDivElement>(null);

  // Per-question UI state — keyed by question id so it survives
  // navigation and resets cleanly between questions.
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});
  const [highlightedChoices, setHighlightedChoices] = useState<Record<string, Set<string>>>({});
  const [highlights, setHighlights] = useState<Record<string, PassageHighlight[]>>({});
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Hint state — global counter (max 3) plus the set of question
  // ids that have already had a hint revealed (max 1 per question).
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedQuestionIds, setHintedQuestionIds] = useState<Set<string>>(new Set());

  // Section timer — one timer per SAT section that resets when the
  // student moves into a new section. Keyed object so we can keep
  // separate countdowns running per section.
  const [sectionTime, setSectionTime] = useState<Record<"math" | "rw", number>>({
    math: SECTION_SECONDS.math,
    rw: SECTION_SECONDS.rw,
  });

  const question = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const isAnswered = selected !== null;
  const currentSection = DOMAIN_SECTION[question.domain];
  const isMathQuestion = currentSection === "math";
  const questionCrossed = crossedOut[question.id] ?? new Set<string>();
  const questionHighlightedChoices = highlightedChoices[question.id] ?? new Set<string>();
  const questionHighlights = highlights[question.id] ?? [];
  const hintShownThisQuestion = hintedQuestionIds.has(question.id);
  const isBookmarked = bookmarked.has(question.id);
  const sectionTimeLeft = sectionTime[currentSection];

  // Per-section numbering — when the test transitions from R&W
  // (now first) into Math, the visible "Question X / N" resets
  // so the student tracks their position within the section
  // rather than across the whole diagnostic.
  const sectionStartIdx = questions.findIndex((q) => DOMAIN_SECTION[q.domain] === currentSection);
  const sectionLength = questions.filter((q) => DOMAIN_SECTION[q.domain] === currentSection).length;
  const sectionPosition = currentIdx - sectionStartIdx + 1;

  // Browser-level guard — warn the student if they try to close
  // the tab or hit refresh while the diagnostic is in progress.
  // Disabled once results are in (nothing more to lose).
  useEffect(() => {
    if (scoring) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [scoring]);

  function exitDiagnostic() {
    const exitTarget = isSubscribed ? "/dashboard/student" : "/";
    router.replace(exitTarget);
  }

  // ─── Section timer ────────────────────────────────────────
  useEffect(() => {
    if (scoring) return;
    if (sectionTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setSectionTime((prev) => {
        const cur = prev[currentSection];
        if (cur <= 1) {
          clearInterval(interval);
          handleSectionExpired();
          return { ...prev, [currentSection]: 0 };
        }
        return { ...prev, [currentSection]: cur - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, scoring]);

  function handleSectionExpired() {
    const nextSectionStart = questions.findIndex(
      (q, i) => i > currentIdx && DOMAIN_SECTION[q.domain] !== currentSection
    );
    if (nextSectionStart === -1) {
      handleSubmit();
    } else {
      setCurrentIdx(nextSectionStart);
      setSelected(null);
      setShowExplanation(false);
    }
  }

  // ─── Per-question helpers ─────────────────────────────────
  function toggleCrossOut(letter: string) {
    setCrossedOut((prev) => {
      const next = new Set(prev[question.id] ?? []);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return { ...prev, [question.id]: next };
    });
  }

  function toggleHighlightChoice(letter: string) {
    setHighlightedChoices((prev) => {
      const next = new Set(prev[question.id] ?? []);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return { ...prev, [question.id]: next };
    });
  }

  function setHighlightsForQuestion(next: PassageHighlight[]) {
    setHighlights((prev) => ({ ...prev, [question.id]: next }));
  }

  function toggleBookmark() {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  }

  function useHint() {
    if (hintShownThisQuestion || hintsUsed >= MAX_HINTS) return;
    setHintsUsed((n) => n + 1);
    setHintedQuestionIds((s) => new Set([...s, question.id]));
  }

  function handleSelect(option: string) {
    if (isAnswered) return;
    const letter = option.charAt(0);
    setSelected(letter);
    setAnswers((prev) => ({ ...prev, [question.id]: letter }));
    setShowExplanation(true);
  }

  // useCallback so the keydown effect below doesn't re-bind on
  // every render — only when `questions` or `answers` change.
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] || "",
      domain: q.domain,
      difficulty: q.difficulty,
      conceptId: q.conceptId,
      correct: answers[q.id] === q.correct,
    }));

    try {
      const res = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      const data = (await res.json()) as { scoring?: ScoredDiagnostic; error?: string };

      if (res.ok && data.scoring) {
        setScoring(data.scoring);
      } else {
        console.error("Submit error:", data.error);
      }
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [questions, answers]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  }, [isLast, handleSubmit]);

  // Keyboard shortcuts:
  //   Escape — close calculator / scratchpad (whichever is open).
  //   Enter  — advance to the next question once an answer is picked.
  useEffect(() => {
    if (scoring) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isEditable) return;

      if (e.key === "Escape") {
        if (desmosOpen || scratchpadOpen) {
          e.preventDefault();
          if (desmosOpen) setDesmosOpen(false);
          if (scratchpadOpen) setScratchpadOpen(false);
        }
        return;
      }

      if (e.key === "Enter") {
        if (exitConfirmOpen || navigatorOpen || desmosOpen || scratchpadOpen) return;
        if (!isAnswered || isSubmitting) return;
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    scoring,
    desmosOpen,
    scratchpadOpen,
    exitConfirmOpen,
    navigatorOpen,
    isAnswered,
    isSubmitting,
    handleNext,
  ]);

  function jumpTo(idx: number) {
    // Cross-section jumps are blocked at the navigator level,
    // but defend in depth.
    if (DOMAIN_SECTION[questions[idx].domain] !== currentSection) return;
    setCurrentIdx(idx);
    setSelected(answers[questions[idx].id] ?? null);
    setShowExplanation(false);
  }

  return {
    // Refs
    shellRef,
    // State
    question,
    currentIdx,
    selected,
    answers,
    showExplanation,
    isSubmitting,
    scoring,
    desmosOpen,
    scratchpadOpen,
    navigatorOpen,
    exitConfirmOpen,
    bookmarked,
    hintedQuestionIds,
    hintsUsed,
    sectionTime,
    sectionTimeLeft,
    // Derived
    isLast,
    isAnswered,
    isMathQuestion,
    isBookmarked,
    currentSection,
    sectionStartIdx,
    sectionLength,
    sectionPosition,
    hintShownThisQuestion,
    questionCrossed,
    questionHighlightedChoices,
    questionHighlights,
    // Setters callers need
    setDesmosOpen,
    setScratchpadOpen,
    setNavigatorOpen,
    setExitConfirmOpen,
    // Handlers
    exitDiagnostic,
    toggleCrossOut,
    toggleHighlightChoice,
    setHighlightsForQuestion,
    toggleBookmark,
    useHint,
    handleSelect,
    handleSubmit,
    handleNext,
    jumpTo,
  };
}
