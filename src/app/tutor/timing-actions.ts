"use server";
// Extra time per student, set by an admin or the student's own tutor (quiz engine spec, Data).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { setTimingAccommodation } from "@/lib/supabase/queries/quiz/saved";

const schema = z.object({
  studentClerkId: z.string().min(1).max(128),
  value: z.enum(["standard", "time_and_half", "double"]),
});

export async function actionSetTimingAccommodation(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  if (!(await canTutorAccessStudent(userId, parsed.studentClerkId))) throw new Error("Not allowed");
  await setTimingAccommodation(parsed.studentClerkId, parsed.value);
  revalidatePath(`/tutor/${encodeURIComponent(parsed.studentClerkId)}`);
}
