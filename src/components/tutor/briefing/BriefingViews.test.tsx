// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BriefingUnavailable, DailyBriefingView, StudentBriefingView } from "./BriefingViews";
import {
  saved,
  response,
  sessionId,
  assignmentId,
} from "@/lib/educator-briefing/fixtures.test-helper";
import { presentSavedSession, practiceSummary } from "@/lib/educator-briefing/saved-practice";
afterEach(cleanup);
describe("briefing presentation", () => {
  it("separates unavailable from empty", () => {
    const { unmount } = render(<BriefingUnavailable />);
    expect(screen.getByRole("status").textContent).toContain("unavailable");
    expect(screen.queryByText("No saved skill-practice sessions were found.")).toBeNull();
    unmount();
    render(
      <StudentBriefingView
        briefing={{
          studentClerkId: "student-a",
          studentEmail: "s@example.test",
          studentTimeZone: null,
          attempts: [],
          hasMore: false,
        }}
      />
    );
    expect(screen.getByText("No saved skill-practice sessions were found.")).toBeTruthy();
  });
  it("links exact original miss and preserves unknown completed scores", () => {
    render(
      <StudentBriefingView
        briefing={{
          studentClerkId: "student-a",
          studentEmail: "s@example.test",
          studentTimeZone: "America/Chicago",
          hasMore: false,
          attempts: [
            {
              ...practiceSummary(presentSavedSession(saved({ score: null }), [response()])),
              assignment: { title: "Synthetic homework", status: "active", dueAt: null },
            },
          ],
        }}
      />
    );
    expect(screen.getByText(/Saved result unavailable/)).toBeTruthy();
    expect(screen.getByText(/not yet linked/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Review question 1 as student" }).getAttribute("href")
    ).toBe(`/tutor/student-a/practice/${sessionId}#question-1`);
    expect(screen.queryByText(/8 a.m.|11:59|Overdue|Late assignment/)).toBeNull();
  });
  it("does not relabel an unavailable assignment as independent practice", () => {
    render(
      <StudentBriefingView
        briefing={{
          studentClerkId: "student-a",
          studentEmail: "s@example.test",
          studentTimeZone: null,
          hasMore: true,
          attempts: [
            {
              ...practiceSummary(
                presentSavedSession(saved({ assignment_id: assignmentId }), [response()])
              ),
              assignment: null,
            },
          ],
        }}
      />
    );
    expect(screen.getByText("Assigned practice · details unavailable")).toBeTruthy();
    expect(screen.getByText(/Older skill-practice/)).toBeTruthy();
  });
  it("shows the educator timezone and reachable student link", () => {
    render(
      <DailyBriefingView
        briefing={{
          day: "2026-10-09",
          timeZone: "Asia/Kathmandu",
          sessions: [
            {
              bookingId: "one",
              studentClerkId: "student-a",
              studentLabel: "Synthetic Student",
              scheduledStart: "2026-10-09T03:00:00Z",
              scheduledEnd: "2026-10-09T04:00:00Z",
            },
          ],
        }}
      />
    );
    expect(screen.getByText("Times in Asia/Kathmandu")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View practice briefing" }).getAttribute("href")).toBe(
      "/tutor/student-a/briefing"
    );
  });
});
