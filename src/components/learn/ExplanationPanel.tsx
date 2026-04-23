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
  studentAnswer: AnswerLetter | null;
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
      className="fixed bottom-0 left-0 right-0 z-[60] bg-slate-900/98 border-t border-slate-700 backdrop-blur-md"
      style={{ maxHeight: "70vh" }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-rose-400">{question.correct_answer}</span>
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {expanded ? "Full explanation" : summary}
          </span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
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
            <div className="px-6 pb-6 max-w-3xl mx-auto overflow-y-auto" style={{ maxHeight: "55vh" }}>
              <div className="pt-2">
                <TextbookContent
                  markdown={question.explanation_text}
                  className="prose-invert prose-sm"
                />
              </div>

              {/* Per-choice breakdown for Reading */}
              {question.subject === "reading" && Object.keys(perChoice).length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Every choice explained</h4>
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
                          isCorrect ? "border-emerald-500/40 bg-emerald-500/10" :
                          isStudent ? "border-rose-500/40 bg-rose-500/10" :
                          "border-slate-700 bg-slate-800/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            isCorrect ? "bg-emerald-500 text-white" :
                            isStudent ? "bg-rose-500 text-white" :
                            "bg-slate-700 text-slate-300"
                          )}>
                            {letter}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {isCorrect ? "Correct" : isStudent ? "Your answer" : "Other choice"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Desmos strategy for math */}
              {question.subject === "math" && question.desmos_strategy && (
                <div className="mt-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Desmos shortcut</h4>
                  <TextbookContent markdown={question.desmos_strategy} className="prose-invert prose-sm" />
                </div>
              )}

              {/* Next button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onNext}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  Next Question <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
