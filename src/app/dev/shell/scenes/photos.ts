// Each place in each light: a real photograph, painted (founder, 2026-11-17: the plain photographs
// looked too real and the scenes drawn in code too cartoony, so he asked for a halfway).
// scripts/dev/paint-scenes.cjs paints each photograph in public/scenes into a "-painted" twin, and
// those are what the card shows. The plain photographs are the backup: `plain()` gives one back,
// and the page's ?photo=real shows them. Where each photograph came from is in
// public/scenes/README.md; all are in the public domain. `water` is where the water begins.
import type { Photo } from "../SchedulePhoto";
import type { Sky } from "../scheduleData";

const lake = (light: Sky, water: number, bank?: number): Photo => ({
  src: `/scenes/lake-${light}-painted.jpg`,
  water,
  bank,
});

export const PHOTOS: Record<"lake", Record<Sky, Photo>> = {
  lake: {
    day: lake("day", 0.42, 0.7),
    sunset: lake("sunset", 0.63),
    sunrise: lake("sunrise", 0.51),
    night: lake("night", 0.66),
  },
};

/** The photograph a painting was made from. */
export const plain = (photo: Photo): Photo => ({
  ...photo,
  src: photo.src.replace("-painted", ""),
});
