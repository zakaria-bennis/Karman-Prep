/*
 * The Library's opening animations (founder, 2026-11-08: "I want 10 different animations I can
 * pick from, each unique, with a different design and thought process, but all of them leading to
 * the same library card at the end"). The Library page plays the one named by `?intro=N` (intro 1
 * without it). Each intro fills the screen, lets the student choose Math or Reading and Writing,
 * plays its own closing animation and then calls `onChoose`; the page then shows the shared end
 * state: the Library box open over that subject's ground scene.
 *
 * Intros may also call `useIntroStage().showGround(subject)` (stage-context.ts) to have the
 * shared ground scene painted in underneath them while they animate, so they can land on it.
 */
import type { ComponentType } from "react";
import SkyToGround from "./1-sky-to-ground/SkyToGround";
import Telescope from "./2-telescope/Telescope";
import LibraryDoors from "./3-library-doors/LibraryDoors";

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
  { id: 1, name: "Sky to ground", Component: SkyToGround },
  { id: 2, name: "Telescope", Component: Telescope },
  { id: 3, name: "Library doors", Component: LibraryDoors },
];
