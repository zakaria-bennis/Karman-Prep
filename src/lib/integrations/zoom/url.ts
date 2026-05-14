// ============================================================
// Zoom URL helpers.
// ============================================================

/** Extract the numeric meeting id from a Zoom join URL like
 *  `https://us02web.zoom.us/j/12345678901?pwd=...`. Returns null
 *  if the URL doesn't look like a Zoom join URL. */
export function extractZoomMeetingId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/zoom\.us\/[a-z]+\/(\d+)/i);
  return m ? m[1] : null;
}
