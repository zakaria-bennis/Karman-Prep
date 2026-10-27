"use client";
import { useMemo } from "react";
import { drawnFigure } from "@/lib/figures/question-figure";
import type { StudentQuizQuestion } from "@/types/quiz";
import ChartFigure from "../ChartFigure";
import FigureFrame from "../FigureFrame";
import GeometryFigure from "../GeometryFigure";
import QuestionTable from "../QuestionTable";
import styles from "./pane.module.css";

/** Where the figure engine draws. Today it hosts the existing figure components; the figure
 * system plugs in here later through the same slot (spec: Figure contract). */
export function FigureSlot({ q, calculator }: { q: StudentQuizQuestion; calculator: boolean }) {
  const drawn = useMemo(() => drawnFigure(q), [q]);
  if (!drawn) return null;
  const figureId = `${q.id}:figure`;
  return (
    <div className={styles.figure} data-ink-figure={figureId}>
      {drawn === "table" ? (
        <QuestionTable data={q.figure_table_data!} calculator={calculator} />
      ) : drawn === "chart" ? (
        <ChartFigure
          data={q.figure_chart_data!}
          subject={q.subject ?? null}
          alt={q.image_alt ?? undefined}
          className="max-w-2xl"
        />
      ) : drawn === "geometric" ? (
        <GeometryFigure data={q.figure_geometry_data!} className="max-w-2xl" />
      ) : (
        <FigureFrame
          src={q.image_url}
          svg={q.figure_svg}
          alt={q.image_alt ?? ""}
          maxHeightClass="max-h-[28rem]"
        />
      )}
    </div>
  );
}
