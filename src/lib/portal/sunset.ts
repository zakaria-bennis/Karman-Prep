// When the sun sets where a student is, worked out from their time zone alone (the portal does not
// ask for a location). A zone it knows is placed at one of its big cities; any other is placed on its
// own meridian at a middle latitude. That puts sunset within about half an hour of the real one
// across the continental United States, which is close enough to decide when "late" begins.

const PLACES: Record<string, [lat: number, lon: number]> = {
  "America/New_York": [40.7, -74],
  "America/Detroit": [42.3, -83],
  "America/Chicago": [41.9, -87.6],
  "America/Denver": [39.7, -105],
  "America/Phoenix": [33.4, -112.1],
  "America/Los_Angeles": [34.1, -118.2],
  "America/Anchorage": [61.2, -149.9],
  "Pacific/Honolulu": [21.3, -157.9],
};

const RAD = Math.PI / 180;

/** The place a time zone stands for: its city above, or its winter meridian at 38° north. */
function placeOf(zone: string, year: number): [number, number] {
  if (PLACES[zone]) return PLACES[zone];
  const winter = new Date(Date.UTC(year, 0, 1, 12));
  const local = new Date(winter.toLocaleString("en-US", { timeZone: zone }));
  const utc = new Date(winter.toLocaleString("en-US", { timeZone: "UTC" }));
  return [38, ((local.getTime() - utc.getTime()) / 3_600_000) * 15];
}

/** Sunset on the day of `now` in `zone`, as a moment in time. Null where the sun does not set. */
export function sunsetAt(now: Date, zone: string): Date | null {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(now); // "2026-11-25"
  const [y, m, d] = day.split("-").map(Number);
  const [lat, lon] = placeOf(zone, y);
  const n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const tilt = -23.44 * Math.cos(((2 * Math.PI) / 365) * (n + 10)) * RAD;
  const b = ((2 * Math.PI) / 364) * (n - 81);
  const equation = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutes
  const cos =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(tilt)) /
    (Math.cos(lat * RAD) * Math.cos(tilt));
  if (cos < -1 || cos > 1) return null;
  const hours = 12 - lon / 15 - equation / 60 + Math.acos(cos) / RAD / 15; // UTC, that day
  return new Date(Date.UTC(y, m - 1, d) + hours * 3_600_000);
}

/** Late: from two hours after sunset until 4 in the morning, in the student's own zone. */
export function isLate(now: Date, zone: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(
      now
    )
  );
  if (hour < 4) return true;
  const sunset = sunsetAt(now, zone);
  // where the sun does not set, late is simply the late evening
  if (!sunset) return hour >= 22;
  return now.getTime() >= sunset.getTime() + 2 * 3_600_000;
}
