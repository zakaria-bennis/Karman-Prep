"use client";

// Data pictures: bar, line, dot, box, histogram, scatter and table; a sample from a population.
// (Being drawn.)
import type { DataFigure, SampleFigure } from "@/lib/lessons/figures";

export function DataFig({ fig }: { fig: DataFigure }) {
  return fig ? null : null;
}
export function SampleFig({ fig }: { fig: SampleFigure }) {
  return fig ? null : null;
}
