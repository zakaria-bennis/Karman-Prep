// ============================================================
// The figure engine's lazy chunk (engine-loader.tsx): every view that draws
// with the engine, and the spec parser screens pick their figure path with.
// Import it only through loadFigureEngine / lazyView, never statically from
// a quiz route, or the engine is back in the page's eager JS (AR-33).
// ============================================================

export { parseFigureSpec } from "@/lib/figures/engine/spec";
export { default as SpecFigure } from "./SpecFigure";
export { default as ChartView } from "./ChartView";
export { default as TableFigure } from "./TableFigure";
export { default as FigureChoicesView } from "./FigureChoicesView";
