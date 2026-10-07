import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId, fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { RW_NODES, MATH_NODES, type NodeStatus } from "@/data/curriculum";
import ConstellationMap, { type MappedNode } from "@/components/learn/ConstellationMap";
import { initUserProgress } from "@/app/learn/actions";
import { fetchQuizAttemptForStudent } from "@/lib/supabase/queries/quiz/attempts";
import { quizNodeIdSchema, quizAttemptIdSchema } from "@/app/learn/quiz-action-schemas";

/** Keep existing node quizzes reachable without inventing new skill mastery. */
export default async function EarlierPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams?: Promise<{ resume?: string; lesson?: string }>;
}) {
  const { subject } = await params;
  const { resume, lesson } = (await searchParams) ?? {};
  if (subject !== "reading" && subject !== "math") notFound();
  if (resume && lesson) notFound();
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);
  const role = await fetchUserRole(userId);
  if (role === "parent") redirect("/dashboard/parent");
  if (role === "tutor") redirect("/tutor");
  if (role !== "student" && role !== "admin") redirect("/onboarding");

  let resumeNodeId: string | undefined;
  if (resume) {
    if (!quizAttemptIdSchema.safeParse(resume).success) notFound();
    const attempt = await fetchQuizAttemptForStudent(resume, userId);
    if (!attempt || attempt.completed_at) notFound();
    const subjectNodes = subject === "reading" ? RW_NODES : MATH_NODES;
    if (!subjectNodes.some((node) => node.id === attempt.node_id)) notFound();
    resumeNodeId = attempt.node_id;
  }
  if (lesson) {
    if (!quizNodeIdSchema.safeParse(lesson).success) notFound();
    const subjectNodes = subject === "reading" ? RW_NODES : MATH_NODES;
    if (!subjectNodes.some((node) => node.id === lesson)) notFound();
  }

  const supabase = createAdminClient();
  const ids = [...RW_NODES, ...MATH_NODES].map((node) => node.id);
  const readStatuses = async () => {
    const { data, error } = await supabase
      .from("learn_node_status")
      .select("node_id, status")
      .eq("user_id", userId)
      .in("node_id", ids);
    if (error) throw error;
    return data ?? [];
  };
  let rows = await readStatuses();
  const known = new Set(rows.map((row) => row.node_id));
  let initialized = false;
  // Admin impersonation is a read-only preview; never initialize another user's data.
  if (role === "student" && !isImpersonating) {
    for (const [section, nodes] of [
      ["reading", RW_NODES],
      ["math", MATH_NODES],
    ] as const) {
      if (!nodes.some((node) => known.has(node.id))) {
        await initUserProgress(section);
        initialized = true;
      }
    }
  }
  if (initialized) rows = await readStatuses();
  const status = new Map(rows.map((row) => [row.node_id, row.status as NodeStatus]));
  if (lesson && status.get(lesson) === "locked") notFound();
  const mapped = (nodes: typeof RW_NODES): MappedNode[] =>
    nodes.map((node) => ({
      ...node,
      status: status.get(node.id) ?? (node.id.endsWith("-00") ? "available" : "locked"),
    }));
  return (
    <>
      <ConstellationMap
        activeSubject={subject}
        readingNodes={mapped(RW_NODES)}
        mathNodes={mapped(MATH_NODES)}
        initialQuizNodeId={resumeNodeId}
        resumeAttemptId={resume ? resume : undefined}
        initialLessonNodeId={lesson}
      />
      <Link
        href={`/learn/${subject}`}
        className="fixed right-3 top-20 z-30 rounded-lg border border-bronze bg-night px-3 py-2 text-xs text-ivory"
      >
        Back to 39-skill catalog
      </Link>
    </>
  );
}
