/*
 * What the Library page offers its opening animations beyond IntroProps: the shared ground scene
 * (the bridge and lake, or the meadow and book) can be shown underneath an intro while it is still
 * animating, so the intro can open onto it, fly down to it or fade into it. Optional: an intro
 * that never calls it simply hands over with a cross-fade.
 */
import { createContext, useContext } from "react";
import type { Subject } from "./registry";

export interface IntroStage {
  /** Paints in the shared ground for this subject under the intro (null hides it). */
  showGround: (s: Subject | null) => void;
}

export const IntroStageContext = createContext<IntroStage>({ showGround: () => {} });

export const useIntroStage = () => useContext(IntroStageContext);
