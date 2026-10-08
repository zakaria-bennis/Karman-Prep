import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CatalogAssignmentService,
  type AssignmentDraftInput,
  type AssignmentRecord,
  type AssignmentSelection,
  type AssignmentStore,
} from "./service";

type Delivery = { questionId: string; version: string };
const actor = { clerkId: "tutor-a", role: "tutor" as const };
const student = { clerkId: "student-a", role: "student" as const };
const input: AssignmentDraftInput = {
  requestId: "request-a",
  studentClerkId: "student-a",
  skillId: "ma-skill-linear-equations-in-one-variable",
  questionIds: ["question-1", "question-2"],
  title: "Linear equations practice",
  dueAt: "2026-10-15T18:00:00.000Z",
};

class MemoryStore implements AssignmentStore<Delivery> {
  records = new Map<string, AssignmentRecord<Delivery>>();
  byRequest = vi.fn(
    async (educator: string, request: string) =>
      [...this.records.values()].find(
        (record) => record.educatorClerkId === educator && record.requestId === request
      ) ?? null
  );
  create = vi.fn(async (record: Omit<AssignmentRecord<Delivery>, "id" | "revision">) => {
    const created: AssignmentRecord<Delivery> = { ...record, id: "assignment-1", revision: 1 };
    this.records.set(created.id, created);
    return created;
  });
  scope = vi.fn(async (id: string) => {
    const record = this.records.get(id);
    return record ? { studentClerkId: record.studentClerkId } : null;
  });
  byId = vi.fn(async (id: string) => this.records.get(id) ?? null);
  updateMetadata = vi.fn(
    async (id: string, expected: number, patch: { title: string; dueAt: string | null }) => {
      const old = this.records.get(id);
      if (!old || old.revision !== expected || old.status === "cancelled") {
        throw new Error("Assignment revision conflict");
      }
      const updated = { ...old, ...patch, revision: old.revision + 1 };
      this.records.set(id, updated);
      return updated;
    }
  );
  activate = vi.fn(async (id: string, expected: number) => {
    const old = this.records.get(id);
    if (!old || old.revision !== expected || old.status !== "draft") {
      throw new Error("Assignment revision conflict");
    }
    const active: AssignmentRecord<Delivery> = {
      ...old,
      status: "active",
      revision: old.revision + 1,
    };
    this.records.set(id, active);
    return active;
  });
  cancel = vi.fn(async (id: string, expected: number) => {
    const old = this.records.get(id);
    if (!old || old.revision !== expected) throw new Error("Assignment revision conflict");
    const cancelled: AssignmentRecord<Delivery> = {
      ...old,
      status: "cancelled",
      revision: old.revision + 1,
    };
    this.records.set(id, cancelled);
    return cancelled;
  });
}

let store: MemoryStore;
let selection: AssignmentSelection<Delivery>;
let tutorHasStudent: ReturnType<
  typeof vi.fn<(tutorClerkId: string, studentClerkId: string) => Promise<boolean>>
>;
let service: CatalogAssignmentService<Delivery>;

beforeEach(() => {
  store = new MemoryStore();
  selection = {
    select: vi.fn(async (_skill: string, ids: readonly string[]) =>
      ids.map((questionId) => ({ questionId, version: "a".repeat(64) }))
    ),
    questionId: (delivery) => delivery.questionId,
    sameVersion: (saved, current) => saved.version === current.version,
  };
  tutorHasStudent = vi.fn(async (_tutorClerkId: string, _studentClerkId: string) => true);
  service = new CatalogAssignmentService(store, selection, { tutorHasStudent });
});

