"use server";

// ============================================================
// /admin/schools: create a school. Admin only (requireAdmin
// reads the real role from the database), input through Zod,
// service-role writes to `schools` and `school_members` (the
// school's admin, who must already have an account), and, when
// it answers a request, a note on that request. Nothing is sent
// to anyone and no account is made.
// ============================================================

import { revalidatePath } from "next/cache";
import { AdminRequiredError, requireAdmin } from "@/lib/auth/admin-guard";
import { adminDb } from "@/lib/admin/plans";
import { SCHOOL_CALL_SOURCE } from "@/lib/marketing/school-call";
import { createSchoolInput, type CreateSchoolInput } from "./schemas";

export type CreateSchoolResult = { ok: true; message: string } | { ok: false; error: string };

/** An email as an exact, case-blind `ilike` pattern: its own % and _ match only themselves. */
function exactly(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function createSchool(input: CreateSchoolInput): Promise<CreateSchoolResult> {
  const parsed = createSchoolInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return { ok: false, error: "Admins only." };
    throw err;
  }
  const { name, freeUntil, adminEmail, requestId } = parsed.data;
  const db = adminDb();

  try {
    const people = await db
      .from("users")
      .select("id, email")
      .ilike("email", exactly(adminEmail))
      .limit(2);
    if (people.error) throw new Error(people.error.message);
    const person = (people.data ?? [])[0] as { id: string } | undefined;
    if (!person)
      return {
        ok: false,
        error: `No Karman account uses ${adminEmail}. They need to sign up first with that email, then create the school again.`,
      };

    let request: { id: string; details: Record<string, unknown> } | null = null;
    if (requestId) {
      const found = await db
        .from("marketing_leads")
        .select("id, details")
        .eq("id", requestId)
        .eq("source", SCHOOL_CALL_SOURCE)
        .maybeSingle();
      if (found.error) throw new Error(found.error.message);
      if (!found.data) return { ok: false, error: "That request isn't there any more." };
      request = found.data as { id: string; details: Record<string, unknown> };
      if (request.details?.schoolId)
        return { ok: false, error: "A school was already created from that request." };
    }

    // the same person already runs a school of this name: most likely a second press
    const same = await db.from("schools").select("id").ilike("name", exactly(name));
    if (same.error) throw new Error(same.error.message);
    const sameIds = ((same.data ?? []) as { id: string }[]).map((s) => s.id);
    if (sameIds.length > 0) {
      const theirs = await db
        .from("school_members")
        .select("school_id")
        .eq("user_id", person.id)
        .in("school_id", sameIds)
        .limit(1);
      if (theirs.error) throw new Error(theirs.error.message);
      if ((theirs.data ?? []).length > 0)
        return { ok: false, error: `${adminEmail} already runs a school called ${name}.` };
    }

    const school = await db
      .from("schools")
      .insert({ name, free_until: freeUntil })
      .select("id")
      .single();
    if (school.error || !school.data) throw new Error(school.error?.message ?? "no school row");
    const schoolId = (school.data as { id: string }).id;

    const member = await db
      .from("school_members")
      .insert({ school_id: schoolId, user_id: person.id, role: "admin" });
    if (member.error) {
      await db.from("schools").delete().eq("id", schoolId); // no school without its admin
      throw new Error(member.error.message);
    }

    if (request) {
      const linked = await db
        .from("marketing_leads")
        .update({ details: { ...request.details, schoolId } })
        .eq("id", request.id);
      if (linked.error) console.error("[schools] request not linked:", linked.error.message);
    }
  } catch (err) {
    console.error("[schools] create failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Couldn't create the school. Try again." };
  }

  revalidatePath("/admin/schools");
  revalidatePath("/admin/crm");
  return {
    ok: true,
    message: `${name} is set up, free until ${freeUntil}. ${adminEmail} is its school admin.`,
  };
}
