// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  getCalendarFeedLinks: vi.fn(),
  resetCalendarFeedLink: vi.fn(),
}));
vi.mock("@/app/dashboard/calendar-feed-actions", () => actions);

import { CalendarSubscribe } from "./CalendarSubscribe";
import { calendarFeedLinks } from "@/lib/calendar-feed/links";

const first = calendarFeedLinks("https://karmanprep.com", "a".repeat(43));
const second = calendarFeedLinks("https://karmanprep.com", "b".repeat(43));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CalendarSubscribe", () => {
  it("creates no link until the student opens the panel", () => {
    render(<CalendarSubscribe audience="student" />);
    expect(actions.getCalendarFeedLinks).not.toHaveBeenCalled();
    expect(screen.queryByText("Apple Calendar")).toBeNull();
  });

  it("shows Apple, Google and Outlook links and copies the address", async () => {
    actions.getCalendarFeedLinks.mockResolvedValue(first);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CalendarSubscribe audience="student" />);

    fireEvent.click(screen.getByRole("button", { name: "Add to your calendar" }));
    const apple = await screen.findByRole("link", { name: "Apple Calendar" });
    expect(apple.getAttribute("href")).toBe(first.webcalUrl);
    expect(screen.getByRole("link", { name: "Google Calendar" }).getAttribute("href")).toBe(
      first.googleUrl
    );
    expect(screen.getByRole("link", { name: "Outlook" }).getAttribute("href")).toBe(
      first.outlookUrl
    );
    expect((screen.getByLabelText("Calendar link") as HTMLInputElement).value).toBe(first.feedUrl);

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(first.feedUrl));
    expect(await screen.findByText("Link copied.")).toBeTruthy();
  });

  it("asks before resetting, then swaps in the new link", async () => {
    actions.getCalendarFeedLinks.mockResolvedValue(first);
    actions.resetCalendarFeedLink.mockResolvedValue(second);
    render(<CalendarSubscribe audience="parent" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to your calendar" }));
    await screen.findByRole("link", { name: "Apple Calendar" });

    fireEvent.click(screen.getByRole("button", { name: "Reset link" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(actions.resetCalendarFeedLink).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reset link" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, reset" }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Apple Calendar" }).getAttribute("href")).toBe(
        second.webcalUrl
      )
    );
    expect(actions.resetCalendarFeedLink).toHaveBeenCalledWith({ confirm: true });
    expect(screen.getByText(/Calendars using the old link will stop updating/)).toBeTruthy();
  });

  it("explains when the link cannot load", async () => {
    actions.getCalendarFeedLinks.mockRejectedValue(new Error("boom"));
    render(<CalendarSubscribe audience="student" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to your calendar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not load");
  });
});
