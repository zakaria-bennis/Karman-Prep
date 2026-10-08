// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LiveLearning from "./LiveLearning";
import type { StudentCalendarData } from "@/lib/learn/week-calendar";

const emptyCalendar: StudentCalendarData = {
  sessions: { state: "ready", items: [] },
  cohortHomework: { state: "ready", items: [] },
  practiceAssignments: { state: "ready", items: [] },
};

describe("LiveLearning", () => {
  it("shows honest unconfigured states without a booking or registration claim", () => {
    render(<LiveLearning />);
    expect(screen.getByText("No office hours are scheduled yet.")).toBeTruthy();
    expect(screen.getByText("No workshops are scheduled yet.")).toBeTruthy();
    expect(screen.queryByText(/register/i)).toBeNull();
  });

  it("keeps personal bookings separate from the unconfigured live programs", () => {
    render(
      <LiveLearning
        asOf="2026-10-08T00:00:00Z"
        preferredTimeZone="UTC"
        calendar={{
          ...emptyCalendar,
          sessions: {
            state: "ready",
            items: [
              {
                id: "booking-1",
                plan_tier: "private",
                scheduled_start: "2026-10-09T14:00:00Z",
                scheduled_end: "2026-10-09T15:00:00Z",
              },
            ],
          },
        }}
      />
    );
    expect(screen.getByText("Your booked tutor sessions")).toBeTruthy();
    expect(screen.getByText("Tutor session")).toBeTruthy();
    expect(screen.getByText("No workshops are scheduled yet.")).toBeTruthy();
  });
});
