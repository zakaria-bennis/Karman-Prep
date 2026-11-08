import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { getCoveredLegacyNodes } from "@/data/curriculum/legacy-skill-crosswalk";
import { PracticeSetFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ skillId: string }>;
  searchParams?: Promise<{ again?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { skillId } = await params;
  const skill = CATALOG_SKILLS.find((s) => s.id === decodeURIComponent(skillId));
  return { title: skill ? `${skill.label}: practice set` : "Practice set" };
}

/** A 10-question practice set in one skill, adaptive within the set. */
export default async function PracticeSetPage({ params, searchParams }: Params) {
  const { skillId } = await params;
  // "Try again" links carry a fresh `again` value, so the player remounts and starts a new set.
  const again = String((await searchParams)?.again ?? "").slice(0, 20);
  const skill = CATALOG_SKILLS.find((s) => s.id === decodeURIComponent(skillId));
  if (!skill) notFound();
  const { user } = await loadFlowUser(`/learn/set/${skill.id}`);
  // The skill's written lesson (no videos exist yet): the first legacy lesson it covers.
  const lesson = getCoveredLegacyNodes(skill.id)[0];
  return (
    <PracticeSetFlow
      key={`${skill.id}:${again}`}
      user={user}
      skillId={skill.id}
      exitHref={`/learn/${skill.subject}`}
      lessonHref={lesson ? `/learn/${skill.subject}/${lesson.id}` : null}
    />
  );
}
