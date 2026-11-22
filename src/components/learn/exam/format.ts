// Times and names for the exam screens, in the student's own time zone. Pure, safe on the client.

/** "Saturday, 6:00 am" in `zone`. */
export function dayTime(iso: string, zone: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(d)
    .replace(" AM", " am")
    .replace(" PM", " pm");
  return `${day}, ${time}`;
}

/** "Central Standard Time", or the zone's id when the runtime has no long name. */
export function zoneName(zone: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "long" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? zone;
  } catch {
    return zone;
  }
}

/** 3 days 4 h, 5 h 12 min, 12 min, or 0:42 for under a minute. */
export function until(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days) return `${days} day${days === 1 ? "" : "s"} ${hours} h`;
  if (hours) return `${hours} h ${minutes} min`;
  if (minutes) return `${minutes} min`;
  return `0:${String(s).padStart(2, "0")}`;
}

/** 9:58 */
export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
};
