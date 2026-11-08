"use server";
/*
 * School portal actions. Every input is checked with Zod, and every write re-checks that the
 * signed-in member may manage that class (src/lib/school/access.ts). Results come back as a
 * short message in the page address, so they survive a reload and need no client code.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { classForMember, requireSchoolContext } from "@/lib/school/access";
import { recordRenewal, renewalCheckoutUrl, schoolPortalUrl } from "@/lib/school/billing";
import { SCHOOL_HOMEWORK_KINDS, homeworkTitle } from "@/lib/school/homework";
import { revokeSchoolPracticeIfUnseated } from "@/lib/school/plan-bridge";
import { makeJoinCode } from "@/lib/school/terms";
import { untypedAdmin } from "@/lib/school/db";

const uuid = z.string().uuid();
const DAY_MS = 86_400_000;

function back(path: string, key: "done" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${key}=${encodeURIComponent(message)}`);
}

async function insertClassWithCode(schoolId: string, name: string, teacherUserId: string) {
  const supabase = untypedAdmin();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("school_classes")
      .insert({ school_id: schoolId, name, teacher_user_id: teacherUserId, join_code: makeJoinCode() })
      .select("id")
      .single();
    if (!error) return data.id as string;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Could not find a free join code.");
}

const createClassSchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function createClassAction(formData: FormData) {
  const ctx = await requireSchoolContext();
  const parsed = createClassSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) back("/school", "error", "Give the class a name of up to 80 characters.");
  const id = await insertClassWithCode(ctx.school.id, parsed.data.name, ctx.viewer.userId);
  revalidatePath("/school");
  back(`/school/classes/${id}`, "done", `${parsed.data.name} is ready. Share its join code.`);
}

const classOnly = z.object({ classId: uuid });

export async function newJoinCodeAction(formData: FormData) {
  const ctx = await requireSchoolContext();
  const parsed = classOnly.safeParse({ classId: formData.get("classId") });
  if (!parsed.success) back("/school", "error", "That class was not found.");
  const cls = await classForMember(ctx, parsed.data.classId);
  if (!cls) back("/school", "error", "That class was not found.");
  const supabase = untypedAdmin();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase
      .from("school_classes")
      .update({ join_code: makeJoinCode() })
      .eq("id", cls.id)
      .eq("school_id", ctx.school.id);
    if (!error) {
      revalidatePath(`/school/classes/${cls.id}`);
      back(`/school/classes/${cls.id}`, "done", "New join code made. The old one no longer works.");
    }
    if (error.code !== "23505") throw error;
  }
  back(`/school/classes/${cls.id}`, "error", "Could not make a new code. Try again.");
}

const assignSchema = z
  .object({
    classId: uuid,
    kind: z.enum(SCHOOL_HOMEWORK_KINDS),
    skillId: z.string().trim().max(120).optional(),
    domainId: z.string().trim().max(120).optional(),
    dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .transform((v) => ({
    ...v,
    targetId:
      v.kind === "skill_practice" ? (v.skillId ?? "") : v.kind === "domain_quiz" ? (v.domainId ?? "") : null,
  }));

export async function assignWorkAction(formData: FormData) {
  const ctx = await requireSchoolContext();
  const parsed = assignSchema.safeParse({
    classId: formData.get("classId"),
    kind: formData.get("kind"),
    skillId: formData.get("skillId") || undefined,
    domainId: formData.get("domainId") || undefined,
    dueOn: formData.get("dueOn"),
  });
  const classId = typeof formData.get("classId") === "string" ? String(formData.get("classId")) : "";
  const page = uuid.safeParse(classId).success ? `/school/classes/${classId}` : "/school";
  if (!parsed.success) back(page, "error", "Pick the work and a due date.");
  const cls = await classForMember(ctx, parsed.data.classId);
  if (!cls) back("/school", "error", "That class was not found.");
  const title = homeworkTitle(parsed.data.kind, parsed.data.targetId);
  if (!title) back(page, "error", "Pick a skill or a Domain for this work.");
  const due = Date.parse(`${parsed.data.dueOn}T00:00:00Z`);
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  if (!(due >= today && due <= today + 180 * DAY_MS))
    back(page, "error", "Pick a due date between today and six months from now.");
  const { error } = await untypedAdmin().from("school_assignments").insert({
    school_id: ctx.school.id,
    class_id: cls.id,
    assigned_by_user_id: ctx.viewer.userId,
    kind: parsed.data.kind,
    target_id: parsed.data.targetId,
    title,
    due_on: parsed.data.dueOn,
  });
  if (error) throw error;
  revalidatePath(page);
  back(page, "done", `Assigned to ${cls.name}: ${title}. It is in each student's Homework.`);
}

const assignmentSchema = z.object({ classId: uuid, assignmentId: uuid });

export async function cancelAssignmentAction(formData: FormData) {
  const ctx = await requireSchoolContext();
  const parsed = assignmentSchema.safeParse({
    classId: formData.get("classId"),
    assignmentId: formData.get("assignmentId"),
  });
  if (!parsed.success) back("/school", "error", "That work was not found.");
  const cls = await classForMember(ctx, parsed.data.classId);
  if (!cls) back("/school", "error", "That class was not found.");
  const { data, error } = await untypedAdmin()
    .from("school_assignments")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", parsed.data.assignmentId)
    .eq("class_id", cls.id)
    .is("cancelled_at", null)
    .select("title");
  if (error) throw error;
  const page = `/school/classes/${cls.id}`;
  revalidatePath(page);
  if (!data?.length) back(page, "error", "That work was already taken off.");
  back(page, "done", `Taken off Homework: ${data[0].title as string}.`);
}

const seatSchema = z.object({ classId: uuid, seatId: uuid });

export async function removeStudentAction(formData: FormData) {
  const ctx = await requireSchoolContext();
  const parsed = seatSchema.safeParse({ classId: formData.get("classId"), seatId: formData.get("seatId") });
  if (!parsed.success) back("/school", "error", "That student was not found.");
  const cls = await classForMember(ctx, parsed.data.classId);
  if (!cls) back("/school", "error", "That class was not found.");
  const supabase = untypedAdmin();
  const { data, error } = await supabase
    .from("school_seats")
    .update({ removed_at: new Date().toISOString(), removed_by_user_id: ctx.viewer.userId })
    .eq("id", parsed.data.seatId)
    .eq("class_id", cls.id)
    .eq("school_id", ctx.school.id)
    .is("removed_at", null)
    .select("student_user_id, student:users!school_seats_student_user_id_fkey (clerk_id, first_name)");
  if (error) throw error;
  const page = `/school/classes/${cls.id}`;
  if (!data?.length) back(page, "error", "That student had already left the class.");
  type Removed = {
    student_user_id: string;
    student: { clerk_id: string; first_name: string | null } | { clerk_id: string; first_name: string | null }[] | null;
  };
  const row = data[0] as Removed;
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  if (student) {
    await revokeSchoolPracticeIfUnseated({
      studentClerkId: student.clerk_id,
      studentUserId: row.student_user_id,
      schoolId: ctx.school.id,
    });
  }
  revalidatePath(page);
  back(page, "done", `${student?.first_name ?? "The student"} was removed from ${cls.name}.`);
}

function requireAdmin(role: string) {
  if (role !== "admin") back("/school/billing", "error", "Only a school admin can change billing.");
}

export async function startRenewalAction() {
  const ctx = await requireSchoolContext();
  requireAdmin(ctx.role);
  let url: string;
  try {
    url = await renewalCheckoutUrl(ctx);
  } catch (error) {
    console.error("[school] renewal checkout failed", error);
    back("/school/billing", "error", "Stripe could not open checkout. Try again in a minute.");
  }
  redirect(url);
}

export async function openSchoolBillingAction() {
  const ctx = await requireSchoolContext();
  requireAdmin(ctx.role);
  let url: string;
  try {
    url = await schoolPortalUrl(ctx);
  } catch (error) {
    console.error("[school] billing portal failed", error);
    back("/school/billing", "error", "Stripe could not open billing. Try again in a minute.");
  }
  redirect(url);
}

const renewalSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/);

/** Called by the billing page when Stripe sends the admin back with a checkout id. */
export async function confirmRenewal(sessionId: string): Promise<boolean> {
  const ctx = await requireSchoolContext();
  if (ctx.role !== "admin") return false;
  const parsed = renewalSchema.safeParse(sessionId);
  if (!parsed.success) return false;
  return recordRenewal(ctx, parsed.data);
}
