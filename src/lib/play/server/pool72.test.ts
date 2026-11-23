import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** A tag table with 3,000 tagged questions a skill: every read is recorded. */
const reads: { table: string; limit?: number; ids?: number }[] = [];
const TAGGED = 3000;

function query(table: string) {
  const state: { table: string; skill?: string; limit?: number; ids?: string[] } = { table };
  const q = {
    select: () => q,
    eq: (_c: string, v: string) => ((state.skill = v), q),
    gte: () => q,
    lt: () => q,
    or: () => q,
    order: () => q,
    in: (_c: string, ids: string[]) => ((state.ids = ids), q),
    limit: (n: number) => ((state.limit = n), q),
    then: (ok: (r: unknown) => unknown, bad?: (e: unknown) => unknown) => {
      reads.push({ table, limit: state.limit, ids: state.ids?.length });
      let data: unknown[] = [];
      if (table === "question_skills72") {
        const n = Math.min(state.limit ?? 1000, TAGGED);
        data = Array.from({ length: n }, (_, i) => ({ question_id: `${state.skill}-q${i}` }));
      } else if (table === "answer_key_entries") {
        data = (state.ids ?? []).map((id) => ({ question_id: id, a: "ma-skill-x", b: null }));
      }
      return Promise.resolve({ data, error: null }).then(ok, bad);
    },
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ from: (table: string) => query(table) }),
}));

const admitted: { skills: readonly string[]; only?: ReadonlyMap<string, readonly string[]> }[] = [];
vi.mock("@/lib/assembler/bank", () => ({
  loadAdmittedBank: async (
    skills: readonly string[],
    _max: number,
    _ps: boolean,
    only?: ReadonlyMap<string, readonly string[]>
  ) => {
    admitted.push({ skills, only });
    return { items: [], snapshots: new Map() };
  },
}));

const { pool72, POOL72_CAP } = await import("./pool72");
const { SKILLS72 } = await import("@/lib/skills/ids72");

const loaded = () =>
  admitted.reduce((n, a) => n + [...(a.only?.values() ?? [])].reduce((m, l) => m + l.length, 0), 0);

describe("pool72", () => {
  beforeEach(() => {
    reads.length = 0;
    admitted.length = 0;
  });

  it("reads no more than its share of each skill, however many are tagged", async () => {
    await pool72(["m-circles"], 7, false, 80);
    expect(loaded()).toBeLessThanOrEqual(80);
    expect(loaded()).toBeGreaterThan(0);
    expect(admitted[0].only).toBeDefined();
    for (const r of reads.filter((r) => r.table === "question_skills72"))
      expect(r.limit).toBeLessThanOrEqual(80);
  });

  it("never loads more than its cap for a whole section", async () => {
    const math = SKILLS72.filter((s) => s.section === "Math").map((s) => s.id);
    await pool72(math, 7, false, 500);
    expect(loaded()).toBeLessThanOrEqual(POOL72_CAP);
    expect(loaded()).toBeGreaterThan(0);
  });

  it("checks only the sampled questions, never a whole skill", async () => {
    await pool72(["m-circles", "m-triangles"], 7, false, 24);
    expect(admitted).toHaveLength(1);
    expect(loaded()).toBeLessThanOrEqual(48);
  });
});
