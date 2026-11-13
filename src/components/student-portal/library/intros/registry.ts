import type { ComponentType } from "react";
import PopUpBook from "./4-pop-up-book/PopUpBook";

export type Subject = "math" | "rw";
export type IntroProps = {
  percents: { math: number; rw: number };
  time: "dawn" | "day" | "sunset" | "night";
  reducedMotion: boolean;
  /** Call when your closing animation has finished; the page then shows the shared end state. */
  onChoose: (s: Subject) => void;
};
export type IntroDef = { id: number; name: string; Component: ComponentType<IntroProps> };
export const INTROS: IntroDef[] = [{ id: 4, name: "Pop-up book", Component: PopUpBook }];
