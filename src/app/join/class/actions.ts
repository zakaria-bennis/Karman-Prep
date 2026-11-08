"use server";
/*
 * A student joins a school class with its code. The seat gives them a Practice plan of their
 * own (src/lib/school/plan-bridge.ts). Only student accounts can take a seat.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { grantSchoolPractice } from "@/lib/school/plan-bridge";
import { JOIN_CODE_PATTERN, normalizeJoinCode } from "@/lib/school/terms";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { untypedAdmin } from "@/lib/school/db";

const codeSchema = z
  .string()
  .max(20)
  .transform(normalizeJoinCode)
  .refine((c) => JOIN_CODE_PATTERN.test(c));

function back(key: "joined" | "error", value: string): never {
  redirect(`/join/class?${key}=${encodeURIComponent(value)}`);
}

export async function joinClassAction(formData: FormData) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in?redirect_url=/join/class");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const parsed = codeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!parsed.success) back("error", "Class codes are six letters and numbers, like LKV3PQ.");
  const supabase = untypedAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user) back("error", "Finish setting up your account first.");
  if (user.role !== "student") back("error", "Only student accounts can join a class.");
  const { data: cls } = await supabase
    .from("school_classes")
    .select("id, name, school_id, archived_at, school:schools!school_classes_school_id_fkey (name)")
    .eq("join_code", parsed.data)
    .maybeSingle();
  if (!cls || cls.archived_at) back("error", "No class has that code. Check it with your teacher.");
  const { data: existing } = await supabase
    .from("school_seats")
    .select("id")
    .eq("class_id", cls.id)
    .eq("student_user_id", user.id)
    .is("removed_at", null)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase
      .from("school_seats")
      .insert({ school_id: cls.school_id, class_id: cls.id, student_user_id: user.id });
    if (error && error.code !== "23505") throw error;
  }
  await grantSchoolPractice({ studentClerkId: clerkId, schoolId: cls.school_id as string });
  const school = Array.isArray(cls.school) ? cls.school[0] : cls.school;
  back("joined", `${cls.name as string}${school?.name ? ` at ${school.name}` : ""}`);
}
