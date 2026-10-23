"use client";

import { useEffect, useState } from "react";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import { AnnotationProvider } from "@/components/learn/quiz/PassageAnnotations";
import { CalculatorScope } from "@/components/calculator/CalculatorScope";
import type { StudentQuizQuestion } from "@/types/quiz";

const ignore = () => undefined;

declare global {
  interface Window {
    /** The QA audit swaps in the next question without reloading the page. */
    __qaLoad?: (id: string) => Promise<boolean>;
  }
}

/** The question exactly as a student meets it in skill practice (CatalogPractice's shell and
 *  question card, calculator closed, nothing chosen), without the page header. Each question
 *  mounts fresh (keyed by id); #qa-render carries data-qa-id once it has rendered. */
export default function QaQuestion({ question: first }: { question: StudentQuizQuestion }) {
  const [question, setQuestion] = useState(first);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    window.__qaLoad = async (id: string) => {
      const res = await fetch(`/dev/qa-render/api?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return false;
      setShown(null);
      setOpen(false);
      setQuestion((await res.json()) as StudentQuizQuestion);
      return true;
    };
    return () => {
      delete window.__qaLoad;
    };
  }, []);
  useEffect(() => setShown(question.id), [question]);
  return (
    <AnnotationProvider key={question.id}>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-ivory sm:px-8">
        <CalculatorScope
          questionKey={question.id}
          enabled={question.subject === "math"}
          open={open}
          onOpenChange={setOpen}
        >
          <section
            id="qa-render"
            data-qa-id={shown ?? undefined}
            className="space-y-6 rounded-2xl border border-bronze bg-surface p-5 sm:p-8"
          >
            <p className="text-sm text-taupe">Skill practice</p>
            <div data-question-content>
              <CatalogQuestion question={question} answer="" disabled={false} onAnswer={ignore} />
            </div>
          </section>
        </CalculatorScope>
      </div>
    </AnnotationProvider>
  );
}
