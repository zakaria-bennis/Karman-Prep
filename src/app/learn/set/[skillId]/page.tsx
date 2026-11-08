import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { getSubSkill, subSkillTitle } from "@/lib/subskills/taxonomy";
import { getCoveredLegacyNodes } from "@/data/curriculum/legacy-skill-crosswalk";
import { PracticeSetFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ skillId: string }>;
  searchParams?: Promise<{ again?: string }>;
};

/** The set is a sub-skill (founder, 2026-11-08) or, for older links, a whole catalog skill. */
function resolve(raw: string) {
  const id = decodeURIComponent(raw);
  const sub = getSubSkill(id);
  const skill = CATALOG_SKILLS.find((s) => s.id === (sub?.skillId ?? id));
  return skill ? { id: sub?.id ?? skill.id, skill, title: subSkillTitle(id) ?? skill.label } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = resolve((await params).skillId);
  return { title: found ? `${found.title}: practice set` : "Practice set" };
}

/** A 10-question practice set in one skill, adaptive within the set. */
export default async function PracticeSetPage({ params, searchParams }: Params) {
  const { skillId } = await params;
  // "Try again" links carry a fresh `again` value, so the player remounts and starts a new set.
  const again = String((await searchParams)?.again ?? "").slice(0, 20);
  const found = resolve(skillId);
  if (!found) notFound();
  const { skill } = found;
  const { user } = await loadFlowUser();
  // The skill's written lesson (no videos exist yet): the first legacy lesson it covers.
  const lesson = getCoveredLegacyNodes(skill.id)[0];
  return (
    <PracticeSetFlow
      key={`${found.id}:${again}`}
      user={user}
      skillId={found.id}
      exitHref={`/learn/${skill.subject}`}
      lessonHref={lesson ? `/learn/${skill.subject}/${lesson.id}` : null}
    />
  );
}
