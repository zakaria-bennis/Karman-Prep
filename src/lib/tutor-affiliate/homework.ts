// ============================================================
// Tutor homework — work a tutor assigns to one student: a skill
// practice set, a Domain quiz or a full-length test, due on a date.
// It appears in the student's Homework. Every write re-checks the
// tutor's rights through resolveAffiliateManagement.
// ============================================================

import { subSkillTitle } from "@/lib/subskills/taxonomy";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { removeAffiliateStudent, resolveAffiliateManagement } from "./service";
import type { AffiliateDeps } from "./types";

export const HOMEWORK_KINDS = ["skill_practice", "domain_quiz", "full_length_test"] as const;
export type HomeworkKind = (typeof HOMEWORK_KINDS)[number];
export type HomeworkStatus = "assigned" | "completed" | "cancelled";

export interface HomeworkItem {
  id: string;
  studentUserId: string;
  assignedByUserId: string;
  kind: HomeworkKind;
  /** Catalog skill id, SAT Domain id, or null for a full-length test. */
  targetId: string | null;
  title: string;
  note: string | null;
  /** YYYY-MM-DD */
  dueOn: string;
  status: HomeworkStatus;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface HomeworkStore {
  insert(
    input: Omit<HomeworkItem, "id" | "status" | "completedAt" | "cancelledAt">
  ): Promise<HomeworkItem>;
  byId(id: string): Promise<HomeworkItem | null>;
  /** Newest first is not required; callers sort. */
  listForStudent(studentUserId: string): Promise<HomeworkItem[]>;
  cancel(id: string, at: string): Promise<void>;
  cancelOpenFromAssigner(
    studentUserId: string,
    assignedByUserId: string,
    at: string
  ): Promise<number>;
}

export type HomeworkDeps = AffiliateDeps & { homework: HomeworkStore };

/** The title a target gets, or null when the target doesn't fit the kind. */
export function homeworkTarget(
  kind: HomeworkKind,
  targetId: string | null
): { title: string } | null {
  if (kind === "full_length_test") {
    return targetId === null ? { title: "Full-length practice test" } : null;
  }
  if (kind === "skill_practice") {
    // A sub-skill (founder, 2026-11-08), or a whole catalog skill for older assignments.
    const title = targetId ? subSkillTitle(targetId) : undefined;
    const skill = CATALOG_SKILLS.find((s) => s.id === targetId);
    return title
      ? { title: `Practice: ${title}` }
      : skill
        ? { title: `Practice: ${skill.label}` }
        : null;
  }
  const domain = SKILL_DOMAINS.find((d) => d.id === targetId);
  return domain ? { title: `Domain quiz: ${domain.label}` } : null;
}

const DAY_MS = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Due today or later (a day of leeway for time zones), and within a year. */
export function dueDateProblem(dueOn: string, now: Date): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`))) {
    return "Pick a due date.";
  }
  if (dueOn < isoDay(new Date(now.getTime() - DAY_MS))) return "The due date has already passed.";
  if (dueOn > isoDay(new Date(now.getTime() + 365 * DAY_MS))) {
    return "Pick a due date within the next year.";
  }
  return null;
}

export interface AssignHomeworkInput {
  actorClerkId: string;
  studentClerkId: string;
  kind: HomeworkKind;
  targetId: string | null;
  dueOn: string;
  note: string | null;
}

export async function assignHomework(
  deps: HomeworkDeps,
  input: AssignHomeworkInput,
  now: Date = new Date()
): Promise<HomeworkItem> {
  const rights = await resolveAffiliateManagement(deps, {
    actorClerkId: input.actorClerkId,
    studentClerkId: input.studentClerkId,
  });
  if (!rights.allowed || !rights.capabilities.has("assign") || !rights.student) {
    throw new Error("You can't assign work to this student right now.");
  }
  const target = homeworkTarget(input.kind, input.targetId);
  if (!target) throw new Error("Pick a skill, a Domain or a full-length test.");
  const dateProblem = dueDateProblem(input.dueOn, now);
  if (dateProblem) throw new Error(dateProblem);

  const actor = await deps.store.userByClerkId(input.actorClerkId);
  if (!actor) throw new Error("You can't assign work to this student right now.");
  const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;

  return deps.homework.insert({
    studentUserId: rights.student.id,
    assignedByUserId: actor.id,
    kind: input.kind,
    targetId: input.targetId,
    title: target.title,
    note,
    dueOn: input.dueOn,
    createdAt: now.toISOString(),
  });
}

export async function cancelHomework(
  deps: HomeworkDeps,
  input: { actorClerkId: string; homeworkId: string },
  now: Date = new Date()
): Promise<{ studentUserId: string }> {
  const [actor, item] = await Promise.all([
    deps.store.userByClerkId(input.actorClerkId),
    deps.homework.byId(input.homeworkId),
  ]);
  if (!actor || !item || (item.assignedByUserId !== actor.id && actor.role !== "admin")) {
    throw new Error("That homework is not yours to cancel.");
  }
  if (item.status === "assigned") await deps.homework.cancel(item.id, now.toISOString());
  return { studentUserId: item.studentUserId };
}

/** Remove a student from the tutor's group and clear the tutor's open homework for them. */
export async function removeStudentAndCancelHomework(
  deps: HomeworkDeps,
  input: { actorClerkId: string; studentUserId: string },
  now: Date = new Date()
): Promise<void> {
  const { affiliateId } = await removeAffiliateStudent(deps, input, now);
  const affiliate = await deps.store.affiliateById(affiliateId);
  if (affiliate) {
    await deps.homework.cancelOpenFromAssigner(
      input.studentUserId,
      affiliate.tutorUserId,
      now.toISOString()
    );
  }
}

/** Open first (soonest due), then finished and cancelled work, newest first. */
export function sortHomework(items: readonly HomeworkItem[]): HomeworkItem[] {
  const open = items
    .filter((i) => i.status === "assigned")
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const done = items
    .filter((i) => i.status !== "assigned")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...open, ...done];
}
