/*
 * Sessions and live classes are joined from the account (founder, 2026-11-08). The Join button
 * appears 10 minutes before a session starts and stays until it ends.
 */
export const JOIN_EARLY_MINUTES = 10;

export function joinOpen(startsAt: string, endsAt: string, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= Date.parse(startsAt) - JOIN_EARLY_MINUTES * 60_000 && t <= Date.parse(endsAt);
}

/** Only real Zoom meeting links are offered (https, a zoom.us host). */
export function safeZoomUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const zoomHost = u.hostname === "zoom.us" || u.hostname.endsWith(".zoom.us");
    return u.protocol === "https:" && zoomHost ? u.toString() : null;
  } catch {
    return null;
  }
}