describe("canonical assignment lifecycle", () => {
  it("creates a private draft from exact ordered admitted deliveries and reads only after activation", async () => {
    const created = await service.createDraft(actor, input);
    expect(created.status).toBe("draft");
    expect(created.questionIds).toEqual(input.questionIds);
    expect(created.deliveries.map((delivery) => delivery.questionId)).toEqual(input.questionIds);
    await expect(service.read(student, created.id)).rejects.toThrow("not available");
    const active = await service.activate(actor, created.id, 1);
    expect(await service.read(student, created.id)).toEqual(active);
    expect(await service.activeForStudent(student, created.id)).toEqual(active);
    await expect(
      service.read({ clerkId: "student-b", role: "student" }, created.id)
    ).rejects.toThrow("Assignment access denied");
    expect(store.byId).toHaveBeenCalled();
  });

  it("retries the same request without reselecting or duplicating and rejects a changed retry", async () => {
    const first = await service.createDraft(actor, input);
    expect(await service.createDraft(actor, input)).toBe(first);
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(selection.select).toHaveBeenCalledTimes(1);
    await expect(service.createDraft(actor, { ...input, title: "Different" })).rejects.toThrow(
      "already used"
    );
  });

  it("updates only metadata with a revision check and cancels without deleting items", async () => {
    const created = await service.createDraft(actor, input);
    const updated = await service.updateMetadata(actor, created.id, 1, {
      title: "Updated plan",
      dueAt: null,
    });
    expect(updated.deliveries).toEqual(created.deliveries);
    await expect(
      service.updateMetadata(actor, created.id, 1, { title: "Stale", dueAt: null })
    ).rejects.toThrow("revision conflict");
    const cancelled = await service.cancel(actor, created.id, 2);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.deliveries).toEqual(created.deliveries);
    expect(await service.read(student, created.id)).toEqual(cancelled);
  });

  it("holds activation when a selected question version changed", async () => {
    const created = await service.createDraft(actor, input);
    selection.select = vi.fn(async (_skill: string, ids: readonly string[]) =>
      ids.map((questionId) => ({ questionId, version: "b".repeat(64) }))
    );
    await expect(service.activate(actor, created.id, 1)).rejects.toThrow("version changed");
    expect(store.activate).not.toHaveBeenCalled();
  });

  it("holds a started assignment if its approved version later changed", async () => {
    const created = await service.createDraft(actor, input);
    await service.activate(actor, created.id, 1);
    selection.select = vi.fn(async (_skill: string, ids: readonly string[]) =>
      ids.map((questionId) => ({ questionId, version: "c".repeat(64) }))
    );
    await expect(service.activeForStudent(student, created.id)).rejects.toThrow("version changed");
    await expect(service.activeForStudent(actor, created.id)).rejects.toThrow(
      "Student assignment access required"
    );
  });

  it("denies revoked, parent, and cross-student mutations before question selection or full reads", async () => {
    tutorHasStudent.mockResolvedValue(false);
    await expect(service.createDraft(actor, input)).rejects.toThrow("Assignment access denied");
    expect(selection.select).not.toHaveBeenCalled();
    tutorHasStudent.mockResolvedValue(true);
    const created = await service.createDraft(actor, input);
    tutorHasStudent.mockResolvedValue(false);
    await expect(service.cancel(actor, created.id, 1)).rejects.toThrow("Assignment access denied");
    await expect(
      service.updateMetadata({ clerkId: "parent-a", role: "parent" }, created.id, 1, {
        title: "Forged",
        dueAt: null,
      })
    ).rejects.toThrow("Assignment access denied");
    expect(store.cancel).not.toHaveBeenCalled();
    expect(store.updateMetadata).not.toHaveBeenCalled();
    expect(store.byId).not.toHaveBeenCalled();
  });

  it("rejects sparse, duplicate, or changed selection before a persisted write", async () => {
    await expect(service.createDraft(actor, { ...input, questionIds: [] })).rejects.toThrow(
      "distinct questions"
    );
    await expect(
      service.createDraft(actor, { ...input, questionIds: ["question-1", "question-1"] })
    ).rejects.toThrow("distinct questions");
    selection.select = vi.fn(async () => [{ questionId: "different", version: "b".repeat(64) }]);
    await expect(service.createDraft(actor, input)).rejects.toThrow("do not match");
    expect(store.create).not.toHaveBeenCalled();
  });
});
