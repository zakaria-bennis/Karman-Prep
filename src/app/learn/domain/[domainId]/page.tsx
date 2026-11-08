import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { DomainQuizFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Domain quiz" };

/** About 12 questions across one Domain; it can raise several skills at once. */
export default async function DomainQuizPage({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const { domainId } = await params;
  const domain = SKILL_DOMAINS.find((d) => d.id === domainId);
  if (!domain) notFound();
  const { user } = await loadFlowUser();
  return (
    <DomainQuizFlow user={user} domainId={domain.id} label={domain.label} exitHref="/learn/tests" />
  );
}
