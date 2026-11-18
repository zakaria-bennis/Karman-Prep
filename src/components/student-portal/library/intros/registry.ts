/*
 * The Library's opening animations (founder, 2026-11-08): ten openings to compare, each ending in
 * the same Library box. The Library page plays the one named by `?intro=N`. Each intro fills the
 * screen, lets the student choose Math or Reading and Writing, plays its own closing animation and
 * then calls `onChoose`; the page then shows the shared end state: the Library box open over that
 * subject's ground scene.
 */
import type { ComponentType } from "react";
import Easel from "./9-easel/Easel";
import PaperBoats from "./10-paper-boats/PaperBoats";

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
  { id: 9, name: "The easel", Component: Easel },
  { id: 10, name: "Paper boats", Component: PaperBoats },
];
