"use client";
// A past question's answer choices as the quiz draws them (quiz-shell/Choices.tsx): a table choice
// (choice_table_data, or a choice_figure_spec that is a table) is a table, and a set of drawn
// choices (graphs) is the figure engine's grid. The question's own figure is quiz-shell/FigureSlot.
// Both sit on the portal's glass with the portal's ink (figures/figure-glass.css).
import { useMemo } from "react";
import { useSpecParser } from "@/components/learn/figures/engine-loader";
import { hasFigureChoices, withSpecTables } from "@/lib/figures/engine/choice-routing";
import type { QuestionFigure } from "@/lib/figures/question-figure";

/** The choices in letter order with table specs turned into tables, and whether any is drawn. */
export function useDrawnChoices(figure: QuestionFigure | undefined) {
  const parse = useSpecParser(figure ?? {});
  return useMemo(() => {
    const choices = withSpecTables(figure?.answer_choices ?? [], parse);
    return { choices, grid: hasFigureChoices(choices, parse) };
  }, [figure, parse]);
}
