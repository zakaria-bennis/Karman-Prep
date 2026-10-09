// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  effective: vi.fn(),
  attempts: vi.fn(),
  review: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mocks.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({ resolveEffectiveClerkId: mocks.effective }));
vi.mock("@/lib/supabase/queries/quiz/attempts", () => ({
  fetchAllAttemptsForStudent: mocks.attempts,
}));
vi.mock("@/lib/quiz-review", () => ({ fetchCompletedQuizReview: mocks.review }));
vi.mock("@/lib/catalog-practice/history-server", () => ({
  loadOwnCatalogPracticeHistory: mocks.catalog,
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/learn/QuizReviewQuestion", () => ({
  default: () => <div>Reviewed question content</div>,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
import HistoryPage from "./page";
import ReviewPage from "./[attemptId]/page";
const id = "d07d4da8-1187-4e90-897a-78a5135f4dd6";
const input = { params: Promise.resolve({ attemptId: id }) };
const attempt = {
  id,
  node_id: "ma-00",
  attempt_number: 1,
  score: 50,
  questions_correct: 1,
  questions_answered: 2,
  started_at: "2026-10-06T12:00:00Z",
  completed_at: "2026-10-06T12:03:00Z",
};
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "real-user" });
  mocks.effective.mockResolvedValue({ clerkId: "student-owner" });
  mocks.attempts.mockResolvedValue([]);
  mocks.review.mockResolvedValue(null);
  mocks.catalog.mockResolvedValue({ status: "ready", sessions: [] });
});
describe("student quiz history pages", () => {
  it("offers practice instead of fabricated history for a new student", async () => {
    render(await HistoryPage());
    expect(mocks.attempts).toHaveBeenCalledExactlyOnceWith("student-owner");
    expect(screen.getByRole("link", { name: /Choose a skill/ }).getAttribute("href")).toBe(
      "/learn"
    );
  });
  it("links completed reviews and sends incomplete attempts back to practice", async () => {
    mocks.attempts.mockResolvedValue([attempt, { ...attempt, id: "active", completed_at: null }]);
    render(await HistoryPage());
    expect(screen.getAllByRole("link", { name: "Review answers" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Review answers" }).getAttribute("href")).toBe(
      `/dashboard/student/quizzes/${id}`
    );
    expect(screen.getByRole("link", { name: "Continue in practice" }).getAttribute("href")).toBe(
      "/learn/earlier/math?resume=active"
    );
  });
  it("lists saved current skill practice when earlier quiz history is empty", async () => {
    const href = `/learn/practice/rw-skill-central-ideas-and-details?session=${id}`;
    mocks.catalog.mockResolvedValue({
      status: "ready",
      sessions: [
        {
          id,
          skillId: "rw-skill-central-ideas-and-details",
          title: "Central Ideas and Details",
          href,
          startedAt: attempt.started_at,
          completedAt: null,
          score: null,
        },
      ],
    });
    render(await HistoryPage());
    expect(screen.getByRole("link", { name: "Continue skill practice" })).toHaveAttribute(
      "href",
      href
    );
    expect(screen.queryByText(/No quizzes yet/)).toBeNull();
  });
  it("shows saved current-session scores and the existing guarded review destination", async () => {
    const href = `/learn/practice/rw-skill-central-ideas-and-details?session=${id}`;
    mocks.catalog.mockResolvedValue({
      status: "ready",
      sessions: [
        {
          id,
          skillId: "rw-skill-central-ideas-and-details",
          title: "Central Ideas and Details",
          href,
          startedAt: attempt.started_at,
          completedAt: attempt.completed_at,
          score: 50,
        },
      ],
    });
    render(await HistoryPage());
    expect(screen.getByText("50% · this practice only")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review skill practice" })).toHaveAttribute(
      "href",
      href
    );
  });
  it("shows an honest failure state while keeping earlier quiz history available", async () => {
    mocks.catalog.mockResolvedValue({ status: "unavailable", sessions: [] });
    mocks.attempts.mockResolvedValue([attempt]);
    render(await HistoryPage());
    expect(screen.getByRole("status")).toHaveTextContent("could not load");
    expect(screen.getByRole("link", { name: "Review answers" })).toBeTruthy();
    expect(screen.queryByText(/No quizzes yet/)).toBeNull();
  });
  it("returns 404 for unavailable reviews without rendering answer content", async () => {
    await expect(ReviewPage(input)).rejects.toThrow("not-found");
    expect(mocks.review).toHaveBeenCalledExactlyOnceWith("student-owner", id);
  });
  it("preserves saved results and explains withdrawn content and version changes", async () => {
    mocks.review.mockResolvedValue({
      attempt,
      items: [{ response: { id: "r1", student_answer: "A", is_correct: true }, question: null }],
    });
    render(await ReviewPage(input));
    expect(screen.getByText(/Correct when answered/)).toBeTruthy();
    expect(screen.getByText(/no longer available/)).toBeTruthy();
    expect(screen.getByText(/may have changed/)).toBeTruthy();
    expect(screen.queryByText("Reviewed question content")).toBeNull();
  });
  it.each(["index", "detail"])(
    "redirects anonymous visitors from %s before reading records",
    async (route) => {
      mocks.auth.mockResolvedValue({ userId: null });
      await expect(route === "index" ? HistoryPage() : ReviewPage(input)).rejects.toThrow(
        "redirect:/auth/sign-in"
      );
      expect(mocks.attempts).not.toHaveBeenCalled();
      expect(mocks.review).not.toHaveBeenCalled();
      expect(mocks.catalog).not.toHaveBeenCalled();
    }
  );
});
