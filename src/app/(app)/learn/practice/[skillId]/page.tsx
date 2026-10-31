import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import CatalogPractice from "@/components/learn/catalog-practice/CatalogPractice";
import {
  catalogEntryQuerySchema,
  catalogPracticeError,
  requireEntrySkill,
  type CatalogStudentSession,
} from "@/lib/catalog-practice/student-entry";
import { actionResumeCatalogPractice } from "../../catalog-quiz-actions";
import { actionCatalogPracticePool } from "../../catalog-actions";
import type { StudentQuizQuestion } from "@/types/quiz";

/** No allocation on render: starting practice always requires the student's explicit action. */
export default async function CatalogPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ skillId: string }>;
  searchParams?: Promise<{ session?: string; assignment?: string }>;
}) {
  const { skillId } = await params;
  const skill = CATALOG_SKILLS.find((item) => item.id === skillId);
  if (!skill) notFound();
  const query = catalogEntryQuerySchema.safeParse((await searchParams) ?? {});
  if (!query.success) notFound();
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const role = await fetchUserRole(userId);
  if (role === "parent") redirect("/dashboard/parent");
  if (role === "tutor") redirect("/tutor");
  if (role !== "student" && role !== "admin") redirect("/onboarding");

  let initialSession: CatalogStudentSession | null = null;
  let initialError: string | null = null;
  if (query.data.session) {
    try {
      initialSession = await actionResumeCatalogPractice(query.data.session);
      requireEntrySkill(initialSession, skill.id);
    } catch (error) {
      initialSession = null;
      initialError = catalogPracticeError(error);
    }
  }
  let availableQuestions: StudentQuizQuestion[] | undefined;
  if (!query.data.session && !query.data.assignment) {
    try {
      availableQuestions = await actionCatalogPracticePool({ skillId: skill.id });
    } catch (error) {
      availableQuestions = [];
      initialError = catalogPracticeError(error);
    }
  }
  return (
    <CatalogPractice
      key={query.data.session ?? query.data.assignment ?? skill.id}
      skill={skill}
      initialSession={initialSession}
      initialError={initialError}
      resumeSessionId={query.data.session}
      assignmentId={query.data.assignment}
      availableQuestions={availableQuestions}
    />
  );
}
