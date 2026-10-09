// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  role: vi.fn(),
  effective: vi.fn(),
  from: vi.fn(),
  calls: [] as unknown[][],
  results: [] as { data: unknown; error: unknown }[],
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mocks.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({
  fetchUserRole: mocks.role,
  resolveEffectiveClerkId: mocks.effective,
}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
import { loadOwnCatalogPracticeHistory } from "./history-server";
const id = "00000000-0000-4000-8000-000000000001";
const row = {
  id,
  student_id: "student-owner",
  skill_id: "rw-skill-central-ideas-and-details",
  started_at: "2026-10-09T08:00:00Z",
  completed_at: null,
  score: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  mocks.results = [
    { data: [row], error: null },
    { data: [], error: null },
  ];
  mocks.auth.mockResolvedValue({ userId: "student-owner" });
  mocks.role.mockResolvedValue("student");
  mocks.effective.mockResolvedValue({ clerkId: "student-owner", isImpersonating: false });
  mocks.from.mockImplementation((table) => {
    mocks.calls.push(["from", table]);
    const q: Record<string, unknown> = {};
    for (const name of ["select", "eq", "is", "not", "order"])
      q[name] = (...args: unknown[]) => {
        mocks.calls.push([name, ...args]);
        return q;
      };
    q.limit = (count: number) => {
      mocks.calls.push(["limit", count]);
      return Promise.resolve(mocks.results.shift());
    };
    return q;
  });
});
describe("own saved skill practice metadata", () => {
  it("finds unfinished sessions separately from recent completed work and returns answer-free links", async () => {
    mocks.results = [
      { data: [{ ...row, snapshots: [{ answer: "secret" }] }], error: null },
      {
        data: [
          {
            ...row,
            id: "00000000-0000-4000-8000-000000000002",
            completed_at: "2026-10-09T08:10:00Z",
            score: 70,
          },
        ],
        error: null,
      },
    ];
    const result = await loadOwnCatalogPracticeHistory();
    expect(result.status).toBe("ready");
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]).toMatchObject({
      id,
      title: "Central Ideas and Details",
      href: `/learn/practice/${row.skill_id}?session=${id}`,
    });
    expect(mocks.calls.filter((c) => c[0] === "eq")).toEqual([
      ["eq", "student_id", "student-owner"],
      ["eq", "student_id", "student-owner"],
    ]);
    expect(mocks.calls).toContainEqual(["is", "completed_at", null]);
    expect(mocks.calls).toContainEqual(["not", "completed_at", "is", null]);
    expect(mocks.calls.filter((c) => c[0] === "select")).toEqual(
      Array(2).fill(["select", "id,student_id,skill_id,started_at,completed_at,score"])
    );
    expect(JSON.stringify(result)).not.toMatch(/snapshots|student_id|secret|answer|source/);
  });
  it.each([null, "parent", "tutor"])("never reads session data for %s", async (role) => {
    mocks.role.mockResolvedValue(role);
    expect(await loadOwnCatalogPracticeHistory()).toEqual({ status: "unavailable", sessions: [] });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("does not read records before sign-in", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await loadOwnCatalogPracticeHistory();
    expect(mocks.role).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("keeps impersonation outside the existing own-account practice lane", async () => {
    mocks.role.mockResolvedValue("admin");
    mocks.effective.mockResolvedValue({ clerkId: "preview-student", isImpersonating: true });
    expect(await loadOwnCatalogPracticeHistory()).toEqual({ status: "preview", sessions: [] });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each(["query", "owner", "shape"])(
    "shows unavailability instead of empty history after a %s failure",
    async (kind) => {
      if (kind === "query")
        mocks.results[1] = { data: null, error: { message: "private database details" } };
      if (kind === "owner") mocks.results[0].data = [{ ...row, student_id: "another-student" }];
      if (kind === "shape") mocks.results[0].data = [{ ...row, score: 101 }];
      expect(await loadOwnCatalogPracticeHistory()).toEqual({
        status: "unavailable",
        sessions: [],
      });
    }
  );
  it("shows unavailability rather than silently hiding an unknown skill", async () => {
    mocks.results[0].data = [{ ...row, skill_id: "removed" }];
    expect(await loadOwnCatalogPracticeHistory()).toEqual({ status: "unavailable", sessions: [] });
  });
  it("lists a racing completion once, using its completed state", async () => {
    mocks.results = [
      { data: [row], error: null },
      {
        data: [{ ...row, completed_at: "2026-10-09T08:10:00Z", score: 70 }],
        error: null,
      },
    ];
    const history = await loadOwnCatalogPracticeHistory();
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0]).toMatchObject({ completedAt: "2026-10-09T08:10:00Z", score: 70 });
  });
});
