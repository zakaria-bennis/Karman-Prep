/*
 * The Library's opening animations (founder, 2026-11-08: ten different openings to compare, all
 * leading to the same Library box). The Library page plays the one named by `?intro=N`. Each
 * intro fills the screen, lets the student choose Math or Reading and Writing, plays its own
 * closing animation and then calls `onChoose`; the page then shows the shared end state: the
 * Library box open over that subject's ground scene.
 */
import type { ComponentType } from "react";
import FoldedMap from "./7-folded-map/FoldedMap";
import Lanterns from "./8-lanterns/Lanterns";

export type Subject = "math" | "rw";
export type IntroProps = {
  percents: { math: number; rw: number };
  time: "dawn" | "day" | "sunset" | "night";
  reducedMotion: boolean;
  /** Call when your closing animation has finished; the page then shows the shared end state. */
  onChoose: (s: Subject) => void;
};
export type IntroDef = { id: number; name: string; Component: ComponentType<IntroProps> };
export const INTROS: IntroDef[] = [
  { id: 7, name: "Folded map", Component: FoldedMap },
  { id: 8, name: "Lanterns", Component: Lanterns },
];
