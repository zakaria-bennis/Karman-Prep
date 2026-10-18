import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchTutorScope } from "@/lib/supabase/queries/tutor";
import { calendarDateInZone } from "@/lib/catalog-assignments/session-homework-policy";
import { requireBriefingEducator } from "./access";

const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
const bookingSchema = z.object({
  id: uuid,
  student_id: uuid,
  tutor_id: uuid,
  scheduled_start: instant,
  scheduled_end: instant,
  status: z.literal("scheduled"),
});
const studentSchema = z.object({
  id: uuid,
  clerk_id: z.string(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
});

/** Select by educator-local day, including earlier sessions today; no UTC-midnight assumption. */
export async function readDailyBriefing(requestedDay?: string, now = new Date()) {
  const actor = await requireBriefingEducator();
  const db = createAdminClient() as unknown as SupabaseClient;
  const profileResult = await db
    .from("users")
    .select("id,clerk_id,time_zone")
    .eq("clerk_id", actor.clerkId)
    .maybeSingle();
  if (profileResult.error) throw new Error("Educator profile could not be loaded");
  const profile = z
    .object({ id: uuid, clerk_id: z.literal(actor.clerkId), time_zone: z.string().nullable() })
    .nullable()
    .parse(profileResult.data);
  let today: string;
  try {
    today = calendarDateInZone(now, profile?.time_zone ?? null);
  } catch {
    return { day: null, timeZone: null, sessions: [] };
  }
  const day = requestedDay ? z.iso.date().parse(requestedDay) : today;
  const timeZone = profile!.time_zone!;
  const midnight = Date.parse(`${day}T00:00:00Z`);
  const bookingsResult = await db
    .from("bookings")
    .select("id,student_id,tutor_id,scheduled_start,scheduled_end,status")
    .eq("tutor_id", profile!.id)
    .eq("status", "scheduled")
    .gte("scheduled_start", new Date(midnight - 14 * 60 * 60 * 1000).toISOString())
    .lt("scheduled_start", new Date(midnight + 38 * 60 * 60 * 1000).toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(201);
  if (bookingsResult.error) throw new Error("Schedule could not be loaded");
  const all = z.array(bookingSchema).parse(bookingsResult.data ?? []);
  // Do not silently turn a truncated schedule into an apparently complete day.
  if (all.length > 200 || all.some((row) => row.tutor_id !== profile!.id))
    throw new Error("Schedule is unavailable");
  const bookings = all.filter((row) => calendarDateInZone(row.scheduled_start, timeZone) === day);
  if (!bookings.length) return { day, timeZone, sessions: [] };
  const scope = await fetchTutorScope(actor.clerkId);
  if (!scope.studentClerkIds.length) return { day, timeZone, sessions: [] };
  // The same current roster used by canTutorAccessStudent constrains the private profile read.
  const studentIds = [...new Set(bookings.map((row) => row.student_id))];
  const studentsResult = await db
    .from("users")
    .select("id,clerk_id,email,first_name,last_name")
    .in("id", studentIds)
    .in("clerk_id", scope.studentClerkIds);
  if (studentsResult.error) throw new Error("Scheduled students could not be loaded");
  const students = z.array(studentSchema).parse(studentsResult.data ?? []);
  if (
    students.some(
      (row) => !studentIds.includes(row.id) || !scope.studentClerkIds.includes(row.clerk_id)
    )
  )
    throw new Error("Unexpected scheduled student");
  return {
    day,
    timeZone,
    sessions: bookings.flatMap((booking) => {
      const student = students.find((row) => row.id === booking.student_id);
      return student
        ? [
            {
              bookingId: booking.id,
              studentClerkId: student.clerk_id,
              studentLabel:
                [student.first_name, student.last_name].filter(Boolean).join(" ") || student.email,
              scheduledStart: booking.scheduled_start,
              scheduledEnd: booking.scheduled_end,
            },
          ]
        : [];
    }),
  };
}

export type DailyBriefing = Awaited<ReturnType<typeof readDailyBriefing>>;
