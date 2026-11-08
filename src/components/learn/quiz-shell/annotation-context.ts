"use client";
import { createContext, useContext } from "react";
import type { AnnotationRange, Highlight, HighlightColor } from "@/lib/quiz/workspace";

export type AnnotationContextValue = {
  enabled: boolean;
  highlights: Highlight[];
  add(range: AnnotationRange, color: HighlightColor): number;
  recolor(id: number, color: HighlightColor): void;
  note(id: number, text: string): void;
  remove(id: number): void;
};
export const AnnotationContext = createContext<AnnotationContextValue | null>(null);
export const useAnnotations = () => useContext(AnnotationContext);
