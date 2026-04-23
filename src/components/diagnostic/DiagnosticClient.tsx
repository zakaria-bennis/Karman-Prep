"use client";

// ============================================================
// Diagnostic Assessment — full 20-question timed client
// Handles timer, answer selection, submission, and results.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";
import DiagnosticResults from "./DiagnosticResults";

interface DiagnosticQuestion {
  id: string;
  domain: string;
  difficulty: number;
  conceptId: string;
  text: string;
  options: string[];
  correct: string;
  explanation: string;
}

interface Props {
  questions: DiagnosticQuestion[];
}

const SECONDS_PER_QUESTION = 90;

export default function DiagnosticClient({ questions }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<{
    scoreRangeLow: number;
    scoreRangeHigh: number;
    domainScores: DomainScores;
    weakConceptIds: string[];
  } | null>(null);

  const question = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const isAnswered = selected !== null;

  /** Auto-advance when timer hits 0 */
  const advanceQuestion = useCallback(() => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
      setTimeLeft(SECONDS_PER_QUESTION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast, currentIdx]);

  useEffect(() => {
    if (results) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          advanceQuestion();
          return SECONDS_PER_QUESTION;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx, results, advanceQuestion]);

  function handleSelect(option: string) {
    if (isAnswered) return;
    const letter = option.charAt(0);
    setSelected(letter);
    setAnswers((prev) => ({ ...prev, [question.id]: letter }));
    setShowExplanation(true);
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    // Build answer payload
    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] || "",
      domain: q.domain as SATDomain,
      correct: answers[q.id] === q.correct,
      conceptId: q.conceptId,
    }));

    try {
      const res = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults(data);
      } else {
        console.error("Submit error:", data.error);
      }
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
      setTimeLeft(SECONDS_PER_QUESTION);
    }
  }

  if (results) {
    return <DiagnosticResults results={results} totalQuestions={questions.length} answers={answers} questions={questions} />;
  }

  const timerPct = (timeLeft / SECONDS_PER_QUESTION) * 100;
  const timerColor = timeLeft > 30 ? "#3B82F6" : timeLeft > 10 ? "#F59E0B" : "#EF4444";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Question {currentIdx + 1} / {questions.length}
            </span>
            <span className="ml-2 text-xs text-slate-500">SAT Diagnostic</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <svg width="32" height="32" className="-rotate-90">
              <circle cx="16" cy="16" r="12" strokeWidth="3" fill="none" className="stroke-slate-200 dark:stroke-slate-700" />
              <circle
                cx="16" cy="16" r="12" strokeWidth="3" fill="none"
                stroke={timerColor}
                strokeLinecap="round"
                strokeDasharray={75.4}
                strokeDashoffset={75.4 - (timerPct / 100) * 75.4}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="text-sm font-mono font-bold" style={{ color: timerColor }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl">
          {/* Domain tag */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                backgroundColor: DOMAIN_COLORS[question.domain as SATDomain]?.hex + "20",
                color: DOMAIN_COLORS[question.domain as SATDomain]?.hex,
              }}
            >
              {DOMAIN_LABELS[question.domain as SATDomain] || question.domain}
            </span>
            <span className="text-xs text-slate-400">
              {"★".repeat(question.difficulty)}{"☆".repeat(3 - question.difficulty)}
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 leading-relaxed">
            {question.text}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option) => {
              const letter = option.charAt(0);
              const isSelected = selected === letter;
              const isCorrect = letter === question.correct;

              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full text-left px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all",
                    !isAnswered && "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                    isAnswered && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
                    isAnswered && isSelected && !isCorrect && "border-red-400 bg-red-50 dark:bg-red-900/20",
                    isAnswered && !isSelected && !isCorrect && "border-slate-200 dark:border-slate-700 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      !isAnswered && "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                      isAnswered && isCorrect && "bg-emerald-500 text-white",
                      isAnswered && isSelected && !isCorrect && "bg-red-400 text-white",
                    )}>
                      {isAnswered && isCorrect ? <CheckCircle className="w-4 h-4" /> :
                       isAnswered && isSelected ? <XCircle className="w-4 h-4" /> : letter}
                    </span>
                    <span className={cn(
                      isAnswered && isCorrect && "text-emerald-700 dark:text-emerald-300",
                      isAnswered && isSelected && !isCorrect && "text-red-600 dark:text-red-400",
                      isAnswered && !isSelected && !isCorrect && "text-slate-500",
                      !isAnswered && "text-slate-700 dark:text-slate-200"
                    )}>
                      {option.slice(3)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className={cn(
              "mt-4 p-4 rounded-xl text-sm border",
              selected === question.correct
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
            )}>
              {selected !== question.correct && (
                <span className="font-bold">Correct answer: {question.correct}. </span>
              )}
              {question.explanation}
            </div>
          )}

          {/* Next / Submit */}
          {isAnswered && (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="btn-primary w-full mt-5"
            >
              {isSubmitting ? "Saving results..." : isLast ? "See My Results" : "Next Question"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Skip button */}
          {!isAnswered && (
            <button
              onClick={handleNext}
              className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1.5 transition-colors py-2"
            >
              <Clock className="w-3.5 h-3.5" />
              Skip this question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
