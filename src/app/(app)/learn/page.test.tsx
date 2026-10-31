// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  effective: vi.fn(),
  legacy: vi.fn(),
  attempts: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mock.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({ resolveEffectiveClerkId: mock.effective }));
vi.mock("@/lib/supabase/queries/skill-catalog", () => ({
  fetchLegacyLearningHistory: mock.legacy,
}));
vi.mock("@/lib/supabase/queries/quiz/attempts", () => ({
  fetchAllAttemptsForStudent: mock.attempts,
}));
vi.mock("@/lib/catalog-practice/history-server", () => ({
  loadOwnCatalogPracticeHistory: mock.catalog,
}));
vi.mock("@/components/learn/LearnDashboard", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import LearnPage from "./page";
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ userId: "owner" });
  mock.effective.mockResolvedValue({ clerkId: "owner" });
  mock.legacy.mockResolvedValue([]);
  mock.attempts.mockResolvedValue([]);
  mock.catalog.mockResolvedValue({ status: "ready", sessions: [] });
});
describe("learn landing saved practice wiring", () => {
  it("uses the current skill session alongside earlier history", async () => {
    const href =
      "/learn/practice/rw-skill-central-ideas-and-details?session=00000000-0000-4000-8000-000000000020";
    mock.catalog.mockResolvedValue({
      status: "ready",
      sessions: [
        {
          id: "00000000-0000-4000-8000-000000000020",
          skillId: "rw-skill-central-ideas-and-details",
          title: "Central Ideas and Details",
          href,
          startedAt: "2026-10-09T08:00:00Z",
          completedAt: null,
          score: null,
        },
      ],
    });
    const page = await LearnPage();
    expect(page.props.dashboard.next).toMatchObject({ href, kind: "skill" });
    expect(mock.catalog).toHaveBeenCalledExactlyOnceWith();
  });
  it("redirects anonymous requests before reading any history", async () => {
    mock.auth.mockResolvedValue({ userId: null });
    await expect(LearnPage()).rejects.toThrow("redirect:/auth/sign-in");
    expect(mock.catalog).not.toHaveBeenCalled();
    expect(mock.legacy).not.toHaveBeenCalled();
  });
});
