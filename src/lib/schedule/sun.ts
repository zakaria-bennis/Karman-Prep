// When the sun rises and sets where a student is, near enough to choose a small picture by: a
// rising sun, a sun, a setting sun or a moon beside each session time (founder, 2026-11-17: "the
// icon that's next to the time should adjust with the estimated sunset time and sunrise time of the
// user"). No location is asked for: the place is guessed from the device's time zone.

export interface Place {
  lat: number;
  lon: number;
}

/** A city that stands for each common time zone. */
const ZONES: Record<string, Place> = {
  "America/New_York": { lat: 40.7, lon: -74.0 },
  "America/Detroit": { lat: 42.3, lon: -83.0 },
  "America/Chicago": { lat: 41.9, lon: -87.6 },
  "America/Denver": { lat: 39.7, lon: -105.0 },
  "America/Phoenix": { lat: 33.4, lon: -112.1 },
  "America/Los_Angeles": { lat: 34.1, lon: -118.2 },
  "America/Anchorage": { lat: 61.2, lon: -149.9 },
  "Pacific/Honolulu": { lat: 21.3, lon: -157.9 },
};

/** Where a device probably is: its time zone's city, or failing that the middle latitudes at the
 *  longitude its clock implies. `offsetMinutes` is Date#getTimezoneOffset (minutes behind UTC). */
export function guessPlace(timeZone: string | undefined, offsetMinutes: number): Place {
  return (timeZone && ZONES[timeZone]) || { lat: 38, lon: -offsetMinutes / 4 };
}

const RAD = Math.PI / 180;

/** Sunrise and sunset (in milliseconds) for the calendar day that `year, month, day` name, at a
 *  place. The standard short solar formulas: good to a few minutes, which is all a picture needs. */
export function sunTimes(year: number, month: number, day: number, place: Place) {
  const start = Date.UTC(year, month, day);
  const n = Math.floor((start - Date.UTC(year, 0, 0)) / 86_400_000);
  const g = ((2 * Math.PI) / 365) * (n - 1 + 0.5);
  const eq =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const lat = place.lat * RAD;
  const cos =
    Math.cos(90.833 * RAD) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
  // the far north in midsummer or midwinter: the sun does not set, or does not rise
  const half = Math.acos(Math.max(-1, Math.min(1, cos))) / RAD;
  const minutes = (hourAngle: number) => 720 - 4 * (place.lon + hourAngle) - eq;
  return { rise: start + minutes(half) * 60_000, set: start + minutes(-half) * 60_000 };
}

export type Sky = "night" | "sunrise" | "day" | "sunset";
/** How long either side of sunrise and sunset still counts as it. */
const GLOW = 40 * 60_000;

/** What the sky is doing at a moment, where the student is. */
export function skyAt(t: number, place: Place): Sky {
  const d = new Date(t);
  const { rise, set } = sunTimes(d.getFullYear(), d.getMonth(), d.getDate(), place);
  if (Math.abs(t - rise) <= GLOW) return "sunrise";
  if (Math.abs(t - set) <= GLOW) return "sunset";
  return t > rise && t < set ? "day" : "night";
}
