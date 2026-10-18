import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  calls: [] as unknown[][],
  header: null as Record<string, unknown> | null,
  items: [] as Record<string, unknown>[],
  mutationMatches: true,
  rpcId: "33333333-3333-4333-8333-333333333333",
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from(table: string) {
      fixture.calls.push(["from", table]);
      let isMutation = false;
      const query = {
        select(columns: string) {
          fixture.calls.push(["select", columns]);
          return query;
        },
        eq(column: string, value: unknown) {
          fixture.calls.push(["eq", column, value]);
          return query;
        },
        neq(column: string, value: unknown) {
          fixture.calls.push(["neq", column, value]);
          return query;
        },
        order(column: string) {
          fixture.calls.push(["order", column]);
          return query;
        },
        update(patch: unknown) {
          isMutation = true;
          fixture.calls.push(["update", patch]);
          return query;
        },
        maybeSingle: async () => ({
          data: isMutation
            ? fixture.mutationMatches
              ? { id: fixture.rpcId }
              : null
            : table === "catalog_assignments"
              ? fixture.header
              : null,
          error: null,
        }),
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(resolve({ data: fixture.items, error: null }));
        },
      };
      return query;
    },
    rpc(name: string, args: unknown) {
      fixture.calls.push(["rpc", name, args]);
      return Promise.resolve({ data: fixture.rpcId, error: null });
    },
  }),
}));

import { catalogAssignmentStore } from "./store";

const binding = {
  questionId: "11111111-1111-4111-8111-111111111111",
  stableQuestionId: "synthetic-source-Q1",
  catalogSkillId: "ma-skill-linear-equations-in-one-variable",
  payloadSha256: "a".repeat(64),
};
const delivery = {
  snapshot: {
    binding,
    student: { question_text: "Synthetic question" },
    answer: { correctAnswer: "A" },
  },
  sourcePdf: "synthetic-exam.pdf",
  sourcePage: 2,
};

beforeEach(() => {
  fixture.calls = [];
  fixture.mutationMatches = true;
  fixture.header = {
    id: fixture.rpcId,
    request_id: "22222222-2222-4222-8222-222222222222",
    request_fingerprint: "synthetic",
    educator_clerk_id: "tutor-a",
    student_clerk_id: "student-a",
    catalog_skill_id: binding.catalogSkillId,
    title: "Practice",
    due_at: null,
    status: "draft",
    revision: 1,
  };
  fixture.items = [
    {
      position: 1,
      question_id: binding.questionId,
      stable_question_id: binding.stableQuestionId,
      payload_sha256: binding.payloadSha256,
      source_pdf: delivery.sourcePdf,
      source_page: delivery.sourcePage,
      delivery_snapshot: delivery.snapshot,
    },
  ];
});

describe("catalog assignment storage adapter", () => {
  it("sends an ordered server snapshot through the atomic draft RPC and reads it back", async () => {
    const record = await catalogAssignmentStore.create({
      requestId: fixture.header!.request_id as string,
      requestFingerprint: "synthetic",
      educatorClerkId: "tutor-a",
      studentClerkId: "student-a",
      skillId: binding.catalogSkillId,
      questionIds: [binding.questionId],
      deliveries: [delivery as never],
      title: "Practice",
      dueAt: null,
      status: "draft",
    });
    expect(fixture.calls).toContainEqual([
      "rpc",
      "create_catalog_assignment_draft",
      expect.objectContaining({
        p_items: [
          expect.objectContaining({ questionId: binding.questionId, snapshot: delivery.snapshot }),
        ],
      }),
    ]);
    expect(record.deliveries[0].snapshot.binding).toEqual(binding);
    expect(record.deliveries[0].sourcePdf).toBe("synthetic-exam.pdf");
  });

  it("holds a corrupted persisted binding rather than returning another version", async () => {
    fixture.items[0].payload_sha256 = "b".repeat(64);
    await expect(catalogAssignmentStore.byId(fixture.rpcId)).rejects.toThrow("stored binding");
  });

  it("uses revision and cancellation guards for mutation without deleting history", async () => {
    fixture.mutationMatches = false;
    await expect(
      catalogAssignmentStore.updateMetadata(fixture.rpcId, 3, { title: "New", dueAt: null })
    ).rejects.toThrow("revision conflict");
    expect(fixture.calls).toContainEqual(["eq", "revision", 3]);
    expect(fixture.calls).toContainEqual(["neq", "status", "cancelled"]);
    expect(fixture.calls.some((call) => call[0] === "delete")).toBe(false);
  });
});
