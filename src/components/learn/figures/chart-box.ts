import type { Box } from "@/lib/figures/engine/plane-axes";
import type { ChartFigure } from "@/types/chart";

/** A chart's default box: 600×400, or 500×500 for figures whose source plot is square. */
export const chartBox = (data: Pick<ChartFigure, "frame">): Box =>
  data.frame === "square" ? { width: 500, height: 500 } : { width: 600, height: 400 };
