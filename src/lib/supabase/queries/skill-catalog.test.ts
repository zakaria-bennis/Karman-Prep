import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLegacyLearningHistory } from "./skill-catalog";

const mocks = vi.hoisted(() => ({ eq: vi.fn(), select: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({ from: mocks.from }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
});

describe("read-only catalog history", () => {
  it("preserves individual IDs, unknown records, scores and statuses without merging or writing", async () => {
    const rows = [
      { node_id: "rw-51", status: "mastered", score: 90, attempts: 3, watch_percentage: 70 },
      {
        node_id: "rw-59",
        status: "partially_complete",
        score: 80,
        attempts: 1,
        watch_percentage: 0,
      },
      {
        node_id: "old-unlisted",
        status: "historic_status",
        score: null,
        attempts: null,
        watch_percentage: null,
      },
    ];
    const original = JSON.stringify(rows);
    mocks.eq.mockResolvedValue({ data: rows, error: null });
    expect(await fetchLegacyLearningHistory("dev_seed_student_mid")).toBe(rows);
    expect(JSON.stringify(rows)).toBe(original);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "dev_seed_student_mid");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a failed history read from no earlier learning", async () => {
    mocks.eq.mockResolvedValue({ data: null, error: { message: "not available" } });
    await expect(fetchLegacyLearningHistory("dev_seed_student_mid")).rejects.toThrow(
      "history could not be loaded"
    );
    mocks.eq.mockResolvedValue({ data: [], error: null });
    expect(await fetchLegacyLearningHistory("dev_seed_student_mid")).toEqual([]);
  });
});
