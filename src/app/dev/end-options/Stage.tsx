"use client";
// A skill's stage, drawn one of two ways for the founder to choose between (2026-11-20, his ideas 1
// and 3 of five):
//   tails  Karman grows tails, as a fox in the old stories does with each step in wisdom
//   stars  a constellation in a window of night sky that becomes Karman's face
// StageChange plays the change from one level to the next; StageMark is the level, still.
import { createContext, useContext } from "react";
import { StarsMark, StarsStage } from "./StarsStage";
import { TailsMark, TailsStage } from "./TailsStage";

export const STAGES = ["tails", "stars"] as const;
export type StageKind = (typeof STAGES)[number];
/** Which of the two the page shows (page.tsx, ?stage=). */
export const StageKindContext = createContext<StageKind>("tails");

export function StageChange(props: {
  from: number;
  to: number;
  play: boolean;
  size?: number;
  onPeak?: () => void;
}) {
  const kind = useContext(StageKindContext);
  return kind === "stars" ? <StarsStage {...props} /> : <TailsStage {...props} />;
}

export function StageMark({ level, size = 44 }: { level: number; size?: number }) {
  const kind = useContext(StageKindContext);
  return kind === "stars" ? (
    <StarsMark level={level} size={size} />
  ) : (
    <TailsMark level={level} size={size} />
  );
}
