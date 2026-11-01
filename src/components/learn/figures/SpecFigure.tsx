"use client";

// ============================================================
// SpecFigure: a question's figure_spec drawn with the figure engine. A drawn
// type renders as FigureView(buildScene(...)), a table as SpecTable
// (TableView, plus the calculator's table transfer control on Math
// surfaces). An invalid spec is never drawn in part: it logs one error and
// the stored older figure (src or svg) shows instead, or nothing when there
// is none (drawnFigure makes the same choice).
//
// Part of the lazy engine chunk (engine-views.ts); FigureFrame loads it.
// ============================================================

import { useEffect, useMemo } from "react";
import { boxForWidth, buildScene } from "@/lib/figures/engine/index";
import type { Scene } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import { logInvalidSpec } from "@/lib/figures/invalid-spec-log";
import { cn } from "@/lib/utils";
import FigureView from "./FigureView";
import StoredFigure, { FIGURE_FRAME, type StoredFigureProps } from "./StoredFigure";
import { SpecTable } from "./TableFigure";
import { useMeasuredWidth } from "./useMeasuredWidth";

export type SpecFigureProps = StoredFigureProps & {
  /** The question's figure_spec, unvalidated as stored. */
  spec: unknown;
  /** Math surfaces: a table spec gets the calculator's table transfer control. */
  calculator?: boolean;
};

type SpecDrawing = { table: FigureSpec } | { scene: Scene } | { error: string };

/** The spec drawn for a container `width` px wide (boxForWidth); its default box before it is measured. */
function drawSpec(input: unknown, width: number | null): SpecDrawing {
  const parsed = parseFigureSpec(input);
  if (!parsed.ok) return { error: parsed.errors.join("; ") };
  if (parsed.spec.type === "table") return { table: parsed.spec };
  try {
    return { scene: buildScene(parsed.spec, boxForWidth(parsed.spec, width)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export default function SpecFigure({
  spec,
  alt,
  calculator = false,
  maxHeightClass,
  className,
  src,
  svg,
}: SpecFigureProps) {
  // The figure's content width, so a narrow screen lays it out at its own size (text ≥ 12px).
  // A callback ref: the <figure> mounts only for a drawn spec, so a table spec that becomes a
  // drawn one is still measured.
  const [frame, width] = useMeasuredWidth<HTMLElement>();
  const drawing = useMemo(() => drawSpec(spec, width), [spec, width]);
  const error = "error" in drawing ? drawing.error : null;
  const fallback = !!(src || svg);
  useEffect(() => {
    if (error) logInvalidSpec(error, fallback);
  }, [error, fallback]);
  if ("error" in drawing)
    return fallback ? (
      <StoredFigure
        src={src}
        svg={svg}
        alt={alt}
        maxHeightClass={maxHeightClass}
        className={className}
      />
    ) : null;
  if ("table" in drawing)
    return <SpecTable spec={drawing.table} calculator={calculator} className={className} />;
  const { scene } = drawing;
  // The description generated from the spec's named parts names what is actually drawn.
  const description = scene.description || alt;
  return (
    <figure ref={frame} className={cn(FIGURE_FRAME, className)}>
      <FigureView
        scene={{ ...scene, description }}
        className={cn("mx-auto block h-auto w-full max-w-full", maxHeightClass)}
      />
    </figure>
  );
}
