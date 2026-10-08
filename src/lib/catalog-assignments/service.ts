import {
  assertCanManageAssignment,
  assertCanReadAssignment,
  type AssignmentActor,
  type AssignmentRelationships,
} from "./access";

export interface AssignmentDraftInput {
  requestId: string;
  studentClerkId: string;
  skillId: string;
  questionIds: readonly string[];
  title: string;
  dueAt: string | null;
}

export interface AssignmentRecord<Delivery> {
  id: string;
  requestId: string;
  requestFingerprint: string;
  educatorClerkId: string;
  studentClerkId: string;
  skillId: string;
  questionIds: readonly string[];
  deliveries: readonly Delivery[];
  title: string;
  dueAt: string | null;
  status: "draft" | "active" | "cancelled";
  revision: number;
}

/** The practice owner supplies the immutable, admitted delivery snapshot. */
export interface AssignmentSelection<Delivery> {
  select(skillId: string, questionIds: readonly string[]): Promise<readonly Delivery[]>;
  questionId(delivery: Delivery): string;
  sameVersion(saved: Delivery, current: Delivery): boolean;
}

/** Implementations must make create and revision-checked writes atomic. */
export interface AssignmentStore<Delivery> {
  byRequest(educatorClerkId: string, requestId: string): Promise<AssignmentRecord<Delivery> | null>;
  create(
    record: Omit<AssignmentRecord<Delivery>, "id" | "revision">
  ): Promise<AssignmentRecord<Delivery>>;
  scope(id: string): Promise<{ studentClerkId: string } | null>;
  byId(id: string): Promise<AssignmentRecord<Delivery> | null>;
  updateMetadata(
    id: string,
    expectedRevision: number,
    patch: { title: string; dueAt: string | null }
  ): Promise<AssignmentRecord<Delivery>>;
  activate(id: string, expectedRevision: number): Promise<AssignmentRecord<Delivery>>;
  cancel(id: string, expectedRevision: number): Promise<AssignmentRecord<Delivery>>;
}

export class CatalogAssignmentService<Delivery> {
  constructor(
    private readonly store: AssignmentStore<Delivery>,
    private readonly selection: AssignmentSelection<Delivery>,
    private readonly relationships: AssignmentRelationships
  ) {}

  async createDraft(
    actor: AssignmentActor,
    input: AssignmentDraftInput
  ): Promise<AssignmentRecord<Delivery>> {
    await assertCanManageAssignment(actor, input, this.relationships);
    if (!input.questionIds.length || new Set(input.questionIds).size !== input.questionIds.length) {
      throw new Error("Assignment needs distinct questions");
    }
    const requestFingerprint = JSON.stringify([
      input.studentClerkId,
      input.skillId,
      input.questionIds,
      input.title,
      input.dueAt,
    ]);
    const prior = await this.store.byRequest(actor.clerkId, input.requestId);
    if (prior) return this.matchRetry(prior, requestFingerprint);

    const deliveries = await this.selection.select(input.skillId, input.questionIds);
    if (
      deliveries.length !== input.questionIds.length ||
      deliveries.some(
        (delivery, index) => this.selection.questionId(delivery) !== input.questionIds[index]
      )
    ) {
      throw new Error("Selected questions do not match the approved delivery");
    }
    try {
      return await this.store.create({
        requestId: input.requestId,
        requestFingerprint,
        educatorClerkId: actor.clerkId,
        studentClerkId: input.studentClerkId,
        skillId: input.skillId,
        questionIds: [...input.questionIds],
        deliveries: [...deliveries],
        title: input.title,
        dueAt: input.dueAt,
        status: "draft",
      });
    } catch (error) {
      // A simultaneous retry can win the unique request key. Never claim that
      // an unrelated storage failure succeeded.
      const concurrent = await this.store.byRequest(actor.clerkId, input.requestId);
      if (concurrent) return this.matchRetry(concurrent, requestFingerprint);
      throw error;
    }
  }

  async read(actor: AssignmentActor, id: string): Promise<AssignmentRecord<Delivery>> {
    const scope = await this.store.scope(id);
    if (!scope) throw new Error("Assignment not found");
    await assertCanReadAssignment(actor, scope, this.relationships);
    const record = await this.store.byId(id);
    if (!record || record.studentClerkId !== scope.studentClerkId) {
      throw new Error("Assignment not found");
    }
    if (actor.role === "student" && record.status === "draft") {
      throw new Error("Assignment not available");
    }
    return record;
  }

  async activeForStudent(actor: AssignmentActor, id: string): Promise<AssignmentRecord<Delivery>> {
    if (actor.role !== "student") throw new Error("Student assignment access required");
    const record = await this.read(actor, id);
    if (record.status !== "active") throw new Error("Assignment not available");
    const current = await this.selection.select(record.skillId, record.questionIds);
    if (
      current.length !== record.deliveries.length ||
      current.some(
        (delivery, index) =>
          this.selection.questionId(delivery) !== record.questionIds[index] ||
          !this.selection.sameVersion(record.deliveries[index], delivery)
      )
    ) {
      throw new Error("Reviewed question version changed");
    }
    return record;
  }

  async updateMetadata(
    actor: AssignmentActor,
    id: string,
    expectedRevision: number,
    patch: { title: string; dueAt: string | null }
  ): Promise<AssignmentRecord<Delivery>> {
    await this.assertCanManageExisting(actor, id);
    return this.store.updateMetadata(id, expectedRevision, patch);
  }

  async cancel(
    actor: AssignmentActor,
    id: string,
    expectedRevision: number
  ): Promise<AssignmentRecord<Delivery>> {
    await this.assertCanManageExisting(actor, id);
    return this.store.cancel(id, expectedRevision);
  }

  async activate(
    actor: AssignmentActor,
    id: string,
    expectedRevision: number
  ): Promise<AssignmentRecord<Delivery>> {
    await this.assertCanManageExisting(actor, id);
    const record = await this.store.byId(id);
    if (!record || record.status !== "draft") throw new Error("Assignment not available");
    const current = await this.selection.select(record.skillId, record.questionIds);
    if (
      current.length !== record.deliveries.length ||
      current.some(
        (delivery, index) =>
          this.selection.questionId(delivery) !== record.questionIds[index] ||
          !this.selection.sameVersion(record.deliveries[index], delivery)
      )
    ) {
      throw new Error("Reviewed question version changed");
    }
    return this.store.activate(id, expectedRevision);
  }

  private async assertCanManageExisting(actor: AssignmentActor, id: string): Promise<void> {
    const scope = await this.store.scope(id);
    if (!scope) throw new Error("Assignment not found");
    await assertCanManageAssignment(actor, scope, this.relationships);
  }

  private matchRetry(
    record: AssignmentRecord<Delivery>,
    fingerprint: string
  ): AssignmentRecord<Delivery> {
    if (record.requestFingerprint !== fingerprint) {
      throw new Error("Request ID was already used for a different assignment");
    }
    return record;
  }
}
