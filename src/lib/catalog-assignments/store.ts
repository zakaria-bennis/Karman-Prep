import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { catalogQuestionBindingSchema } from "@/lib/catalog-practice/delivery-contract";
import type { AssignmentRecord, AssignmentStore } from "./service";
import type { SelectedAssignmentQuestion } from "./selection";

type HeaderRow = {
  id: string;
  request_id: string;
  request_fingerprint: string;
  educator_clerk_id: string;
  student_clerk_id: string;
  catalog_skill_id: string;
  title: string;
  due_at: string | null;
  status: string;
  revision: number;
};
type ItemRow = {
  position: number;
  question_id: string;
  stable_question_id: string;
  payload_sha256: string;
  source_pdf: string | null;
  source_page: number | null;
  delivery_snapshot: unknown;
};

// Canonical tables were deployed in the approved combined backend migration.
// Keep this narrow adapter until the generated Database registry is reconciled.
function catalogDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

function asRecord(
  header: HeaderRow,
  items: ItemRow[]
): AssignmentRecord<SelectedAssignmentQuestion> {
  if (!items.length || items.length > 10) throw new Error("Assignment items are unavailable");
  const deliveries = items.map((item, index) => {
    if (item.position !== index + 1) throw new Error("Assignment item order is invalid");
    const raw = item.delivery_snapshot as { binding?: unknown } | null;
    const binding = catalogQuestionBindingSchema.parse(raw?.binding);
    if (
      binding.questionId !== item.question_id ||
      binding.stableQuestionId !== item.stable_question_id ||
      binding.payloadSha256 !== item.payload_sha256 ||
      binding.catalogSkillId !== header.catalog_skill_id
    ) {
      throw new Error("Assignment question version differs from its stored binding");
    }
    return {
      snapshot: item.delivery_snapshot as SelectedAssignmentQuestion["snapshot"],
      sourcePdf: item.source_pdf,
      sourcePage: item.source_page,
    };
  });
  return {
    id: header.id,
    requestId: header.request_id,
    requestFingerprint: header.request_fingerprint,
    educatorClerkId: header.educator_clerk_id,
    studentClerkId: header.student_clerk_id,
    skillId: header.catalog_skill_id,
    questionIds: items.map((item) => item.question_id),
    deliveries,
    title: header.title,
    dueAt: header.due_at,
    status: z.enum(["draft", "active", "cancelled"]).parse(header.status),
    revision: header.revision,
  };
}

export const catalogAssignmentStore: AssignmentStore<SelectedAssignmentQuestion> = {
  async byRequest(educatorClerkId, requestId) {
    const { data, error } = await catalogDb()
      .from("catalog_assignments")
      .select("*")
      .eq("educator_clerk_id", educatorClerkId)
      .eq("request_id", requestId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.byId(data.id as string) : null;
  },

  async create(record) {
    const { data: id, error } = await catalogDb().rpc("create_catalog_assignment_draft", {
      p_request_id: record.requestId,
      p_request_fingerprint: record.requestFingerprint,
      p_educator_clerk_id: record.educatorClerkId,
      p_student_clerk_id: record.studentClerkId,
      p_catalog_skill_id: record.skillId,
      p_title: record.title,
      p_due_at: record.dueAt,
      p_items: record.deliveries.map((delivery) => ({
        questionId: delivery.snapshot.binding.questionId,
        stableQuestionId: delivery.snapshot.binding.stableQuestionId,
        payloadSha256: delivery.snapshot.binding.payloadSha256,
        sourcePdf: delivery.sourcePdf,
        sourcePage: delivery.sourcePage,
        snapshot: delivery.snapshot,
      })),
    });
    if (error || typeof id !== "string") throw error ?? new Error("Assignment was not saved");
    const saved = await this.byId(id);
    if (!saved) throw new Error("Assignment was not saved");
    return saved;
  },

  async scope(id) {
    const { data, error } = await catalogDb()
      .from("catalog_assignments")
      .select("student_clerk_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? { studentClerkId: data.student_clerk_id as string } : null;
  },

  async byId(id) {
    const db = catalogDb();
    const { data: header, error: headerError } = await db
      .from("catalog_assignments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (headerError) throw headerError;
    if (!header) return null;
    const { data: items, error: itemsError } = await db
      .from("catalog_assignment_items")
      .select("*")
      .eq("assignment_id", id)
      .order("position", { ascending: true });
    if (itemsError) throw itemsError;
    return asRecord(header as HeaderRow, (items ?? []) as ItemRow[]);
  },

  async updateMetadata(id, expectedRevision, patch) {
    const { data, error } = await catalogDb()
      .from("catalog_assignments")
      .update({
        title: patch.title,
        due_at: patch.dueAt,
        revision: expectedRevision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("revision", expectedRevision)
      .neq("status", "cancelled")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Assignment revision conflict");
    const saved = await this.byId(id);
    if (!saved) throw new Error("Assignment not found");
    return saved;
  },

  async activate(id, expectedRevision) {
    const { data, error } = await catalogDb()
      .from("catalog_assignments")
      .update({
        status: "active",
        revision: expectedRevision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("revision", expectedRevision)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Assignment revision conflict");
    const saved = await this.byId(id);
    if (!saved) throw new Error("Assignment not found");
    return saved;
  },

  async cancel(id, expectedRevision) {
    const { data, error } = await catalogDb()
      .from("catalog_assignments")
      .update({
        status: "cancelled",
        revision: expectedRevision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("revision", expectedRevision)
      .neq("status", "cancelled")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Assignment revision conflict");
    const saved = await this.byId(id);
    if (!saved) throw new Error("Assignment not found");
    return saved;
  },
};
