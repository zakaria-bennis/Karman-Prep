// The places a session can be painted in (founder, 2026-11-17). Each is one picture program made
// from the shared kit (kit.ts) and a scene of its own, lit for night, sunrise, day and sunset.
import { KIT, MAIN } from "./kit";
import { BEACH } from "./beach";
import { COTTAGE } from "./cottage";
import { LAKE } from "./lake";
import { MOUNTAINS } from "./mountains";
import { RIVER } from "./river";

export const SCENES = {
  lake: LAKE,
  river: RIVER,
  beach: BEACH,
  cottage: COTTAGE,
  mountains: MOUNTAINS,
} as const;
export type SceneName = keyof typeof SCENES;
export const SCENE_NAMES = Object.keys(SCENES) as SceneName[];

/** The whole picture program for a place. */
export const programOf = (name: SceneName) => KIT + SCENES[name] + MAIN;

/** The place for a session: the same session is always painted in the same place, and sessions
 *  next to each other get different ones. */
export function sceneFor(seed: number): SceneName {
  const n = Math.abs(Math.floor(seed / 86_400_000) * 7 + Math.floor(seed / 3_600_000));
  return SCENE_NAMES[n % SCENE_NAMES.length];
}
