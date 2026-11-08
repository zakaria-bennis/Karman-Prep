// ============================================================
// /admin/students/[clerkId]: one student exactly as a tutor sees
// them (skills and levels, every quiz attempt with every answer,
// flagged questions, tutor controls) plus every homework item
// from every homework table on this database. The param is the
// student's Clerk id. Unlike the tutor page, answers load for
// every attempt, five attempts at a time.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudentDetailTabs from "@/components/tutor/StudentDetailTabs";
import {
  WbPage,
  WbPill,
  WbSection,
  WbStats,
  WbTable,
  formatDate,
} from "@/components/admin/workbench";
import { MATH_NODES, RW_NODES } from "@/data/curriculum";
import { HOMEWORK_SOURCE_LABEL, type HomeworkItem } from "@/lib/admin/student-homework";
import {
  clerkIdSchema,
  countMastered,
  fetchHomeworkForStudent,
  fetchStudentForAdmin,
  mapInBatches,
  summarizeAttempts,
  timingLabel,
} from "@/lib/admin/students";
import { adminOrNull } from "@/lib/auth/admin-guard";
import {
  fetchAllAttemptsForStudent,
  fetchFlaggedQuestionsForStudent,
  fetchResponsesForAttempt,
} from "@/lib/supabase/queries/quiz";
import { fetchNodeStatuses } from "@/lib/supabase/queries/tutor";

export const metadata: Metadata = { title: "Student | Karman admin" };
export const dynamic = "force-dynamic";

const TABS = ["skills", "controls", "flagged", "quiz"] as const;
type Tab = (typeof TABS)[number];
const isTab = (value: unknown): value is Tab => TABS.includes(value as Tab);

const RW_IDS = RW_NODES.map((n) => n.id);
const MATH_IDS = MATH_NODES.map((n) => n.id);

export default async function AdminStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ clerkId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await adminOrNull())) notFound();
  const [{ clerkId: rawId }, raw] = await Promise.all([params, searchParams]);
  const parsed = clerkIdSchema.safeParse(rawId);
  if (!parsed.success) notFound();
  const clerkId = parsed.data;

  const student = await fetchStudentForAdmin(clerkId);
  if (!student) notFound();

  const [statuses, attempts, flagged, homework] = await Promise.all([
    fetchNodeStatuses(clerkId),
    fetchAllAttemptsForStudent(clerkId),
    fetchFlaggedQuestionsForStudent(clerkId),
    fetchHomeworkForStudent(student),
  ]);
  const answers = await mapInBatches(attempts, 5, (a) => fetchResponsesForAttempt(a.id));
  const responsesByAttempt = Object.fromEntries(attempts.map((a, i) => [a.id, answers[i] ?? []]));

  const quiz = summarizeAttempts(attempts);
  const answerCount = answers.reduce((sum, list) => sum + list.length, 0);
  const openFlags = flagged.filter((f) => !f.resolved).length;
  const activeTab: Tab = isTab(raw.tab) ? raw.tab : "skills";

  const summary = [
    `Signed up as ${student.email || "no email"} on ${formatDate(student.joinedAt)}.`,
    student.satTestDate ? `Plans to sit the SAT on ${formatDate(student.satTestDate)}.` : null,
    `${timingLabel(student.timing)} on timed sections.`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <WbPage
      title={student.name}
      summary={summary}
      actions={
        <Link className="kp-link" href="/admin/students">
          All students
        </Link>
      }
    >
      <WbStats
        items={[
          { label: "Quizzes", value: quiz.count },
          { label: "Answers", value: answerCount },
          {
            label: "Average score",
            value: quiz.averageScore === null ? "—" : `${quiz.averageScore}%`,
          },
          {
            label: "Reading and Writing mastered",
            value: `${countMastered(statuses, RW_IDS)} of ${RW_IDS.length}`,
          },
          {
            label: "Math mastered",
            value: `${countMastered(statuses, MATH_IDS)} of ${MATH_IDS.length}`,
          },
          { label: "Open flags", value: openFlags },
          { label: "Homework", value: homework.items.length },
        ]}
      />

      <WbSection title="Skills and quizzes">
        <StudentDetailTabs
          studentId={clerkId}
          statuses={statuses}
          attempts={attempts}
          flagged={flagged}
          responsesByAttempt={responsesByAttempt}
          activeTab={activeTab}
        />
      </WbSection>

      <WbSection title="Homework">
        {homework.failed.map((f) => (
          <p key={f.source} role="alert" className="wb-alert">
            {HOMEWORK_SOURCE_LABEL[f.source]} could not be read. {f.message}
          </p>
        ))}
        <WbTable<HomeworkItem>
          caption="Homework"
          rows={homework.items}
          rowKey={(r) => r.key}
          empty="No homework yet. Work a tutor, cohort or question set assigns shows up here."
          columns={[
            { key: "source", label: "Source", cell: (r) => HOMEWORK_SOURCE_LABEL[r.source] },
            {
              key: "title",
              label: "Title",
              cell: (r) => (
                <>
                  {r.title}
                  {r.detail && <small>{r.detail}</small>}
                </>
              ),
            },
            { key: "due", label: "Due", cell: (r) => formatDate(r.dueOn) },
            {
              key: "status",
              label: "Status",
              cell: (r) => <WbPill tone={r.tone}>{r.status}</WbPill>,
            },
            { key: "completed", label: "Completed", cell: (r) => formatDate(r.completedAt) },
          ]}
        />
        <p className="wb-note">
          Only tutor homework and assigned tests record when they are done. Cohort homework,
          checkpoints and question sets show a dash.
        </p>
        {homework.missing.length > 0 && (
          <p className="wb-note">
            Not on this database yet:{" "}
            {homework.missing.map((s) => HOMEWORK_SOURCE_LABEL[s]).join(", ")}.
          </p>
        )}
      </WbSection>
    </WbPage>
  );
}
