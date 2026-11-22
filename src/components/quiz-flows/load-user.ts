/* Server only. The signed-in student for a quiz-flow page, from the student portal's context. */
import { loadStudentContext } from "@/lib/student/context";
import type { ShellUser } from "./types";

export async function loadFlowUser(): Promise<{ clerkId: string; user: ShellUser }> {
  const ctx = await loadStudentContext();
  return {
    clerkId: ctx.clerkId,
    // the new frame (StageFrame) has no tabs and no account menu, so nav and menu stay empty
    user: { name: ctx.firstName, email: ctx.email, streak: ctx.streak.current, nav: [], menu: [] },
  };
}
