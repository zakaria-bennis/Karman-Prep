"use client";

import { useState } from "react";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import { FIGURE_CHOICE_QUESTIONS } from "./fixtures";

export default function FigureChoicesFixtures() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl space-y-12 bg-night px-4 pb-24 pt-24 text-ivory sm:px-8">
      {FIGURE_CHOICE_QUESTIONS.map((q) => (
        <section key={q.id} aria-label={q.question_text}>
          <CatalogQuestion
            question={q}
            answer={answers[q.id] ?? ""}
            disabled={false}
            onAnswer={(answer) => setAnswers((old) => ({ ...old, [q.id]: answer }))}
          />
        </section>
      ))}
    </main>
  );
}
