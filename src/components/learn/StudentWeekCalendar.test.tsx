// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentCalendarData } from "@/lib/learn/week-calendar";
import StudentWeekCalendar from "./StudentWeekCalendar";

const mock = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mock.refresh }) }));

const data: StudentCalendarData = {
  sessions: {
    state: "ready",
    items: [
      {
        id: "booking-1",
        plan_tier: "group",
        scheduled_start: "2026-10-08T15:00:00Z",
        scheduled_end: "2026-10-08T16:00:00Z",
      },
    ],
  },
  cohortHomework: {
    state: "ready",
    items: [
      {
        id: "post-1",
        title: "Reading questions",
        body: "Read the assigned passage.",
        assigned_at: "2026-10-07T12:00:00Z",
        due_at: "2026-10-10T15:00:00Z",
      },
    ],
  },
  practiceAssignments: { state: "ready", items: [] },
};

beforeEach(() => vi.clearAllMocks());

describe("student study week", () => {
  it("shows saved sessions and tutor posts while keeping practice outside dated tasks", async () => {
    const user = userEvent.setup();
    render(
      <StudentWeekCalendar
        data={data}
        asOf="2026-10-08T14:00:00Z"
        preferredTimeZone="America/Chicago"
        next={{
          title: "Linear equations",
          detail: "An unfinished quiz is saved.",
          href: "/learn/earlier/math?resume=saved-id",
          label: "Continue practice",
        }}
      />
    );
    expect(screen.getByText("Seminar session")).toBeTruthy();
    expect(screen.getByText("Reading questions")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Homework for booked sessions" })).toBeTruthy();
    expect(screen.getByText(/Practice posted separately stays in the calendar above/)).toBeTruthy();
    expect(screen.getByText(/America\/Chicago/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Continue practice/ }).getAttribute("href")).toBe(
      "/learn/earlier/math?resume=saved-id"
    );
    expect(screen.getByRole("link", { name: /Manage next session/ }).getAttribute("href")).toBe(
      "/dashboard/student/schedule"
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Refresh week" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh week" }));
    expect(mock.refresh).toHaveBeenCalledOnce();
  });

  it("uses incomplete-view wording when one source fails", () => {
    render(
      <StudentWeekCalendar
        data={{
          sessions: { state: "ready", items: [] },
          cohortHomework: { state: "ready", items: [] },
          practiceAssignments: { state: "unavailable", items: [] },
        }}
        asOf="2026-10-08T14:00:00Z"
        preferredTimeZone="UTC"
        next={null}
      />
    );
    expect(screen.getByRole("status").textContent).toMatch(/assigned practice could not load/i);
    expect(screen.getByText("Nothing scheduled or due today is available to show.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Explore practice/ }).getAttribute("href")).toBe(
      "/learn"
    );
    expect(screen.queryByText("Nothing scheduled or due today.")).toBeNull();
  });
});
