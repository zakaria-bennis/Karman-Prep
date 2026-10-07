import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchLegacyLearningHistory } from "@/lib/supabase/queries/skill-catalog";
import { fetchAllAttemptsForStudent } from "@/lib/supabase/queries/quiz/attempts";
import { buildLearnDashboard } from "@/lib/learn/dashboard";
import LearnDashboard from "@/components/learn/LearnDashboard";

export const metadata: Metadata = {
  title: "Learn — Karman",
  description: "Continue SAT practice, review answers, and explore skills.",
};

export default async function LearnPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const [history, attempts] = await Promise.all([
    fetchLegacyLearningHistory(clerkId),
    fetchAllAttemptsForStudent(clerkId),
  ]);
  return <LearnDashboard dashboard={buildLearnDashboard(history, attempts)} />;
}
