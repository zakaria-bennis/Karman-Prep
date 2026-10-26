import { describe, expect, it } from "vitest";
import { calendarFeedLinks } from "./links";

const token = "abcDEF123_-abcDEF123_-abcDEF123_-abcDEF1234";

describe("calendarFeedLinks", () => {
  it("builds https, webcal, Google and Outlook links for one token", () => {
    const links = calendarFeedLinks("https://karmanprep.com", token);
    expect(links.feedUrl).toBe(`https://karmanprep.com/api/calendar/feed/${token}.ics`);
    expect(links.webcalUrl).toBe(`webcal://karmanprep.com/api/calendar/feed/${token}.ics`);
    expect(links.googleUrl).toBe(
      `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(links.webcalUrl)}`
    );
    expect(new URL(links.outlookUrl).searchParams.get("url")).toBe(links.feedUrl);
  });

  it("ignores any path on the site URL and keeps local ports", () => {
    const links = calendarFeedLinks("http://localhost:3000/some/page", token);
    expect(links.feedUrl).toBe(`http://localhost:3000/api/calendar/feed/${token}.ics`);
    expect(links.webcalUrl).toBe(`webcal://localhost:3000/api/calendar/feed/${token}.ics`);
  });
});
