"use client";

// ============================================================
// FigureChoices: answer choices that are graphs, charts or shapes, drawn by
// FigureChoicesView with the figure engine. The engine loads lazily
// (engine-loader.tsx) so quiz pages without figure choices never download it
// (AR-33), nor its CSS module; until it loads, a client-only mount shows the choice grid with one
// empty figure box (CHOICE_BOX's aspect) per choice.
// ============================================================

import { CHOICE_BOX } from "@/lib/figures/engine/spec-types";
import type { CSSProperties } from "react";
import { lazyView } from "./engine-loader";
import type { FigureChoicesProps } from "./FigureChoicesView";
import { DrawingPlaceholder } from "./placeholders";

export type { FigureChoiceItem } from "./FigureChoicesView";

/**
 * figure-choices.module.css's grid, letter column and figure box, inline: the module stays in
 * the engine chunk, so no quiz route's eager CSS carries it.
 */
const GRID: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, max(17rem, calc(50% - 0.375rem))), 1fr))",
};
const LETTER_COLUMN = "flex w-11 shrink-0 flex-col items-center gap-1.5";
const FIGURE = "mx-auto block min-w-0 max-w-[22rem] flex-1";

function ChoicesPlaceholder({ choices, className }: FigureChoicesProps) {
  return (
    <div data-figure-choices="" className={className} style={GRID}>
      {choices.map(({ letter }) => (
        <div
          key={letter}
          className="flex w-full min-w-0 items-start gap-2.5 rounded-xl border border-bronze bg-surface p-2.5"
        >
          <span className={LETTER_COLUMN}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-[13px] font-bold text-ivory/80">
              {letter}
            </span>
          </span>
          <span className={FIGURE}>
            <DrawingPlaceholder box={CHOICE_BOX} className="block w-full" />
          </span>
        </div>
      ))}
    </div>
  );
}

const FigureChoices = lazyView<FigureChoicesProps>(
  (engine) => engine.FigureChoicesView,
  ChoicesPlaceholder
);

export default FigureChoices;
