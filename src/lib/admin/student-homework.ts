// ============================================================
// Student homework for /admin/students/[clerkId]: one shape for
// every homework table (tutor homework, question sets,
// checkpoint retakes, cohort homework, assigned tests) and the
// pure mappers into it. The reads are in students.ts. Tested in
// students.test.ts.
// ============================================================

import type { Tone } from "@/components/admin/workbench";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";

export type HomeworkSource = "tutor" | "catalog" | "checkpoint" | "cohort" | "test";

export const HOMEWORK_SOURCE_LABEL: Readonly<Record<HomeworkSource, string>> = {
  tutor: "Tutor homework",
  catalog: "Question set",
  checkpoint: "Checkpoint",
  cohort: "Cohort homework",
  test: "Assigned test",
};

export interface HomeworkItem {
  key: string;
  source: HomeworkSource;
  title: string;
  detail: string | null;
  assignedAt: string | null;
  dueOn: string | null;
  status: string;
  tone: Tone;
  completedAt: string | null;
}

export interface TutorHomeworkRow {
  id: string;
  kind: string;
  title: string;
  note: string | null;
  due_on: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}
export interface CatalogAssignmentRow {
  id: string;
  title: string;
  catalog_skill_id: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
}
export interface CheckpointAssignmentRow {
  id: string;
  checkpoint_id: string;
  reason: string | null;
  assigned_at: string;
  cooldown_override: boolean | null;
}
export interface CohortHomeworkRow {
  id: string;
  cohort_id: string;
  title: string;
  body: string | null;
  assigned_at: string;
  due_at: string | null;
}
export interface StudentAssignmentRow {
  id: string;
  kind: string;
  section: string | null;
  title: string;
  scheduled_for: string | null;
  unlocked_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  skill_practice: "Skill practice",
  domain_quiz: "Domain quiz",
  full_length_test: "Full-length test",
  full_length: "Full-length test",
  time_trial: "Time trial",
};
const SKILL_LABEL = new Map(CATALOG_SKILLS.map((skill) => [skill.id, skill.label]));

function joinDetail(...parts: Array<string | null | undefined>): string | null {
  const text = parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(". ");
  if (!text) return null;
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

/** A date-only due date counts as past once that day is over (UTC). */
export function isPastDue(due: string | null, now: Date): boolean {
  if (!due) return false;
  if (due.length === 10) return due < now.toISOString().slice(0, 10);
  const time = Date.parse(due);
  return Number.isFinite(time) && time < now.getTime();
}

export function mapTutorHomework(r: TutorHomeworkRow, now: Date): HomeworkItem {
  const state: Pick<HomeworkItem, "status" | "tone"> =
    r.status === "completed"
      ? { status: "Completed", tone: "ok" }
      : r.status === "cancelled"
        ? { status: "Cancelled", tone: "neutral" }
        : isPastDue(r.due_on, now)
          ? { status: "Overdue", tone: "warn" }
          : { status: "Assigned", tone: "info" };
  return {
    key: `tutor:${r.id}`,
    source: "tutor",
    title: r.title,
    detail: joinDetail(KIND_LABEL[r.kind] ?? r.kind, r.note),
    assignedAt: r.created_at,
    dueOn: r.due_on,
    ...state,
    completedAt: r.completed_at,
  };
}

export function mapCatalogAssignment(r: CatalogAssignmentRow): HomeworkItem {
  const state: Pick<HomeworkItem, "status" | "tone"> =
    r.status === "draft"
      ? { status: "Draft", tone: "neutral" }
      : r.status === "cancelled"
        ? { status: "Cancelled", tone: "neutral" }
        : { status: "Assigned", tone: "info" };
  const skill = r.catalog_skill_id
    ? (SKILL_LABEL.get(r.catalog_skill_id) ?? r.catalog_skill_id)
    : null;
  return {
    key: `catalog:${r.id}`,
    source: "catalog",
    title: r.title,
    detail: joinDetail(skill),
    assignedAt: r.created_at,
    dueOn: r.due_at,
    ...state,
    completedAt: null,
  };
}

export function mapCheckpointAssignment(r: CheckpointAssignmentRow): HomeworkItem {
  return {
    key: `checkpoint:${r.id}`,
    source: "checkpoint",
    title: `Checkpoint ${r.checkpoint_id}`,
    detail: joinDetail(r.reason),
    assignedAt: r.assigned_at,
    dueOn: null,
    status: r.cooldown_override ? "Cooldown lifted" : "Retake assigned",
    tone: "info",
    completedAt: null,
  };
}

export function mapCohortHomework(r: CohortHomeworkRow, cohortName: string | null): HomeworkItem {
  return {
    key: `cohort:${r.id}`,
    source: "cohort",
    title: r.title,
    detail: joinDetail(cohortName ? `Cohort: ${cohortName}` : null, r.body),
    assignedAt: r.assigned_at,
    dueOn: r.due_at,
    status: "Assigned",
    tone: "info",
    completedAt: null,
  };
}

export function mapStudentAssignment(r: StudentAssignmentRow): HomeworkItem {
  const section = r.section ? r.section[0].toUpperCase() + r.section.slice(1) : null;
  const state: Pick<HomeworkItem, "status" | "tone"> = r.completed_at
    ? { status: "Completed", tone: "ok" }
    : r.unlocked_at
      ? { status: "Unlocked", tone: "info" }
      : { status: "Planned", tone: "neutral" };
  return {
    key: `test:${r.id}`,
    source: "test",
    title: r.title,
    detail: joinDetail([KIND_LABEL[r.kind] ?? r.kind, section].filter(Boolean).join(", ")),
    assignedAt: r.created_at,
    dueOn: r.scheduled_for,
    ...state,
    completedAt: r.completed_at,
  };
}

/** Newest assignment first; undated items last. */
export function sortHomework(items: readonly HomeworkItem[]): HomeworkItem[] {
  const time = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);
  return [...items].sort(
    (a, b) => time(b.assignedAt) - time(a.assignedAt) || a.title.localeCompare(b.title)
  );
}
