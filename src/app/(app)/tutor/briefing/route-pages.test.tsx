// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/educator-briefing/server", () => ({
  readStudentBriefing: vi.fn(),
  readEducatorPracticeReview: vi.fn(),
}));
vi.mock("@/lib/educator-briefing/daily", () => ({ readDailyBriefing: vi.fn() }));
vi.mock("@/lib/educator-briefing/access", () => ({
  BriefingAccessError: class extends Error {},
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

import { notFound } from "next/navigation";
import { BriefingAccessError } from "@/lib/educator-briefing/access";
import { readStudentBriefing, readEducatorPracticeReview } from "@/lib/educator-briefing/server";
import { readDailyBriefing } from "@/lib/educator-briefing/daily";
import { sessionId, bookingId } from "@/lib/educator-briefing/fixtures.test-helper";
import DailyBriefingPage from "./page";
import StudentBriefingPage from "../[studentId]/briefing/page";
import EducatorPracticeReviewPage from "../[studentId]/practice/[sessionId]/page";

beforeEach(() => vi.resetAllMocks());

describe("educator briefing routes", () => {
  const studentParams = { params: Promise.resolve({ studentId: "student-a" }) };
  const reviewParams = { params: Promise.resolve({ studentId: "student-a", sessionId }) };

  it.each(["briefing", "review"])("hides a denied %s behind not-found", async (kind) => {
    vi.mocked(readStudentBriefing).mockRejectedValue(new BriefingAccessError("PRIVATE_DENIAL"));
    vi.mocked(readEducatorPracticeReview).mockRejectedValue(
      new BriefingAccessError("PRIVATE_DENIAL")
    );
    await expect(
      kind === "briefing"
        ? StudentBriefingPage(studentParams)
        : EducatorPracticeReviewPage(reviewParams)
    ).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it.each(["briefing", "review"])(
    "does not turn a missing %s into an empty history",
    async (kind) => {
      vi.mocked(readStudentBriefing).mockResolvedValue(null);
      vi.mocked(readEducatorPracticeReview).mockResolvedValue(null);
      await expect(
        kind === "briefing"
          ? StudentBriefingPage(studentParams)
          : EducatorPracticeReviewPage(reviewParams)
      ).rejects.toThrow("NOT_FOUND");
    }
  );

  it.each(["briefing", "review"])(
    "shows a failed %s read without private error text",
    async (kind) => {
      vi.mocked(readStudentBriefing).mockRejectedValue(new Error("PRIVATE_DB_ERROR"));
      vi.mocked(readEducatorPracticeReview).mockRejectedValue(new Error("PRIVATE_DB_ERROR"));
      render(
        kind === "briefing"
          ? await StudentBriefingPage(studentParams)
          : await EducatorPracticeReviewPage(reviewParams)
      );
      expect(screen.getByRole("status")).toHaveTextContent("briefing is unavailable");
      expect(screen.queryByText(/PRIVATE_DB_ERROR|No saved skill-practice/)).toBeNull();
      expect(notFound).not.toHaveBeenCalled();
    }
  );

  it("carries the requested day and exact student destination into the daily route", async () => {
    vi.mocked(readDailyBriefing).mockResolvedValue({
      day: "2026-10-09",
      timeZone: "America/Chicago",
      sessions: [
        {
          bookingId,
          studentClerkId: "student-a",
          studentLabel: "Synthetic student",
          scheduledStart: "2026-10-09T15:00:00Z",
          scheduledEnd: "2026-10-09T16:00:00Z",
        },
      ],
    });
    render(await DailyBriefingPage({ searchParams: Promise.resolve({ date: "2026-10-09" }) }));
    expect(readDailyBriefing).toHaveBeenCalledWith("2026-10-09");
    expect(screen.getByRole("link", { name: "View practice briefing" })).toHaveAttribute(
      "href",
      "/tutor/student-a/briefing"
    );
  });

  it("does not present a failed daily read as an empty schedule", async () => {
    vi.mocked(readDailyBriefing).mockRejectedValue(new Error("PRIVATE_BOOKING_ERROR"));
    render(await DailyBriefingPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("status")).toHaveTextContent("briefing is unavailable");
    expect(screen.queryByText(/PRIVATE_BOOKING_ERROR|No scheduled sessions/)).toBeNull();
  });
});
