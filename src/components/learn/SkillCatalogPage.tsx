import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchLegacyLearningHistory } from "@/lib/supabase/queries/skill-catalog";
import type { Subject } from "@/data/curriculum";
import SkillCatalogMap from "./SkillCatalogMap";

export default async function SkillCatalogPage({ subject }: { subject: Subject }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const history = await fetchLegacyLearningHistory(clerkId);
  return <SkillCatalogMap subject={subject} history={history} />;
}
