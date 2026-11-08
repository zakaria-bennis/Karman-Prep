import "server-only";
/*
 * Who may use the school portal: a user with a school_members row (admin or teacher).
 * Admins see every class of their school; teachers see the classes they teach.
 * Karman admins (users.role 'admin') may open any school for support.
 */
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { untypedAdmin } from "@/lib/school/db";

export interface SchoolViewer {
  userId: string;
  clerkId: string;
  firstName: string | null;
  email: string | null;
}

export interface SchoolRecord {
  id: string;
  name: string;
  freeUntil: string;
  billingStatus: "free_year" | "renewal_set" | "active" | "past_due" | "canceled";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface SchoolContext {
  viewer: SchoolViewer;
  school: SchoolRecord;
  role: "admin" | "teacher";
}

export interface ClassRecord {
  id: string;
  name: string;
  joinCode: string;
  teacherUserId: string | null;
  createdAt: string;
}

/** The signed-in school member and their school, or null when they are not one. */
export async function loadSchoolContext(): Promise<SchoolContext | null> {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) return null;
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const supabase = untypedAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id, clerk_id, first_name, email")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("school_members")
    .select(
      "role, school:schools!school_members_school_id_fkey (id, name, free_until, billing_status, stripe_customer_id, stripe_subscription_id)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  type SchoolRow = {
    id: string;
    name: string;
    free_until: string;
    billing_status: SchoolRecord["billingStatus"];
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  };
  const raw = (membership as { school: SchoolRow | SchoolRow[] | null }).school;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return null;
  return {
    viewer: {
      userId: user.id as string,
      clerkId: user.clerk_id as string,
      firstName: (user.first_name as string | null) ?? null,
      email: (user.email as string | null) ?? null,
    },
    school: {
      id: s.id,
      name: s.name,
      freeUntil: s.free_until,
      billingStatus: s.billing_status,
      stripeCustomerId: s.stripe_customer_id,
      stripeSubscriptionId: s.stripe_subscription_id,
    },
    role: (membership as { role: "admin" | "teacher" }).role,
  };
}

export async function requireSchoolContext(): Promise<SchoolContext> {
  const ctx = await loadSchoolContext();
  if (!ctx) redirect("/dashboard/student");
  return ctx;
}

/** The classes this member may see: all of the school's for an admin, their own for a teacher. */
export async function visibleClasses(ctx: SchoolContext): Promise<ClassRecord[]> {
  const supabase = untypedAdmin();
  let query = supabase
    .from("school_classes")
    .select("id, name, join_code, teacher_user_id, created_at")
    .eq("school_id", ctx.school.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (ctx.role === "teacher") query = query.eq("teacher_user_id", ctx.viewer.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (
    (data ?? []) as {
      id: string;
      name: string;
      join_code: string;
      teacher_user_id: string | null;
      created_at: string;
    }[]
  ).map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.join_code,
    teacherUserId: c.teacher_user_id,
    createdAt: c.created_at,
  }));
}

/** The class if this member may manage it, else null. */
export async function classForMember(
  ctx: SchoolContext,
  classId: string
): Promise<ClassRecord | null> {
  const classes = await visibleClasses(ctx);
  return classes.find((c) => c.id === classId) ?? null;
}
