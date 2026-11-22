// Lessons for the 72 skills (shared contract 5, overnight build 2026-11-22). Each skill's lesson, strategy
// quiz and video live in their own files and load on demand, so a skill's page carries only its own:
//   lessonFor(skillId)        the written lesson, with its skill (name, section, domain)
//   strategyQuizFor(skillId)  at most five questions, each { text, choices, right, why, subject }
//   videoFor(skillId)         the video's scenes, timings and narration address
// Skill IDs are the ones in src/lib/skills/ids72.ts. All three resolve to null or [] for a skill that has
// none yet, so callers can show "coming soon" instead of failing.
import { SKILLS72, skill72, type Skill72 } from "@/lib/skills/ids72";
import { LESSON_LOADERS, VIDEO_LOADERS } from "./registry";
import type { Lesson, LessonVideo, StrategyQuestion } from "./types";

export type * from "./types";
export type * from "./figures";

/** A lesson with its skill. */
export type SkillLessonData = Lesson & { skill: Skill72 };

/** The most questions a strategy quiz holds (the founder's rule, 2026-11-16). */
export const STRATEGY_QUIZ_MAX = 5;

/** True when this skill has a written lesson. */
export function hasLesson(skillId: string): boolean {
  return skillId in LESSON_LOADERS;
}

/** True when this skill has a video. */
export function hasVideo(skillId: string): boolean {
  return skillId in VIDEO_LOADERS;
}

/** The skill's written lesson, or null when it has none yet. */
export async function lessonFor(skillId: string): Promise<SkillLessonData | null> {
  const skill = skill72(skillId);
  const load = LESSON_LOADERS[skillId];
  if (!skill || !load) return null;
  const lesson = (await load()).default;
  return { ...lesson, skill };
}

/** The strategy quiz at the end of the skill's lesson: at most five questions, easy to harder. */
export async function strategyQuizFor(skillId: string): Promise<StrategyQuestion[]> {
  const lesson = await lessonFor(skillId);
  return lesson ? lesson.quiz.slice(0, STRATEGY_QUIZ_MAX) : [];
}

/** The strategy's name, for a quiz's start screen ("Fraction of the circle"), or null. */
export async function strategyNameFor(skillId: string): Promise<string | null> {
  return (await lessonFor(skillId))?.strategy.name ?? null;
}

/** The skill's video: its narrator, scenes and timings, and the narration's address (null until it is
 *  recorded). Null when the skill has no video yet. */
export async function videoFor(skillId: string): Promise<LessonVideo | null> {
  const load = VIDEO_LOADERS[skillId];
  if (!skill72(skillId) || !load) return null;
  return (await load()).default;
}

/** The ID of the skill with this name in the Library ("Circles" to "m-circles"). */
export function skillIdForName(name: string): string | undefined {
  return SKILLS72.find((s) => s.name === name)?.id;
}
