/*
 * The light of the Library's Shinkai-style world (founder, 2026-11-08: "a Makoto Shinkai glow …
 * luminous detailed skies, glowing light, lens-flare-like glows, rich clouds"; "mostly soft and
 * light, with rich saturated colors and deep blues allowed"). One palette per hour, shared by the
 * sky, the descent and both places, so the sky always matches the ground it descends into.
 */
import type { TimeOfDay } from "../../light";
import type { Color } from "../../noise";

export interface ShinkaiLight {
  /** Sky, top to horizon. */
  sky: [Color, Color, Color, Color];
  /** The sun (or moon) and the glow around it. */
  sun: Color;
  bloom: Color;
  /** Cloud: lit face, rim against the light, shadowed underside. */
  cloudLit: Color;
  cloudRim: Color;
  cloudShade: Color;
  /** Land: sunlit grass, grass in shade, far hills (haze). */
  grass: Color;
  grassShade: Color;
  haze: Color;
  /** Warm window and lantern light, and how strongly it glows (0 by day, 1 at night). */
  lamp: Color;
  lampGlow: number;
  /** Stars: 0 none, 1 a full night sky with the Milky Way. */
  stars: number;
  /** A cool lift for the Math side, a warm one for Reading and Writing. */
  cool: Color;
  warm: Color;
}

export const SHINKAI: Record<TimeOfDay, ShinkaiLight> = {
  dawn: {
    sky: [
      [58, 84, 160],
      [132, 150, 214],
      [246, 196, 196],
      [255, 226, 196],
    ],
    sun: [255, 244, 222],
    bloom: [255, 206, 170],
    cloudLit: [255, 236, 226],
    cloudRim: [255, 250, 240],
    cloudShade: [150, 140, 190],
    grass: [128, 176, 110],
    grassShade: [70, 104, 92],
    haze: [196, 190, 220],
    lamp: [255, 214, 150],
    lampGlow: 0.3,
    stars: 0.15,
    cool: [120, 170, 230],
    warm: [255, 190, 150],
  },
  day: {
    sky: [
      [22, 72, 168],
      [52, 128, 214],
      [140, 196, 240],
      [222, 240, 252],
    ],
    sun: [255, 255, 248],
    bloom: [255, 248, 222],
    cloudLit: [255, 255, 255],
    cloudRim: [255, 252, 236],
    cloudShade: [148, 172, 210],
    grass: [118, 186, 92],
    grassShade: [58, 120, 82],
    haze: [170, 206, 232],
    lamp: [255, 214, 150],
    lampGlow: 0.15,
    stars: 0,
    cool: [90, 180, 230],
    warm: [255, 214, 150],
  },
  sunset: {
    sky: [
      [36, 38, 104],
      [128, 70, 140],
      [246, 120, 96],
      [255, 196, 120],
    ],
    sun: [255, 238, 196],
    bloom: [255, 170, 96],
    cloudLit: [255, 196, 150],
    cloudRim: [255, 236, 190],
    cloudShade: [104, 70, 120],
    grass: [150, 150, 70],
    grassShade: [66, 62, 66],
    haze: [210, 140, 140],
    lamp: [255, 196, 120],
    lampGlow: 0.65,
    stars: 0.1,
    cool: [130, 120, 210],
    warm: [255, 170, 100],
  },
  night: {
    sky: [
      [4, 10, 34],
      [12, 30, 78],
      [34, 66, 128],
      [70, 104, 160],
    ],
    sun: [244, 244, 236],
    bloom: [150, 180, 240],
    cloudLit: [150, 172, 214],
    cloudRim: [214, 226, 250],
    cloudShade: [26, 40, 78],
    grass: [40, 74, 82],
    grassShade: [14, 30, 44],
    haze: [56, 84, 132],
    lamp: [255, 196, 120],
    lampGlow: 1,
    stars: 1,
    cool: [90, 140, 240],
    warm: [255, 190, 120],
  },
};
