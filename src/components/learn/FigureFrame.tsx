"use client";

// ============================================================
// FigureFrame — themed wrapper for question figures
//
// A question's figure_spec (a FigureSpec, src/lib/figures/engine) wins over
// every older figure field: SpecFigure draws it with the figure engine, which
// loads lazily (engine-loader.tsx) so quiz pages without a spec figure never
// download it (AR-33). Until it loads, a client-only mount shows a placeholder
// the size of the spec's default box. An invalid spec logs one error and the
// stored older figure (src or svg) shows instead, or nothing when there is none.
// Without a spec, StoredFigure draws the older fields (raster or .svg `src`,
// or a stored `svg`).
// ============================================================

import { defaultBoxForType, storedSpecType } from "@/lib/figures/engine/spec-types";
import { cn } from "@/lib/utils";
import { lazyView } from "./figures/engine-loader";
import { DrawingPlaceholder, TablePlaceholder, tableRows } from "./figures/placeholders";
import type { SpecFigureProps } from "./figures/SpecFigure";
import StoredFigure, { FIGURE_FRAME } from "./figures/StoredFigure";

interface Props {
  /** The question's figure_spec, unvalidated as stored. When present it is drawn instead of
   *  `src` and `svg`; when invalid `src` or `svg` is drawn, else nothing. */
  spec?: unknown;
  /** Math surfaces: a table spec gets the calculator's table transfer control, as
   *  QuestionTable's `calculator` does. */
  calculator?: boolean;
  /** Raster or .svg figure URL. Empty when the figure is an inline `svg`. */
  src?: string | null;
  /** A hand-drawn figure SVG stored on the question (figure_svg); used only without `src`.
   *  Inlined through the same sanitizer as fetched SVGs, else shown as an inert <img>. */
  svg?: string | null;
  alt: string;
  /** Optional max-height cap. Defaults to the conservative 28rem
   *  used in the quiz engine; tweak for tighter inspector cards. */
  maxHeightClass?: string;
  className?: string;
}

/** The spec's frame at its default box (a table's rows), the size SpecFigure draws. */
function SpecPlaceholder({ spec, maxHeightClass, className }: SpecFigureProps) {
  const type = storedSpecType(spec);
  if (type === "table") {
    const parts = (spec as { parts?: unknown }).parts;
    const part = Array.isArray(parts)
      ? (parts as { kind?: unknown }[]).find((p) => p?.kind === "table")
      : undefined;
    return (
      <TablePlaceholder
        rows={tableRows({ ...(part ?? {}), title: (spec as { title?: unknown }).title })}
        className={className}
      />
    );
  }
  return (
    <figure className={cn(FIGURE_FRAME, className)}>
      <DrawingPlaceholder
        box={defaultBoxForType(type ?? "")}
        className={cn("mx-auto w-full max-w-full", maxHeightClass)}
      />
    </figure>
  );
}

const SpecFigure = lazyView<SpecFigureProps>((engine) => engine.SpecFigure, SpecPlaceholder);

export default function FigureFrame({
  spec,
  calculator,
  maxHeightClass = "max-h-[28rem]",
  ...rest
}: Props) {
  if (spec !== null && spec !== undefined)
    return (
      <SpecFigure spec={spec} calculator={calculator} maxHeightClass={maxHeightClass} {...rest} />
    );
  return <StoredFigure maxHeightClass={maxHeightClass} {...rest} />;
}
