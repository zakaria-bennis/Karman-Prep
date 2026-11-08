/*
 * Endless mode (founder, 2026-11-07): untimed and adaptive, with the mistake log inside. The
 * full algorithm is still to be designed; this first rule chains 10-question practice sets:
 *   1. If a skill below Conquered has misses in the last 14 days, practice the one missed most
 *      recently (bring mistakes back while they're fresh).
 *   2. Otherwise, practice Up next of the course that is further behind (biggest score gain).
 * Pure: the page passes in the answers and courses.
 */
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import type { Course } from "./course";
import type { SkillLevel } from "./levels";

export interface MistakeAnswer {
  skillId: string;
  sessionId: string;
  correct: boolean;
  at: string | number;
}

export interface MistakeEntry {
  skillId: string;
  label: string;
  misses: number;
  /** The newest practice set with a miss, for its review. */
  sessionId: string;
  lastMissMs: number;
}

const RECENT_MS = 14 * 86_400_000;
const label = (id: string) => CATALOG_SKILLS.find((s) => s.id === id)?.label ?? "Skill";
const ms = (at: string | number) => (typeof at === "number" ? at : Date.parse(at));

/** Misses grouped by skill, newest first. */
export function mistakeLog(answers: readonly MistakeAnswer[]): MistakeEntry[] {
  const by = new Map<string, MistakeEntry>();
  for (const a of answers) {
    if (a.correct) continue;
    const t = ms(a.at);
    if (!Number.isFinite(t)) continue;
    const e = by.get(a.skillId);
    if (!e) {
      by.set(a.skillId, {
        skillId: a.skillId,
        label: label(a.skillId),
        misses: 1,
        sessionId: a.sessionId,
        lastMissMs: t,
      });
    } else {
      e.misses += 1;
      if (t > e.lastMissMs) {
        e.lastMissMs = t;
        e.sessionId = a.sessionId;
      }
    }
  }
  return [...by.values()].sort((a, b) => b.lastMissMs - a.lastMissMs);
}

/** The skill the next endless set practices, or null when there is nothing to pick. */
export function nextEndlessSkill(
  log: readonly MistakeEntry[],
  levels: ReadonlyMap<string, SkillLevel>,
  courses: readonly Course[],
  nowMs: number
): string | null {
  const fresh = log.find(
    (e) => nowMs - e.lastMissMs <= RECENT_MS && (levels.get(e.skillId) ?? 0) < 4
  );
  if (fresh) return fresh.skillId;
  const behind = [...courses].sort((a, b) => a.progress - b.progress);
  for (const c of behind) if (c.upNext) return c.upNext.id;
  return null;
}
