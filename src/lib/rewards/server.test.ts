// Opening a box spends exactly one box's tokens, and never twice. The spend itself happens in the
// database under a per-student lock (open_reward_box); these tests check what the server sends it
// and, against a local database when one is configured, that parallel taps cannot double-spend.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESSORY_IDS, BOX_BONUS_TOKENS, BOX_COST } from "./catalog";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/assembler/run-store", () => ({ dailyTenDays: async () => [] }));

describe("openRewardBox", () => {
  beforeEach(() => rpc.mockReset());

  it("asks the database to spend one box's tokens for this tap", async () => {
    const { openRewardBox } = await import("./server");
    rpc.mockResolvedValue({
      data: [{ prize_kind: "accessory", prize_id: "cap", bonus: 0, balance: 40, repeated: false }],
      error: null,
    });
    const id = "6f1b8f0e-3a52-4d8e-9a4f-0d1c2b3a4e5f";
    const out = await openRewardBox("student_1", id);
    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe("open_reward_box");
    expect(args).toMatchObject({
      p_student: "student_1",
      p_request: id,
      p_cost: BOX_COST,
      p_bonus: BOX_BONUS_TOKENS,
    });
    expect([...args.p_order].sort()).toEqual([...ACCESSORY_IDS].sort());
    expect(out).toEqual({ prize: { kind: "accessory", id: "cap" }, balance: 40, repeated: false });
  });

  it("turns the database's refusal into Not enough tokens", async () => {
    const { openRewardBox, NotEnoughTokens } = await import("./server");
    rpc.mockResolvedValue({ data: null, error: { message: "not_enough_tokens" } });
    await expect(openRewardBox("student_1", crypto.randomUUID())).rejects.toBeInstanceOf(
      NotEnoughTokens
    );
  });

  it("reads tokens back as the prize once every accessory is owned", async () => {
    const { openRewardBox } = await import("./server");
    rpc.mockResolvedValue({
      data: [
        { prize_kind: "tokens", prize_id: "tokens", bonus: 150, balance: 150, repeated: true },
      ],
      error: null,
    });
    const out = await openRewardBox("student_1", crypto.randomUUID());
    expect(out).toEqual({ prize: { kind: "tokens", bonus: 150 }, balance: 150, repeated: true });
  });
});

// Against the local database (supabase/migrations/20261112231500_rewards.sql applied). Runs only
// when REWARDS_LOCAL_DB=1 and the local service-role env is set; CI's unit run skips it.
const LOCAL =
  process.env.REWARDS_LOCAL_DB === "1" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!LOCAL)("open_reward_box on a real database", () => {
  const student = `rewards_test_${Date.now()}`;
  async function real() {
    const { createClient } =
      await vi.importActual<typeof import("@supabase/supabase-js")>("@supabase/supabase-js");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  async function open(request: string) {
    const db = await real();
    return db.rpc("open_reward_box", {
      p_student: student,
      p_request: request,
      p_cost: BOX_COST,
      p_order: [...ACCESSORY_IDS],
      p_bonus: BOX_BONUS_TOKENS,
    });
  }
  afterAll(async () => {
    const db = await real();
    await db.from("student_reward_boxes").delete().eq("student_id", student);
    await db.from("student_point_awards").delete().eq("student_id", student);
  });

  it("lets only one of six parallel taps spend tokens that pay for one box", async () => {
    const db = await real();
    // 30 right answers at 15: 450 tokens, enough for one box and not two.
    const awards = Array.from({ length: 30 }, (_, i) => ({
      award_key: `${student}:${i}`,
      student_id: student,
      points: 15,
    }));
    expect((await db.from("student_point_awards").insert(awards)).error).toBeNull();
    const results = await Promise.all(Array.from({ length: 6 }, () => open(crypto.randomUUID())));
    const opened = results.filter((r) => !r.error);
    expect(opened).toHaveLength(1);
    expect(results.filter((r) => r.error?.message.includes("not_enough_tokens"))).toHaveLength(5);
    expect(opened[0].data[0].balance).toBe(450 - BOX_COST);
    const { data } = await db.from("student_reward_boxes").select("cost").eq("student_id", student);
    expect(data).toEqual([{ cost: BOX_COST }]);
  });

  it("opens one box for one tap, even when the tap is sent twice", async () => {
    const db = await real();
    const more = Array.from({ length: 20 }, (_, i) => ({
      award_key: `${student}:more:${i}`,
      student_id: student,
      points: 15,
    }));
    await db.from("student_point_awards").insert(more);
    const tap = crypto.randomUUID();
    const [a, b] = await Promise.all([open(tap), open(tap)]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(a.data[0].prize_id).toBe(b.data[0].prize_id);
    const { count } = await db
      .from("student_reward_boxes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student);
    expect(count).toBe(2);
  });
});
