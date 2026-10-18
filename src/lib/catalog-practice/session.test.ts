import { describe, expect, it } from "vitest";
import {
  approvedCatalogEvidence,
  catalogQuestion,
  catalogSkillId,
} from "../../../tests/fixtures/approved-catalog";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import { buildCatalogDeliverySnapshot, type CatalogQuestionBinding } from "./delivery-contract";
import {
  createCatalogPracticeService,
  type CatalogSession,
  type CatalogSessionStore,
} from "./session";

const ids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];
function fixture(index: number, numeric = false) {
  const question = {
    ...catalogQuestion(ids[index]),
    answer_format: numeric ? "numeric_entry" : "multiple_choice",
    correct_answer: numeric ? "1/2" : "A",
    numeric_tolerance: 0,
    reviewed_numeric_answers: numeric ? ["1/2", "0.5"] : undefined,
  } as unknown as QuizQuestionWithChoices;
  const evidence = approvedCatalogEvidence(`stable-${index}`);
  evidence.approved_tags.question_payload_sha256 = catalogQuestionPayloadHash(question);
  return { question, evidence };
}

function harness(
  initial = [fixture(0), fixture(1)],
  loadOwnedAssignment?: (
    id: string,
    studentId: string
  ) => Promise<{ skillId: string; items: CatalogQuestionBinding[] }>
) {
  let items = initial;
  const sessions = new Map<string, CatalogSession>();
  let writes = 0;
  const store: CatalogSessionStore = {
    async start(input) {
      const existing = [...sessions.values()].find(
        (session) =>
          session.studentId === input.studentId &&
          session.skillId === input.skillId &&
          session.assignmentId === input.assignmentId &&
          !session.completedAt
      );
      if (existing) return existing;
      const session: CatalogSession = {
        ...input,
        id: ids[2],
        responses: [],
        completedAt: null,
        score: null,
      };
      sessions.set(session.id, session);
      return session;
    },
    async getOwned(sessionId, studentId) {
      const session = sessions.get(sessionId);
      return session?.studentId === studentId ? session : null;
    },
    async recordOnce({ sessionId, studentId, response }) {
      const session = await store.getOwned(sessionId, studentId);
      if (!session) throw new Error("Unavailable");
      const prior = session.responses.find((item) => item.questionId === response.questionId);
      if (prior) return prior;
      if (session.snapshots[session.responses.length]?.binding.questionId !== response.questionId)
        throw new Error("Wrong order");
      writes++;
      session.responses.push(response);
      return response;
    },
    async complete(sessionId, studentId) {
      const session = await store.getOwned(sessionId, studentId);
      if (!session) throw new Error("Unavailable");
      if (!session.completedAt) {
        session.score = Math.round(
          (100 * session.responses.filter((response) => response.isCorrect).length) /
            session.snapshots.length
        );
        session.completedAt = "2026-10-08T00:00:00Z";
      }
      return session;
    },
  };
  const service = createCatalogPracticeService({
    fetchPool: async () => items.map((item) => item.question),
    loadEvidence: async () => new Map(items.map((item) => [item.question.id, item.evidence])),
    loadOwnedAssignment,
    store,
  });
  return {
    service,
    sessions,
    setItems: (next: typeof items) => {
      items = next;
    },
    writes: () => writes,
  };
}

const startInput = { skillId: catalogSkillId };

describe("canonical practice session", () => {
  it("starts answer-free, resumes exact order, saves first answer once, and completes without legacy status", async () => {
    const { service, writes } = harness();
    const started = await service.start(startInput, "student-1");
    expect(started.question?.id).toBe(ids[0]);
    expect(JSON.stringify(started)).not.toMatch(
      /correct_answer|correctAnswer|explanation_text|reviewedNumericAnswers/
    );
    expect((await service.start(startInput, "student-1")).id).toBe(started.id);
    const first = await service.submit(
      { sessionId: started.id, questionId: ids[0], answer: "B", responseTimeSeconds: 3 },
      "student-1"
    );
    const repeat = await service.submit(
      { sessionId: started.id, questionId: ids[0], answer: "A", responseTimeSeconds: 5 },
      "student-1"
    );
    expect(repeat).toEqual(first);
    expect(first.isCorrect).toBe(false);
    expect(writes()).toBe(1);
    const resumed = await service.resume(started.id, "student-1");
    expect(resumed.question?.id).toBe(ids[1]);
    expect(resumed.reviews).toHaveLength(1);
    await expect(service.complete(started.id, "student-1")).rejects.toThrow("incomplete");
    await service.submit(
      { sessionId: started.id, questionId: ids[1], answer: "A", responseTimeSeconds: 4 },
      "student-1"
    );
    expect((await service.complete(started.id, "student-1")).score).toBe(50);
    expect((await service.complete(started.id, "student-1")).score).toBe(50);
  });

  it("rejects cross-student access, client-selected assignment items, and unavailable assignments", async () => {
    const { service } = harness();
    const started = await service.start(startInput, "student-1");
    await expect(service.resume(started.id, "student-2")).rejects.toThrow("unavailable");
    await expect(
      service.start({ ...startInput, assignmentId: ids[2] }, "student-1")
    ).rejects.toThrow("Assignment is unavailable");
    await expect(
      service.start({ ...startInput, assignment: { items: [] } } as never, "student-1")
    ).rejects.toThrow();
  });

  it("holds empty, duplicate and changed pools before allocating or resuming", async () => {
    const { service, sessions, setItems } = harness();
    setItems([]);
    await expect(service.start(startInput, "student-1")).rejects.toThrow("No distinct approved");
    expect(sessions.size).toBe(0);
    setItems([fixture(0), fixture(0)]);
    await expect(service.start(startInput, "student-1")).rejects.toThrow("Duplicate question");
    setItems([fixture(0), fixture(1)]);
    const started = await service.start(startInput, "student-1");
    setItems([fixture(1), fixture(2)]);
    await expect(service.resume(started.id, "student-1")).rejects.toThrow("no longer available");
    setItems([fixture(0), fixture(1)]);
    const changed = fixture(0);
    changed.question.question_text = "Changed after review";
    setItems([changed, fixture(1)]);
    await expect(service.resume(started.id, "student-1")).rejects.toThrow("version is unavailable");
  });

  it("accepts reviewed numeric equivalents and retains an old session when a new question joins", async () => {
    const { service, setItems } = harness([fixture(0, true)]);
    const started = await service.start(startInput, "student-1");
    setItems([fixture(0, true), fixture(1)]);
    expect((await service.resume(started.id, "student-1")).total).toBe(1);
    const result = await service.submit(
      { sessionId: started.id, questionId: ids[0], answer: "0.5", responseTimeSeconds: 2 },
      "student-1"
    );
    expect(result.isCorrect).toBe(true);
  });

  it("uses only server-loaded assignment bindings and denies a revoked assignment on resume", async () => {
    const assigned = fixture(1);
    const binding = buildCatalogDeliverySnapshot(assigned.question, assigned.evidence).binding;
    let active = true;
    const { service } = harness([fixture(0), assigned], async (_id, studentId) => {
      if (!active || studentId !== "student-1") throw new Error("Assignment is unavailable");
      return { skillId: catalogSkillId, items: [binding] };
    });
    const started = await service.start({ ...startInput, assignmentId: ids[2] }, "student-1");
    expect(started.question?.id).toBe(ids[1]);
    expect(started.total).toBe(1);
    active = false;
    await expect(service.resume(started.id, "student-1")).rejects.toThrow(
      "Assignment is unavailable"
    );
  });
});
