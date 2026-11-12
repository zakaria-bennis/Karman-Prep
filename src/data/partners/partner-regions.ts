/*
 * Where Karman Prep's partner districts are, for the map on /schools (founder, 2026-11-12).
 *
 * Zakaria counts 65 partner districts. The contracts are paper and not in hand, so this file holds
 * AREAS and counts: no school, district, town or city name may go on the map or anywhere else on
 * the site until that district's written OK to be named has been seen; those few go in `named`. Each dot is placed
 * by a fixed pseudo-random spread around its area's center, so it marks a region, not a district.
 *
 * The map stays off unless PARTNER_MAP=on, and that waits on Zakaria's OK.
 */

export interface PartnerRegion {
  /** Shown on hover: an area, never a town, school or district. */
  label: string;
  state: string;
  /** The area's center. */
  lat: number;
  lon: number;
  /** How many partner districts in this area. */
  count: number;
  /** How far, in degrees, dots may spread from the center. */
  spread: number;
  /**
   * Districts that agreed in writing to be named, shown on their own dot instead of the area.
   * Add one only with that written OK in hand; every other dot keeps the area label.
   */
  named?: readonly string[];
}

export const PARTNER_REGIONS: readonly PartnerRegion[] = [
  { label: "Boston area", state: "MA", lat: 42.36, lon: -71.3, count: 10, spread: 0.35 },
  { label: "New York area", state: "NY", lat: 40.95, lon: -73.6, count: 7, spread: 0.35 },
  { label: "New Jersey", state: "NJ", lat: 40.6, lon: -74.45, count: 9, spread: 0.35 },
  {
    label: "Fairfield County",
    state: "CT",
    lat: 41.15,
    lon: -73.45,
    count: 4,
    spread: 0.15,
    // Written OK from the district contact, shared 2026-11-12.
    named: ["Greenwich Public Schools"],
  },
  { label: "Philadelphia area", state: "PA", lat: 40.05, lon: -75.45, count: 5, spread: 0.25 },
  { label: "Pittsburgh area", state: "PA", lat: 40.35, lon: -80.05, count: 1, spread: 0.1 },
  { label: "Bay Area", state: "CA", lat: 37.45, lon: -122.1, count: 5, spread: 0.3 },
  { label: "Los Angeles area", state: "CA", lat: 34.1, lon: -118.15, count: 5, spread: 0.3 },
  { label: "Orange County", state: "CA", lat: 33.68, lon: -117.8, count: 1, spread: 0.1 },
  { label: "San Diego area", state: "CA", lat: 33.0, lon: -117.15, count: 1, spread: 0.1 },
  { label: "Seattle area", state: "WA", lat: 47.6, lon: -122.15, count: 3, spread: 0.15 },
  { label: "Denver area", state: "CO", lat: 39.6, lon: -104.85, count: 1, spread: 0.1 },
  { label: "Chicago area", state: "IL", lat: 42.0, lon: -87.95, count: 6, spread: 0.3 },
  { label: "Detroit and Ann Arbor", state: "MI", lat: 42.4, lon: -83.55, count: 3, spread: 0.3 },
  { label: "Cincinnati area", state: "OH", lat: 39.15, lon: -84.4, count: 1, spread: 0.1 },
  { label: "Minneapolis area", state: "MN", lat: 44.95, lon: -93.45, count: 2, spread: 0.15 },
  { label: "St. Louis area", state: "MO", lat: 38.65, lon: -90.35, count: 1, spread: 0.1 },
];

export const PARTNER_TOTAL = PARTNER_REGIONS.reduce((n, r) => n + r.count, 0);

export interface PartnerDot {
  /** The area, or the district's name when it agreed to be named. */
  label: string;
  /** True when the label is a district that agreed to be named. */
  named: boolean;
  lat: number;
  lon: number;
  /** The dot's place in its area: 0 is the area's center dot, drawn larger. */
  index: number;
}

/** A small fixed pseudo-random sequence, so the dots sit in the same places on every render. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every dot: a cluster close to each area's center, and the rest scattered further out. */
export function partnerDots(regions: readonly PartnerRegion[] = PARTNER_REGIONS): PartnerDot[] {
  const dots: PartnerDot[] = [];
  regions.forEach((r, ri) => {
    const rand = mulberry32(1013 + ri * 7919);
    for (let i = 0; i < r.count; i++) {
      // About two in three sit close in; the rest scatter to the edge of the area.
      const reach = i === 0 ? 0 : i % 3 === 2 ? 0.6 + rand() * 0.4 : 0.15 + rand() * 0.4;
      const angle = rand() * Math.PI * 2;
      const name = r.named?.[i];
      dots.push({
        label: name ?? r.label,
        named: !!name,
        lat: r.lat + Math.sin(angle) * r.spread * reach,
        // Longitude degrees shrink with latitude; widen them so clusters stay round.
        lon: r.lon + (Math.cos(angle) * r.spread * reach) / Math.cos((r.lat * Math.PI) / 180),
        index: i,
      });
    }
  });
  return dots;
}

/** The map is off unless PARTNER_MAP=on, which waits on Zakaria's OK. */
export function partnerMapOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.PARTNER_MAP === "on";
}
