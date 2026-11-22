/*
 * Math on demand: a fresh question is built near the asked difficulty, stored through persist.ts and
 * handed back as a pool item and snapshot that pass the same gate as every student pool. Nothing is
 * made while generated questions are hidden, for a core plan, or for a skill with no item models.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import type { Pending } from "./persist";
import { batchManifestSha, evidenceFor, rowsFor, sealOf } from "./store";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({}) }));
const state = vi.hoisted(() => ({ hidden: false, writes: 0 }));
vi.mock("./switch", () => ({ generatedHidden: async () => state.hidden }));
vi.mock("./persist", () => ({
  withIds: (q: Pending["q"]) => ({
    q,
    ids: {
      question: "00000000-0000-4000-8000-000000000001",
      choices: q.choices.map((_, i) => `00000000-0000-4000-8000-00000000010${i}`),
    },
  }),
  // stands in for the database: the rows as they would read back, sealed, with their evidence
  insertQuestions: async (_db: unknown, chunk: Pending[], batch: string, manifest: string) => {
    state.writes++;
    const rows = new Map<string, QuizQuestionWithChoices>();
    const evidence = new Map<string, unknown>();
    for (const { q, ids } of chunk) {
      const r = rowsFor(q, batch, ids);
      const row = {
        ...r.question,
        answer_choices: r.choices,
      } as unknown as QuizQuestionWithChoices;
      rows.set(ids.question, row);
      evidence.set(ids.question, evidenceFor(q, batch, manifest, sealOf(row)));
    }
    return { admitted: chunk.length, hidden: [], rows, evidence };
  },
}));

const { buildFresh, nextGeneratedQuestion, SERVE_BATCH } = await import("./serve");

beforeEach(() => {
  state.hidden = false;
  state.writes = 0;
});

describe("buildFresh", () => {
  it("lands on the asked difficulty when a template covers it", () => {
    let n = 7;
    const item = buildFresh("m-circles", 4, () => (n = (n * 48271) % 2147483647));
    expect(item?.skill).toBe("m-circles");
    expect(item?.difficulty).toBe(4);
  });

  it("makes a different question each time", () => {
    const stems = new Set(
      Array.from({ length: 12 }, () => buildFresh("m-triangles", 3)?.stem ?? "")
    );
    expect(stems.size).toBeGreaterThan(8);
  });

  it("makes nothing for a skill with no item models", () => {
    expect(buildFresh("rw-main-idea", 3)).toBeNull();
  });
});

describe("nextGeneratedQuestion", () => {
  it("stores a fresh question and returns an admitted item and snapshot", async () => {
    const served = await nextGeneratedQuestion({ skillId: "m-graphs-of-lines", difficulty: 3 });
    expect(served).not.toBeNull();
    expect(state.writes).toBe(1);
    expect(served!.item).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      section: "math",
      skill72: "m-graphs-of-lines",
    });
    expect(served!.snapshot.binding.questionId).toBe(served!.item.id);
    expect(served!.snapshot.binding.catalogSkillId).toBe(served!.item.skillId);
    // the student's part never says where the question came from
    expect(JSON.stringify(served!.snapshot.student)).not.toMatch(/generated|origin|serve:math/);
    expect(SERVE_BATCH).toBe("serve:math");
    expect(batchManifestSha(SERVE_BATCH, [])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("makes nothing while generated questions are hidden", async () => {
    state.hidden = true;
    expect(await nextGeneratedQuestion({ skillId: "m-circles", difficulty: 3 })).toBeNull();
    expect(state.writes).toBe(0);
  });

  it("makes nothing for a core plan or a Reading and Writing skill", async () => {
    expect(
      await nextGeneratedQuestion({ skillId: "m-circles", difficulty: 3, practiceSet: true })
    ).toBeNull();
    expect(await nextGeneratedQuestion({ skillId: "rw-main-idea", difficulty: 3 })).toBeNull();
    expect(state.writes).toBe(0);
  });
});
