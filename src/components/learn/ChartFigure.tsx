"use client";

// ============================================================
// ChartFigure: draws quiz_questions.figure_chart_data with the figure
// engine. It converts the old chart data to a FigureSpec, builds the
// chart scene (function plots are line charts of graphed functions)
// and renders it with FigureView, in the Bluebook look with theme
// colors only.
//
// Like SpecFigure (FigureFrame), it is laid out at its container's measured
// width when the default box would show text under 12px (fitBox).
//
// Chart data the engine cannot draw (pie charts, malformed data) shows
// a plain notice instead of an empty space.
// ============================================================

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { buildChart } from "@/lib/figures/engine/charts";
import { chartDataToSpec, ChartDataError } from "@/lib/figures/engine/from-chart-data";
import type { Scene } from "@/lib/figures/engine/scene";
import type { ChartFigure as ChartFigureData } from "@/types/chart";
import { fitBox } from "@/lib/figures/engine/index";
import FigureView from "./figures/FigureView";
import { useMeasuredWidth } from "./figures/useMeasuredWidth";

interface Props {
  data: ChartFigureData;
  /** Kept for callers; figures take every color from the theme, whatever the subject. */
  subject?: string | null;
  /** Optional className for the wrapping <figure>. */
  className?: string;
  /** A description for screen readers. Defaults to one generated from the chart. */
  alt?: string;
}

/** 600×400 by default; 500×500 for figures whose source plot is square. */
const boxFor = (data: ChartFigureData) =>
  data.frame === "square" ? { width: 500, height: 500 } : { width: 600, height: 400 };

/** The chart drawn for a container `width` px wide; its default box before it is measured. */
function sceneFor(data: ChartFigureData, width: number | null): Scene | null {
  try {
    return buildChart(chartDataToSpec(data), fitBox(boxFor(data), width));
  } catch (error) {
    if (error instanceof ChartDataError) return null;
    throw error;
  }
}

export default function ChartFigure({ data, className, alt }: Props) {
  const [frame, width] = useMeasuredWidth<HTMLElement>();
  const scene = useMemo(() => sceneFor(data, width), [data, width]);
  // Block + full width: as an inline-block (or flex item) the width:100% SVG had no
  // definite width and collapsed to the 300px replaced-element default.
  return (
    <figure ref={frame} className={cn("themed-question-figure block w-full max-w-full", className)}>
      {scene ? (
        <FigureView
          scene={alt ? { ...scene, description: alt } : scene}
          className="block h-auto w-full rounded-lg border border-bronze bg-night"
        />
      ) : (
        <p className="rounded-lg border border-bronze p-4 text-sm">
          This chart can&apos;t be drawn yet.
        </p>
      )}
    </figure>
  );
}
