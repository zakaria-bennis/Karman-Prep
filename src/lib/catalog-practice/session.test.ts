import { beforeEach, describe, expect, it, vi } from "vitest";
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
// ids[0..2] follow the same pattern, so fixture(index) always uses this id.
const questionId = (index: number) =>
  `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
function fixture(index: number, numeric = false, difficulty = (index % 7) + 1) {
  const question = {
    ...catalogQuestion(questionId(index)),
    difficulty_level: difficulty,
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
  const abandoned: string[] = [];
  let writes = 0;
  let created = 0;
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
      created++;
      const session: CatalogSession = {
        ...input,
        id: created === 1 ? ids[2] : `00000000-0000-4000-9000-${String(created).padStart(12, "0")}`,
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
    async abandon(sessionId, studentId) {
      const session = await store.getOwned(sessionId, studentId);
      if (session && !session.completedAt) {
        session.completedAt = "2026-11-08T00:00:00Z";
        abandoned.push(sessionId);
      }
    },
    async answeredQuestions(studentId, skillId) {
      return [...sessions.values()]
        .filter((session) => session.studentId === studentId && session.skillId === skillId)
        .flatMap((session) =>
          session.responses.map((response) => ({
            questionId: response.questionId,
            answeredAt: "2026-11-07T00:00:00Z",
          }))
        );
    },
  };
  const service = createCatalogPracticeService({
    fetchPool: async () => items.map((item) => item.question),
    loadEvidence: async () => new Map(items.map((item) => [item.question.id, item.evidence])),
    loadOwnedAssignment,
    store,
    now: () => new Date("2026-11-08T12:00:00Z"),
  });
  return {
    service,
    sessions,
    abandoned,
    setItems: (next: typeof items) => {
      items = next;
    },
    writes: () => writes,
  };
}

const startInput = { skillId: catalogSkillId };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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

  it("holds an empty pool before allocating, and drops duplicate or bad rows instead of the skill", async () => {
    const { service, sessions, setItems } = harness();
    setItems([]);
    await expect(service.start(startInput, "student-1")).rejects.toThrow("No distinct approved");
    expect(sessions.size).toBe(0);
    const unsealed = fixture(1);
    unsealed.question.question_text = "Changed after review";
    const twin = fixture(2);
    twin.evidence = {
      ...fixture(0).evidence,
      approved_tags: {
        ...fixture(0).evidence.approved_tags,
        question_payload_sha256: fixture(2).evidence.approved_tags.question_payload_sha256,
      },
    };
    setItems([fixture(0), fixture(0), unsealed, twin]);
    const started = await service.start(startInput, "student-1");
    expect(started.total).toBe(1);
    expect(started.question?.id).toBe(ids[0]);
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/duplicate question/));
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/version is unavailable/));
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/duplicate canonical/));
  });

  it("closes a stale open session and starts fresh instead of locking the student out", async () => {
    const { service, sessions, setItems, abandoned } = harness();
    const started = await service.start(startInput, "student-1");
    await service.submit(
      { sessionId: started.id, questionId: ids[0], answer: "A", responseTimeSeconds: 3 },
      "student-1"
    );
    // A saved question is re-sealed after the session began.
    const changed = fixture(1);
    changed.question.question_text = "Re-sealed after review";
    changed.evidence.approved_tags.question_payload_sha256 = catalogQuestionPayloadHash(
      changed.question
    );
    setItems([fixture(0), changed, fixture(2)]);
    const resumed = await service.resume(started.id, "student-1");
    expect(abandoned).toEqual([started.id]);
    expect(resumed.id).not.toBe(started.id);
    expect(resumed.completedAt).toBeNull();
    expect(resumed.question).not.toBeNull();
    // The answered question is served again only after the unseen ones.
    expect(resumed.question?.id).not.toBe(ids[0]);
    // Start also recovers: the old open session never blocks a new one.
    expect((await service.start(startInput, "student-1")).id).toBe(resumed.id);
    // The closed session stays readable from its frozen snapshot, with its saved answer.
    const closed = await service.resume(started.id, "student-1");
    expect(closed.completedAt).not.toBeNull();
    expect(closed.score).toBeNull();
    expect(closed.reviews).toHaveLength(1);
    expect(closed.question).toBeNull();
    expect(sessions.get(started.id)?.responses).toHaveLength(1);
  });

  it("start replaces a stale open session rather than returning it", async () => {
    const { service, setItems, abandoned } = harness();
    const started = await service.start(startInput, "student-1");
    setItems([fixture(1), fixture(2)]);
    const fresh = await service.start(startInput, "student-1");
    expect(abandoned).toEqual([started.id]);
    expect(fresh.id).not.toBe(started.id);
    expect(fresh.answered).toBe(0);
  });

  it("scores a fully answered stale session instead of discarding it", async () => {
    const { service, setItems, abandoned } = harness();
    const started = await service.start(startInput, "student-1");
    for (const id of [ids[0], ids[1]]) {
      await service.submit(
        { sessionId: started.id, questionId: id, answer: "A", responseTimeSeconds: 3 },
        "student-1"
      );
    }
    setItems([fixture(2)]);
    const finished = await service.complete(started.id, "student-1");
    expect(finished.score).toBe(100);
    expect(abandoned).toEqual([]);
    expect((await service.resume(started.id, "student-1")).score).toBe(100);
  });

  it("shows completed sessions from their frozen snapshot even after the pool changes", async () => {
    const { service, setItems } = harness();
    const started = await service.start(startInput, "student-1");
    for (const id of [ids[0], ids[1]]) {
      await service.submit(
        { sessionId: started.id, questionId: id, answer: "B", responseTimeSeconds: 3 },
        "student-1"
      );
    }
    await service.complete(started.id, "student-1");
    setItems([]);
    const review = await service.resume(started.id, "student-1");
    expect(review.score).toBe(0);
    expect(review.reviews.map((item) => item.questionId)).toEqual([ids[0], ids[1]]);
  });

  it("does not close a session when the pool read itself fails", async () => {
    const { service, setItems, abandoned } = harness();
    const started = await service.start(startInput, "student-1");
    setItems(null as never);
    await expect(service.resume(started.id, "student-1")).rejects.toThrow();
    expect(abandoned).toEqual([]);
  });

  it("serves questions the student has not answered first, across sessions", async () => {
    const pool = Array.from({ length: 25 }, (_, index) => fixture(index));
    const { service } = harness(pool);
    const served = new Set<string>();
    for (let round = 0; round < 3; round++) {
      let session = await service.start(startInput, "student-1");
      while (session.question) {
        served.add(session.question.id);
        await service.submit(
          {
            sessionId: session.id,
            questionId: session.question.id,
            answer: "A",
            responseTimeSeconds: 1,
          },
          "student-1"
        );
        session = await service.resume(session.id, "student-1");
      }
      await service.complete(session.id, "student-1");
    }
    expect(served.size).toBe(25);
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
