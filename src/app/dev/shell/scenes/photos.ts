// The places behind the next session, each in the light of its hour: real photographs, painted
// (founder, 2026-11-17: the plain photographs looked too real and the scenes drawn in code too
// cartoony, so he asked for a halfway, and approved it). scripts/dev/paint-scenes.cjs paints each
// photograph in public/scenes into a "-painted" twin, and those are what the card shows. The
// plain photographs are the backup: `plain()` gives one back, and the page's ?photo=real shows
// them. Where each photograph came from is in public/scenes/README.md; all are in the public
// domain. Each picture says where its sky ends, where its water is, what sways and what lives
// there (see SchedulePhoto.tsx), as shares of the photograph's height from its top.
import type { Life, Photo } from "../SchedulePhoto";
import type { Sky } from "../scheduleData";

export interface Picture extends Photo {
  /** The plain photograph it was painted from. */
  from: string;
}

/** `name` is the photograph's file name without ".jpg". A night made from the day's photograph
 *  (the script does this for a place with no photograph of its night) names that day as `of`. */
const shot = (name: string, facts: Omit<Photo, "src">, of = name): Picture => ({
  src: `/scenes/${name}-painted.jpg`,
  from: `/scenes/${of}.jpg`,
  ...facts,
});

const LAKE: Life[] = ["ducks", "frog", "birds", "mist", "fireflies"];
const lake = (light: Sky, water: number, bank?: number) =>
  shot(`lake-${light}`, { horizon: water, water, bank, life: LAKE });

export const PLACES = {
  lake: {
    day: lake("day", 0.42, 0.7),
    sunset: lake("sunset", 0.63),
    sunrise: lake("sunrise", 0.51),
    night: lake("night", 0.66),
  },
  mountains: {
    sunrise: shot("mountains-sunrise", {
      horizon: 0.5,
      sway: [0.62, 1],
      life: ["birds", "butterflies"],
    }),
    day: shot("mountains-day", { horizon: 0.42, sway: [0.66, 1], life: ["birds"] }),
    sunset: shot("mountains-sunset", { horizon: 0.45, sway: [0.52, 0.68], life: ["birds"] }),
    night: shot("mountains-night", { horizon: 0.62, sway: [0.74, 0.95], life: ["fireflies"] }),
  },
  cottage: {
    sunrise: shot("cottage-sunrise", { horizon: 0.55, sway: [0, 0.6], life: ["birds"] }),
    day: shot("cottage-day", { horizon: 0.02, sway: [0, 0.55], life: ["butterflies"] }),
    sunset: shot("cottage-sunset", {
      horizon: 0.45,
      sway: [0, 0.5],
      life: ["birds", "butterflies"],
    }),
    night: shot("cottage-night", { horizon: 0.55, life: ["fireflies"] }),
  },
  beach: {
    sunrise: shot("beach-sunrise", {
      horizon: 0.57,
      water: 0.57,
      bank: 0.74,
      sway: [0.05, 0.5],
      swing: 2,
      life: ["birds"],
    }),
    day: shot("beach-day", {
      horizon: 0.72,
      water: 0.72,
      bank: 0.8,
      sway: [0, 0.6],
      swing: 2,
      life: ["birds"],
    }),
    sunset: shot("beach-sunset", {
      horizon: 0.52,
      water: 0.52,
      bank: 0.8,
      sway: [0, 0.45],
      swing: 2,
      life: ["birds"],
    }),
    // made from the day's photograph: no good photograph of a palm beach at night was found
    night: shot(
      "beach-night",
      { horizon: 0.72, water: 0.72, bank: 0.8, sway: [0, 0.6], swing: 2, life: [] },
      "beach-day"
    ),
  },
  desert: {
    sunrise: shot("desert-sunrise", { horizon: 0.42, swing: 0, life: ["sand"] }),
    day: shot("desert-day", { horizon: 0.42, swing: 0, life: ["sand", "birds"] }),
    sunset: shot("desert-sunset", { horizon: 0.33, swing: 0, life: ["sand", "birds"] }),
    night: shot("desert-night", { horizon: 0.72, swing: 0, life: ["sand"] }),
  },
} satisfies Record<string, Partial<Record<Sky, Picture>>>;

export type Place = keyof typeof PLACES;
export const PLACE_NAMES = Object.keys(PLACES) as Place[];

/** A place's picture in a light. Sunrise and sunset look alike, so each stands in for the other
 *  when a place has only one. */
function lit(place: Place, sky: Sky): Picture | undefined {
  const lights: Partial<Record<Sky, Picture>> = PLACES[place];
  return (
    lights[sky] ??
    (sky === "sunrise" ? lights.sunset : sky === "sunset" ? lights.sunrise : undefined)
  );
}

/** The picture for a moment in a light. `seed` (a session's start) chooses the place, the same
 *  one every time for the same session, among the places that have that light. `place` asks for
 *  one by name (the page's ?place=). */
export function pictureFor(seed: number, sky: Sky, place?: Place): Picture {
  const asked = place && lit(place, sky);
  if (asked) return asked;
  const having = PLACE_NAMES.filter((name) => lit(name, sky));
  // by the half hour, so two sessions on the same day are in different places
  const n = Math.floor(seed / 1_800_000);
  return lit(having[((n * 2654435761) >>> 0) % having.length], sky) ?? PLACES.lake.day;
}

/** The photograph a painting was made from. */
export const plain = (picture: Picture): Picture => ({ ...picture, src: picture.from });
