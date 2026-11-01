"use client";

// ============================================================
// SpecFigure: a question's figure_spec drawn with the figure engine. A drawn
// type renders as FigureView(buildScene(...)), a table as SpecTable
// (TableView, plus the calculator's table transfer control on Math
// surfaces). A figure_spec that is a list draws each figure as its own
// figure, stacked top to bottom with even spacing, each with its own title,
// note and accessible description; two tables stay two tables. An invalid
// spec (any figure of a list) is never drawn in part: it logs one error and
// the stored older figure (src or svg) shows instead, or nothing when there
// is none (drawnFigure makes the same choice).
//
// Part of the lazy engine chunk (engine-views.ts); FigureFrame loads it.
// ============================================================

import { useEffect, useMemo } from "react";
import { boxForWidth, buildScene } from "@/lib/figures/engine/index";
import type { Scene } from "@/lib/figures/engine/scene";
import { parseFigureSpecs, type FigureSpec } from "@/lib/figures/engine/spec";
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

type Drawing = { table: FigureSpec } | { scene: Scene };
type SpecDrawing = { figures: Drawing[] } | { error: string };

/** The spec's figures drawn for a container `width` px wide (boxForWidth); default boxes before it is measured. */
function drawSpec(input: unknown, width: number | null): SpecDrawing {
  const parsed = parseFigureSpecs(input);
  if (!parsed.ok) return { error: parsed.errors.join("; ") };
  try {
    return {
      figures: parsed.specs.map((spec) =>
        spec.type === "table"
          ? { table: spec }
          : { scene: buildScene(spec, boxForWidth(spec, width)) }
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Several figures: one column, top to bottom, the frames' own margins dropped for one even gap. */
const STACK = "my-4 flex flex-col gap-4";

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
  const { figures } = drawing;
  const many = figures.length > 1;
  // Every frame in a stack is as wide, so the first drawn figure's width serves them all.
  const measured = figures.findIndex((f) => "scene" in f);
  // The calculator's table transfer takes one table: the first (its item id is "table").
  const transfer = figures.findIndex((f) => "table" in f);
  const one = (figure: Drawing, key: number) => {
    if ("table" in figure)
      return (
        <SpecTable
          key={key}
          spec={figure.table}
          calculator={calculator && key === transfer}
          // In a stack each table keeps its own width and its own row: never side by side.
          className={many ? "my-0 self-start" : className}
        />
      );
    // The description generated from the spec's named parts names what is actually drawn.
    const description = figure.scene.description || alt;
    return (
      <figure
        key={key}
        ref={key === measured ? frame : undefined}
        className={cn(FIGURE_FRAME, many ? "my-0" : className)}
      >
        <FigureView
          scene={{ ...figure.scene, description }}
          className={cn("mx-auto block h-auto w-full max-w-full", maxHeightClass)}
        />
      </figure>
    );
  };
  if (!many) return one(figures[0], 0);
  return (
    <div data-figure-stack="" className={cn(STACK, className)}>
      {figures.map(one)}
    </div>
  );
}
