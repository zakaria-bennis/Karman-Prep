"use server";

// A school's "book a call" request from /schools (founder, 2026-11-12). Checked again with Zod, stored in
// `marketing_leads` under the school_call source with its answers, and given a CRM contact (tagged
// "school", with a follow-up due the next school day) so it shows in /admin/crm. Nothing is sent: no
// email, no audience, no message of any kind. Someone at Karman reads it in the admin and calls back.
import type { SupabaseClient } from "@supabase/supabase-js";
import { CALL_RULES, nextSchoolDay, SCHOOL_CALL_SOURCE } from "@/lib/marketing/school-call";
import { schoolCallSchema } from "@/lib/marketing/school-call-schema";
import { createAdminClient } from "@/lib/supabase/server";

export type SchoolCallResult =
  | { ok: true }
  | { ok: false; fields: Partial<Record<string, string>> }
  | { ok: false; error: "server" };

const FIELDS = new Set(Object.keys(CALL_RULES));

export async function submitSchoolCall(input: Record<string, string>): Promise<SchoolCallResult> {
  const parsed = schoolCallSchema.safeParse(input ?? {});
  if (!parsed.success) {
    const fields: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fields[key] ??= issue.message;
    }
    // a filled trap gets the same quiet "done" a person gets, so the bot learns nothing
    if (fields.website) return { ok: true };
    // anything that isn't one of the form's own fields can't be shown beside a field
    if (Object.keys(fields).some((k) => !FIELDS.has(k))) return { ok: false, error: "server" };
    return { ok: false, fields };
  }
  const d = parsed.data;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[school-call] the database is not configured; the request was not kept");
    return { ok: false, error: "server" };
  }

  const now = new Date();
  const details: Record<string, string> = {
    school: d.school,
    schoolRole: d.role,
    students: d.students,
    starting: d.start,
    ...(d.phone ? { phone: d.phone } : {}),
    ...(d.callTime ? { callTime: d.callTime } : {}),
  };
  // untyped: the crm_* tables are newer than the generated types
  const db = createAdminClient() as unknown as SupabaseClient;
  try {
    const { error } = await db.from("marketing_leads").upsert(
      {
        email: d.email,
        source: SCHOOL_CALL_SOURCE,
        name: d.name,
        details,
        updated_at: now.toISOString(),
      },
      { onConflict: "email,source" }
    );
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("[school-call] could not record the request:", (error as Error).message);
    return { ok: false, error: "server" };
  }

  // Best effort from here: the request is safe, and the CRM lists it from marketing_leads regardless.
  try {
    await addToCrm(db, d.email, d.school, now);
  } catch (error) {
    console.error("[school-call] CRM contact not updated:", (error as Error).message);
  }
  return { ok: true };
}

/** The contact's crm_contacts row, a "school" tag, and one open follow-up to call back. */
async function addToCrm(db: SupabaseClient, key: string, school: string, now: Date): Promise<void> {
  const contact = await db
    .from("crm_contacts")
    .upsert({ contact_key: key }, { onConflict: "contact_key", ignoreDuplicates: true });
  if (contact.error) throw new Error(contact.error.message);
  const tag = await db
    .from("crm_tags")
    .upsert(
      { contact_key: key, tag: "school" },
      { onConflict: "contact_key,tag", ignoreDuplicates: true }
    );
  if (tag.error) throw new Error(tag.error.message);
  const title = `Call back about ${school}`;
  const open = await db
    .from("crm_tasks")
    .select("id")
    .eq("contact_key", key)
    .eq("title", title)
    .is("done_at", null)
    .limit(1);
  if (open.error) throw new Error(open.error.message);
  if ((open.data ?? []).length > 0) return;
  const task = await db
    .from("crm_tasks")
    .insert({ contact_key: key, title, due_on: nextSchoolDay(now) });
  if (task.error) throw new Error(task.error.message);
}
