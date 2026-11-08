"use client";
import { createContext, useContext, type MutableRefObject } from "react";
import type { InkDocument, InkOp, PenIndex } from "@/lib/quiz/ink/types";
import type { RoutingState } from "@/lib/quiz/ink/routing";

export type PencilTool = "pen" | "eraser";

export type PencilContextValue = {
  pencilOn: boolean;
  tool: PencilTool;
  pen: PenIndex;
  /** Session-wide routing memory: pen seen, active pen. */
  routing: MutableRefObject<RoutingState>;
  /** The current question's ink. */
  ink: InkDocument;
  apply(op: InkOp): void;
  /** Called when a finished stroke circles a choice's letter. */
  offerPick(letter: string): void;
  allowPick: boolean;
  setDrawing(drawing: boolean): void;
};

export const PencilContext = createContext<PencilContextValue | null>(null);
export const usePencil = () => useContext(PencilContext);
