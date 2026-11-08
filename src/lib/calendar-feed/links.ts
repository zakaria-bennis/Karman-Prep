/** Subscribe links for one feed token. Pure, so the exact URLs are unit-tested. */
export interface CalendarFeedLinks {
  /** https:// address, for copying into any calendar app. */
  feedUrl: string;
  /** webcal:// address: opens Apple Calendar (and Outlook on desktop) directly. */
  webcalUrl: string;
  googleUrl: string;
  outlookUrl: string;
}

export function calendarFeedLinks(siteUrl: string, token: string): CalendarFeedLinks {
  const base = new URL(siteUrl);
  const feedUrl = new URL(`/api/calendar/feed/${encodeURIComponent(token)}.ics`, base).toString();
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    feedUrl,
    webcalUrl,
    googleUrl: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`,
    outlookUrl: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=Karman`,
  };
}
