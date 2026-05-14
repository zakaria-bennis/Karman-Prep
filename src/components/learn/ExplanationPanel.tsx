"use client";

// ============================================================
// ExplanationPanel — slides up from the bottom after a wrong answer.
// Collapsed: one-line summary + "Show explanation".
// Expanded: full explanation, per-choice breakdown (Reading), and
// a "Next Question" button (student must actively proceed).
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices, AnswerLetter } from "@/types/quiz";
import TextbookContent from "./TextbookContent";

interface Props {
  question: QuizQuestionWithChoices;
  studentAnswer: string | null; // letter for MC, numeric string for numeric_entry
  onNext: () => void;
}

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

export default function ExplanationPanel({ question, studentAnswer, onNext }: Props) {
  const [expanded, setExpanded] = useState(true);
  const perChoice = question.explanation_per_choice ?? {};
  const summary = question.explanation_text.split("\n")[0];

  return (
    <motion.div
      initial={{ y: 400, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 400, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="bg-slate-900/98 fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-700 backdrop-blur-md"
      style={{ maxHeight: "70vh" }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/20">
            <span className="text-[11px] font-bold text-rose-400">{question.correct_answer}</span>
          </div>
          <span className="truncate text-sm font-semibold text-white">
            {expanded ? "Full explanation" : summary}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="mx-auto max-w-3xl overflow-y-auto px-6 pb-6"
              style={{ maxHeight: "55vh" }}
            >
              <div className="pt-2">
                <TextbookContent
                  markdown={question.explanation_text}
                  className="prose-invert prose-sm"
                />
              </div>

              {/* Per-choice breakdown for Reading */}
              {question.subject === "reading" && Object.keys(perChoice).length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Every choice explained
                  </h4>
                  {LETTERS.map((letter) => {
                    const isCorrect = question.correct_answer === letter;
                    const isStudent = studentAnswer === letter;
                    const text = perChoice[letter];
                    if (!text) return null;
                    return (
                      <div
                        key={letter}
                        className={cn(
                          "rounded-lg border p-3",
                          isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : isStudent
                              ? "border-rose-500/40 bg-rose-500/10"
                              : "border-slate-700 bg-slate-800/50"
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : isStudent
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-700 text-slate-300"
                            )}
                          >
                            {letter}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {isCorrect ? "Correct" : isStudent ? "Your answer" : "Other choice"}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-300">{text}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Desmos strategy for math */}
              {question.subject === "math" && question.desmos_strategy && (
                <div className="mt-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
                    Desmos shortcut
                  </h4>
                  <TextbookContent
                    markdown={question.desmos_strategy}
                    className="prose-invert prose-sm"
                  />
                </div>
              )}

              {/* Next button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Next Question <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
