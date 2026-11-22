/*
 * Everything the student portal shows about the signed-in student, read in one go on the server.
 * The sources are the ones the old portal read (src/lib/student/), so nothing new is stored.
 */
import "server-only";
import type { StudentContext } from "@/lib/student/context";
import { loadSkillLevels } from "@/lib/student/skill-levels-server";
import { subSkillQuestionCount } from "@/lib/subskills/map";
import { SECTIONS, SKILLS } from "@/app/dev/shell/skills72";
import type { PortalData } from "./data";
import { portalPlanOf } from "./plan";
import { bridgedLevel, bridgedQuestions } from "./skill-bridge";

const NAMES = SECTIONS.flatMap((s) => SKILLS[s].flatMap((d) => d.skills.map((k) => k.name)));

export async function loadPortalData(ctx: StudentContext): Promise<PortalData> {
  const levels = await loadSkillLevels(ctx.clerkId);
  const skills = Object.fromEntries(
    NAMES.map((name) => [
      name,
      {
        level: bridgedLevel(name, levels),
        questions: bridgedQuestions(name, subSkillQuestionCount),
      },
    ])
  );
  return { plan: portalPlanOf(ctx.plan.id), firstName: ctx.firstName, skills };
}
