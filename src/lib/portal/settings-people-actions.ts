"use server";

/*
 * Settings, Parent, tutor and class: where the student stands with a tutor's group and their school
 * classes (read when the folder opens), and joining a class with its code. Joining, leaving or
 * dismissing a tutor's group are the tutor code's own actions (src/app/join/actions.ts).
 */
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import {
  getStudentAffiliateStatus,
  type StudentAffiliateStatus,
} from "@/lib/tutor-affiliate/service";
import { joinSchoolClass, type JoinClassResult } from "@/lib/school/join-class";
import { ownStudent, portalDb, viewedStudent, type Failure } from "./own-student";
import { classCodeSchema, emptySchema } from "./settings-schemas";

export interface PeopleState {
  tutor: StudentAffiliateStatus;
  /** The school classes the student sits in: "Algebra 2", "Lincoln High". */
  classes: { name: string; school: string | null }[];
}

type SeatRow = {
  class:
    | {
        name: string;
        archived_at: string | null;
        school: { name: string } | { name: string }[] | null;
      }
    | {
        name: string;
        archived_at: string | null;
        school: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

const one = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

export async function actionPeople(
  input: unknown
): Promise<({ ok: true } & PeopleState) | Failure> {
  if (!emptySchema.safeParse(input).success) return { ok: false, error: "Try that again." };
  const who = await viewedStudent();
  if (!who.ok) return who;
  try {
    const [tutor, seats] = await Promise.all([
      getStudentAffiliateStatus(affiliateDeps, who.student.clerkId),
      portalDb()
        .from("school_seats")
        .select(
          "class:school_classes!school_seats_class_id_fkey (name, archived_at, school:schools!school_classes_school_id_fkey (name))"
        )
        .eq("student_user_id", who.student.id)
        .is("removed_at", null),
    ]);
    const classes = ((seats.data ?? []) as SeatRow[]).flatMap((row) => {
      const cls = one(row.class);
      if (!cls || cls.archived_at) return [];
      return [{ name: cls.name, school: one(cls.school)?.name ?? null }];
    });
    return { ok: true, tutor, classes };
  } catch (e) {
    console.error("[settings] people read failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "This didn't load. Try again in a moment." };
  }
}

/** Joins the class whose code the student typed; the seat gives them Practice from the school. */
export async function actionJoinClass(input: unknown): Promise<JoinClassResult> {
  const parsed = classCodeSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Class codes are six letters and numbers, like LKV3PQ.",
    };
  const who = await ownStudent();
  if (!who.ok) return who;
  try {
    return await joinSchoolClass(who.student, parsed.data.code);
  } catch (e) {
    console.error("[settings] class join failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "We couldn't add you just now. Try again in a moment." };
  }
}
