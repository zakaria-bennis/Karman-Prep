"use client";

// A lesson's picture, by kind (src/lib/lessons/figures.ts). It draws itself in when it is first seen
// (useDrawIn); pressing it draws it again.
import { useRef } from "react";
import type { Figure as FigureData } from "@/lib/lessons/figures";
import { BalanceFig, GridFig, MachineFig, NumberLineFig, TapeFig } from "./AlgebraFigs";
import { CircleFig } from "./CircleFig";
import { DataFig, SampleFig } from "./DataFigs";
import { AnglesFig, ShapeFig, SolidFig, TriangleFig } from "./GeometryFigs";
import { PlaneFig } from "./PlaneFig";
import {
  NotesFig,
  PassageFig,
  RoadFig,
  SentenceFig,
  TimelineFig,
  TwoTextsFig,
  WordsFig,
} from "./TextFigs";
import { useDrawIn } from "./useDrawIn";

function Inner({ fig }: { fig: FigureData }) {
  switch (fig.kind) {
    case "plane":
      return <PlaneFig fig={fig} />;
    case "circle":
      return <CircleFig fig={fig} />;
    case "triangle":
      return <TriangleFig fig={fig} />;
    case "angles":
      return <AnglesFig fig={fig} />;
    case "solid":
      return <SolidFig fig={fig} />;
    case "shape":
      return <ShapeFig fig={fig} />;
    case "balance":
      return <BalanceFig fig={fig} />;
    case "numberLine":
      return <NumberLineFig fig={fig} />;
    case "tape":
      return <TapeFig fig={fig} />;
    case "grid":
      return <GridFig fig={fig} />;
    case "machine":
      return <MachineFig fig={fig} />;
    case "data":
      return <DataFig fig={fig} />;
    case "sample":
      return <SampleFig fig={fig} />;
    case "passage":
      return <PassageFig fig={fig} />;
    case "twoTexts":
      return <TwoTextsFig fig={fig} />;
    case "notes":
      return <NotesFig fig={fig} />;
    case "road":
      return <RoadFig fig={fig} />;
    case "sentence":
      return <SentenceFig fig={fig} />;
    case "timeline":
      return <TimelineFig fig={fig} />;
    case "words":
      return <WordsFig fig={fig} />;
  }
}

export function Figure({ fig, className }: { fig: FigureData; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const again = useDrawIn(ref, JSON.stringify(fig));
  return (
    <div
      ref={ref}
      className={className}
      onClick={again}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && again()}
      role="button"
      tabIndex={0}
      aria-label="Draw the picture again"
    >
      <Inner fig={fig} />
    </div>
  );
}
