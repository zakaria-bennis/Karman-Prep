/*
 * Made-up course data for the dev preview of the Library's opening animations
 * (/dev/library-intros): a student a little way into both courses, Math at 6% and Reading and
 * Writing at 8%. Built with the real course builder over fixed skill levels, so the box shows the
 * real Up next, Domains and squares. No database.
 */
import "server-only";
import { SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { buildCourse, type Course } from "@/lib/student/course";
import type { SkillLevel } from "@/lib/student/levels";
import { officialSkillsIn } from "@/lib/subskills/taxonomy";
import { subSkillQuestionCount } from "@/lib/subskills/map";

function fixtureLevels(): Map<string, SkillLevel> {
  const levels = new Map<string, SkillLevel>();
  let i = 0;
  for (const d of SKILL_DOMAINS) {
    for (const o of officialSkillsIn(d.id)) {
      for (const s of o.subSkills) {
        i++;
        if (i % 9 === 0) levels.set(s.id, 3 as SkillLevel);
        else if (i % 5 === 0) levels.set(s.id, 2 as SkillLevel);
        else if (i % 4 === 0) levels.set(s.id, 1 as SkillLevel);
      }
    }
  }
  return levels;
}

/** Both courses, with the percents the preview shows (Math 6, Reading and Writing 8). */
export function fixtureCourses(): { math: Course; reading: Course } {
  const levels = fixtureLevels();
  return {
    math: { ...buildCourse("math", levels, subSkillQuestionCount), progress: 0.06 },
    reading: { ...buildCourse("reading", levels, subSkillQuestionCount), progress: 0.08 },
  };
}
