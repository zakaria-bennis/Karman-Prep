import { MATH_NODES, RW_NODES, type CurriculumNode, type Subject } from "@/data/curriculum";
import { getCatalogSkills } from "@/data/curriculum/skill-catalog";
import type { LegacyLearningRecord } from "@/lib/supabase/queries/skill-catalog";
import type { QuizAttempt } from "@/types/quiz";

export interface StudyAction {
  title: string;
  detail: string;
  href: string;
  label: string;
}

export interface SubjectProgress {
  subject: Subject;
  skillCount: number;
  savedLessons: number;
  markedMastered: number;
  underway: number;
}

export interface LearnDashboardData {
  next: StudyAction | null;
  review: { title: string; href: string; incorrect: number } | null;
  subjects: SubjectProgress[];
}

const allNodes = [...RW_NODES, ...MATH_NODES];
const nodesById = new Map(allNodes.map((node) => [node.id, node]));

/** A read-only view of saved earlier lessons and quizzes; no new mastery is inferred. */
export function buildLearnDashboard(
  history: LegacyLearningRecord[],
  attempts: QuizAttempt[]
): LearnDashboardData {
  const saved = new Map(history.map((row) => [row.node_id, row]));
  const incomplete = attempts.find(
    (attempt) => !attempt.completed_at && nodesById.has(attempt.node_id)
  );
  const inProgress = allNodes.find((node) => {
    const status = saved.get(node.id)?.status;
    return status === "in_progress" || status === "partially_complete";
  });
  const available = allNodes.find((node) => saved.get(node.id)?.status === "available");

  let next: StudyAction | null = null;
  if (incomplete) {
    const node = nodesById.get(incomplete.node_id)!;
    next = actionForNode(node, "Continue practice", "An unfinished quiz is saved for this lesson.");
  } else if (inProgress) {
    next = actionForNode(inProgress, "Continue lesson", "This earlier lesson is underway.");
  } else if (available) {
    next = actionForNode(available, "Open lesson", "This earlier lesson is available to start.");
  }

  const reviewAttempt = attempts.find(
    (attempt) =>
      attempt.completed_at &&
      attempt.questions_answered > 0 &&
      attempt.questions_correct < attempt.questions_answered
  );
  const review = reviewAttempt
    ? {
        title: nodesById.get(reviewAttempt.node_id)?.topic ?? "Earlier practice",
        href: `/dashboard/student/quizzes/${reviewAttempt.id}`,
        incorrect: reviewAttempt.questions_answered - reviewAttempt.questions_correct,
      }
    : null;

  const subjects: SubjectProgress[] = (["reading", "math"] as const).map((subject) => {
    const rows = (subject === "reading" ? RW_NODES : MATH_NODES)
      .map((node) => saved.get(node.id))
      .filter((row): row is LegacyLearningRecord => !!row);
    return {
      subject,
      skillCount: getCatalogSkills(subject).length,
      savedLessons: rows.filter(
        (row) =>
          row.status === "in_progress" ||
          row.status === "partially_complete" ||
          row.status === "mastered"
      ).length,
      markedMastered: rows.filter((row) => row.status === "mastered").length,
      underway: rows.filter(
        (row) => row.status === "in_progress" || row.status === "partially_complete"
      ).length,
    };
  });

  return { next, review, subjects };
}

function actionForNode(node: CurriculumNode, label: string, detail: string): StudyAction {
  return {
    title: node.topic,
    detail,
    href: `/learn/${node.subject}/${node.id}`,
    label,
  };
}
