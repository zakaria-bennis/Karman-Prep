import { createAdminClient } from "@/lib/supabase/server";

async function userId(clerkId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}

/** True when the student is in a cohort or has a 1:1 tutor; decides "Flag for my tutor". */
export async function hasTutor(clerkId: string): Promise<boolean> {
  const id = await userId(clerkId);
  if (!id) return false;
  const db = createAdminClient();
  const [members, assignments] = await Promise.all([
    db.from("cohort_members").select("cohort_id").eq("user_id", id).limit(1),
    db.from("tutor_assignments").select("tutor_user_id").eq("student_user_id", id).limit(1),
  ]);
  if (members.error) throw members.error;
  if (assignments.error) throw assignments.error;
  return !!(members.data?.length || assignments.data?.length);
}
