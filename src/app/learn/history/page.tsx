import Link from "next/link";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchLegacyLearningHistory } from "@/lib/supabase/queries/skill-catalog";
import { MATH_NODES, RW_NODES } from "@/data/curriculum";

export default async function LearningHistoryPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const history = await fetchLegacyLearningHistory(clerkId);
  const nodes = new Map([...RW_NODES, ...MATH_NODES].map((node) => [node.id, node]));
  return (
    <section className="mx-auto max-w-3xl px-6 pb-6 pt-24 text-ivory">
      <h1 className="text-2xl font-semibold">Earlier learning history</h1>
      <p className="mt-3 text-sm leading-relaxed text-taupe">
        Your individual lesson results remain available here. They have not been combined into new
        skill scores.
      </p>
      <Link href="/learn" className="mt-4 inline-block text-sm underline underline-offset-4">
        Back to skills
      </Link>
      {history.length === 0 && <p className="mt-6 text-taupe">No earlier learning results yet.</p>}
      <ul className="mt-6 space-y-3">
        {history.map((row) => {
          const node = nodes.get(row.node_id);
          return (
            <li key={row.node_id} className="rounded-xl border border-bronze bg-surface p-4">
              {node ? (
                <Link
                  href={`/learn/${node.subject}/${node.id}`}
                  className="underline underline-offset-4"
                >
                  {node.topic}
                </Link>
              ) : (
                <span>Earlier learning item ({row.node_id})</span>
              )}
              <p className="mt-2 text-sm text-taupe">{row.status.replace(/_/g, " ")}</p>
              {row.score != null && <p className="text-sm text-taupe">Score: {row.score}</p>}
              {row.attempts != null && (
                <p className="text-sm text-taupe">Quiz attempts: {row.attempts}</p>
              )}
              {row.watch_percentage != null && (
                <p className="text-sm text-taupe">Lesson watched: {row.watch_percentage}%</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
