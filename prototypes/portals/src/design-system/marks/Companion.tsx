import { useMemo } from "react";
import {
  ANIMALS,
  STAGES,
  headSVG,
  pawsSVG,
  MOUTHS,
  type AnimalId,
  type Stage,
  type Mood,
} from "./mascot-paths";
import { ACCESSORIES, type AccessoryId } from "./accessories";

/**
 * A still companion head (the end screen's P.fox and P.owl), at a size in px.
 * Moods: n (eyes open), h (happy, eyes closed), o (delighted). The fox may wear
 * one accessory. The animated engine (eyes that follow the pointer, blinking,
 * the cheer) comes later from the Daily 10 agent.
 */
export interface CompanionProps {
  animal?: AnimalId;
  stage?: Stage;
  mood?: Mood;
  accessory?: AccessoryId;
  size?: number;
  className?: string;
}

function moodStyles(mood: Mood) {
  const closed = mood === "h";
  return `
    .m-eN{opacity:${closed ? 0 : 1}} .m-eH{opacity:${closed ? 1 : 0}}
    .m-blush{opacity:${mood === "h" ? 0.85 : 0.5}}
    .m-mouth{d:path("${MOUTHS[mood]}");fill:${mood === "n" ? "none" : "#7A2E24"}}`;
}

export function CompanionHead({
  animal = "fox",
  stage = "grown",
  mood = "n",
  accessory,
  size = 120,
  className,
}: CompanionProps) {
  const st = STAGES[stage];
  const inner = useMemo(() => {
    const acc = animal === "fox" && accessory ? ACCESSORIES[accessory] : "";
    return headSVG(ANIMALS[animal], st) + acc;
  }, [animal, st, accessory]);
  return (
    <svg
      viewBox="-60 -112 120 128"
      width={size}
      height={(size * 128) / 120}
      aria-hidden="true"
      className={className}
    >
      <style>{moodStyles(mood)}</style>
      <g transform={`scale(${st.head})`} dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}

/** The companion peeking over an edge: head and paws, the end screen's portrait(). */
export function CompanionBody({
  animal = "fox",
  stage = "grown",
  mood = "n",
  accessory,
  size = 92,
  className,
}: CompanionProps) {
  const st = STAGES[stage];
  const a = ANIMALS[animal];
  const head = useMemo(
    () => headSVG(a, st) + (animal === "fox" && accessory ? ACCESSORIES[accessory] : ""),
    [a, st, animal, accessory]
  );
  const paws = useMemo(() => pawsSVG(a), [a]);
  return (
    <svg
      viewBox={`-56 -110 112 ${size + 30}`}
      width={size}
      height={size + 30}
      aria-hidden="true"
      className={className}
    >
      <style>{moodStyles(mood)}</style>
      <g transform={`scale(${st.head})`} dangerouslySetInnerHTML={{ __html: head }} />
      <rect x="-56" y="0" width="112" height={size} fill="rgb(var(--k-panel))" />
      <line x1="-56" y1="0" x2="56" y2="0" stroke="rgb(var(--k-border))" />
      <g transform={`scale(${st.head})`} dangerouslySetInnerHTML={{ __html: paws }} />
    </svg>
  );
}
