"use client";

// ============================================================
// ChartFigure: quiz_questions.figure_chart_data, drawn by ChartView with the
// figure engine. The engine loads lazily (engine-loader.tsx) so quiz pages
// without a chart never download it (AR-33); until it loads, a client-only
// mount shows a placeholder the size of the chart's box.
// ============================================================

import { cn } from "@/lib/utils";
import { chartBox } from "./figures/chart-box";
import type { ChartFigureProps } from "./figures/ChartView";
import { lazyView } from "./figures/engine-loader";
import { DrawingPlaceholder } from "./figures/placeholders";

function ChartPlaceholder({ data, className }: ChartFigureProps) {
  return (
    <figure className={cn("themed-question-figure block w-full max-w-full", className)}>
      <DrawingPlaceholder
        box={chartBox(data)}
        className="block w-full rounded-lg border border-bronze bg-night"
      />
    </figure>
  );
}

const ChartFigure = lazyView<ChartFigureProps>((engine) => engine.ChartView, ChartPlaceholder);

export default ChartFigure;
