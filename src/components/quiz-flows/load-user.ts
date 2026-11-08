/* Server only. The signed-in student for a quiz-flow page, from the student portal's context. */
import { studentNav } from "@/components/student-portal/StudentPortal";
import { loadStudentContext } from "@/lib/student/context";
import type { ShellUser } from "./types";

export async function loadFlowUser(): Promise<{ clerkId: string; user: ShellUser }> {
  const ctx = await loadStudentContext();
  return {
    clerkId: ctx.clerkId,
    user: {
      name: ctx.firstName,
      email: ctx.email,
      streak: ctx.streak.current,
      nav: studentNav(ctx),
    },
  };
}
