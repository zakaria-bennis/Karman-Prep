"use client";

import { useEffect, useState } from "react";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import type { StudentQuizQuestion } from "@/types/quiz";

/** What the render script hands the page: a question figure, figure choices, or both. */
export type FigureRenderPayload = {
  id: string;
  subject?: "math" | "reading_writing";
  figure_spec?: unknown;
  /** Each choice's choice_figure_spec, in letter order (A, B, C, D). */
  choices?: unknown[];
};

declare global {
  interface Window {
    __FIGURE_RENDER__?: FigureRenderPayload;
  }
}

const LETTERS = ["A", "B", "C", "D"] as const;

function readPayload(): FigureRenderPayload | null {
  if (window.__FIGURE_RENDER__) return window.__FIGURE_RENDER__;
  const raw = new URLSearchParams(window.location.search).get("spec");
  if (!raw) return null;
  try {
    const text = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    return {
      id: "query",
      figure_spec: JSON.parse(
        new TextDecoder().decode(Uint8Array.from(text, (c) => c.charCodeAt(0)))
      ),
    };
  } catch {
    return null;
  }
}

/** A made-up question carrying the figure, laid out as the catalog lays out a real one. */
function question(p: FigureRenderPayload): StudentQuizQuestion {
  const choices = p.choices ?? [];
  return {
    id: `render-${p.id}`,
    subject: p.subject ?? "math",
    topic_cluster: "Figure render",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    question_text: "Which choice is correct?",
    passage_intro: null,
    passage: null,
    passage_a: null,
    passage_b: null,
    reviewed_passage: null,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    figure_svg: null,
    figure_spec: p.figure_spec ?? null,
    image_url: null,
    image_alt: null,
    answer_choices: LETTERS.map((letter, i) => ({
      id: `render-${p.id}-${letter}`,
      question_id: `render-${p.id}`,
      letter,
      choice_text: choices.length ? "" : String(i + 1),
      choice_table_data: null,
      choice_figure_spec: choices[i] ?? null,
    })),
  } as unknown as StudentQuizQuestion;
}

export default function FigureRender() {
  const [payload, setPayload] = useState<FigureRenderPayload | null | undefined>(undefined);
  // The payload is read after mount: window exists only in the browser.
  useEffect(() => setPayload(readPayload()), []);
  if (payload === undefined) return null;
  return (
    <main
      data-figure-render={payload ? payload.id : "none"}
      className="mx-auto min-h-dvh w-full max-w-6xl bg-night px-4 pb-24 pt-36 text-ivory sm:px-8"
    >
      {payload ? (
        <CatalogQuestion
          question={question(payload)}
          answer=""
          disabled={false}
          onAnswer={() => {}}
        />
      ) : (
        <p>No figure: set window.__FIGURE_RENDER__ or pass ?spec=.</p>
      )}
    </main>
  );
}
