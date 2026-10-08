import { domainScoresSchema, type DomainScores } from "@/types";

export interface LinkedParentStudent {
  id: string;
  clerk_id: string;
  first_name: string | null;
  last_name: string | null;
}

export type Section<T> = { status: "ready"; value: T } | { status: "unavailable" };

export interface WeeklyParentView {
  student: LinkedParentStudent;
  weekStart: string;
  weekEnd: string;
  completedPractice: Section<number>;
  practiceSkills: Section<{
    improving: string[];
    attention: string[];
    diagnosticDate: string | null;
  }>;
  nextSession: Section<{ startsAt: string } | null>;
  assignments: Section<Array<{ id: string; title: string; dueAt: string | null }>>;
}

export const DOMAIN_LABELS: Record<keyof DomainScores, string> = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  geometry: "Geometry and Trigonometry",
  data_analysis: "Problem Solving and Data Analysis",
  info_ideas: "Information and Ideas",
  craft_structure: "Craft and Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
};

export function selectLinkedStudent(
  linked: LinkedParentStudent[],
  requestedId: string | undefined
): LinkedParentStudent | null {
  if (linked.length === 0) return null;
  if (!requestedId) return linked[0];
  return linked.find((student) => student.id === requestedId) ?? null;
}

/** UTC calendar week. End is exclusive so consecutive weeks never overlap. */
export function utcWeek(now: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function comparePracticeDomains(
  latest: { taken_at: string; domain_scores: unknown } | null,
  previous: { domain_scores: unknown } | null
): { improving: string[]; attention: string[]; diagnosticDate: string | null } {
  const current = domainScoresSchema.safeParse(latest?.domain_scores);
  const prior = domainScoresSchema.safeParse(previous?.domain_scores);
  if (!current.success) return { improving: [], attention: [], diagnosticDate: null };

  const entries = (Object.keys(DOMAIN_LABELS) as Array<keyof DomainScores>)
    .map((key) => ({
      key,
      score: current.data[key],
      previous: prior.success ? prior.data[key] : null,
    }))
    .filter(({ score }) => Number.isFinite(score) && score >= 0 && score <= 100);
  const improving = entries
    .filter(
      ({ score, previous: before }) =>
        before !== null && Number.isFinite(before) && before >= 0 && before <= 100 && score > before
    )
    .map(({ key }) => DOMAIN_LABELS[key]);
  const attention = [...entries]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map(({ key }) => DOMAIN_LABELS[key]);
  return { improving, attention, diagnosticDate: latest?.taken_at ?? null };
}
