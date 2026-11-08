// One student, seen by their affiliate tutor: progress (rings and skill
// squares), homework, assigning work and removal. Server component; the
// rights check runs first and anything else is a 404.

import { notFound } from "next/navigation";
import {
  Card,
  MoreLink,
  Num,
  Panel,
  PortalShell,
  Ring,
  Row,
  SectionHeader,
  SkillSquares,
} from "@/components/portal";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { resolveAffiliateManagement } from "@/lib/tutor-affiliate/service";
import { sortHomework } from "@/lib/tutor-affiliate/homework";
import { fetchStudentGlances, type CourseGlance } from "@/lib/tutor-affiliate/progress";
import AssignForm from "./AssignForm";
import CancelHomeworkButton from "./CancelHomeworkButton";
import RemoveStudentButton from "./RemoveStudentButton";
import { AFFILIATE_TUTOR_NAV, shortDate, studentName } from "./nav";

const SUBJECT_LABEL = { math: "SAT Math", reading: "SAT Reading and Writing" } as const;

function CourseCard({ course }: { course: CourseGlance }) {
  return (
    <Card>
      <SectionHeader title={course.label} note={`${course.percent}%`} />
      {course.domains.map((domain) => (
        <Row
          key={domain.id}
          title={domain.label}
          right={
            <SkillSquares
              align="end"
              skills={domain.skills.map((s) => ({ level: s.level, name: s.name }))}
              label={`${domain.label}: ${domain.skills.filter((s) => s.level >= 3).length} of ${domain.skills.length} at Understanding or above`}
            />
          }
        />
      ))}
    </Card>
  );
}

export default async function AffiliateStudent({
  actorClerkId,
  studentClerkId,
  tutorFirstName,
  tutorEmail,
  readOnly,
}: {
  actorClerkId: string;
  studentClerkId: string;
  tutorFirstName: string | null;
  tutorEmail: string | null;
  readOnly: boolean;
}) {
  const rights = await resolveAffiliateManagement(affiliateDeps, {
    actorClerkId,
    studentClerkId,
  });
  if (!rights.allowed || !rights.student || !rights.link) notFound();
  const student = rights.student;
  const name = studentName(student);
  const first = student.firstName || name;
  const canSee = rights.capabilities.has("view_progress");

  const [glance, homework] = canSee
    ? await Promise.all([
        fetchStudentGlances([student.clerkId]).then((m) => m.get(student.clerkId) ?? null),
        affiliateDeps.homework.listForStudent(student.id).then(sortHomework),
      ])
    : [null, []];

  const side = (
    <Card>
      <SectionHeader title={name} />
      <p className="kp-meta">Joined your group {shortDate(rights.link.redeemedAt)}.</p>
      {!readOnly && rights.capabilities.has("remove") && (
        <RemoveStudentButton studentUserId={student.id} name={first} redirectTo="/tutor" />
      )}
      <MoreLink href="/tutor">All students</MoreLink>
    </Card>
  );

  return (
    <PortalShell
      portal="Tutor"
      nav={AFFILIATE_TUTOR_NAV}
      title={name}
      name={tutorFirstName ?? undefined}
      accountDetail={tutorEmail ?? undefined}
    >
      <Panel side={side} label={`${name}'s work`}>
        {!canSee && (
          <Card>
            <p className="kp-meta">
              Your tutor plan has ended, so progress and homework are hidden until you restart it.
            </p>
            <MoreLink href="/tutor/billing">Billing</MoreLink>
          </Card>
        )}
        {glance && (
          <>
            <Card>
              <SectionHeader title="Progress" />
              <div className="kp-ring-row">
                {(["math", "reading"] as const).map((subject) => (
                  <Ring
                    key={subject}
                    value={glance[subject].percent / 100}
                    size={88}
                    width={8}
                    label={`${SUBJECT_LABEL[subject]}: ${glance[subject].percent}%`}
                  >
                    <Num>{glance[subject].percent}%</Num>
                  </Ring>
                ))}
              </div>
              <p className="kp-meta">
                {glance.lastActive
                  ? `Last practiced ${shortDate(glance.lastActive)}.`
                  : "No practice yet."}
              </p>
            </Card>
            <CourseCard course={glance.math} />
            <CourseCard course={glance.reading} />
          </>
        )}
        {canSee && (
          <Card>
            <SectionHeader
              title="Homework"
              note={`${homework.filter((h) => h.status === "assigned").length} open`}
            />
            {homework.length === 0 ? (
              <p className="kp-meta">Nothing assigned yet.</p>
            ) : (
              homework.map((item) => (
                <Row
                  key={item.id}
                  title={item.title}
                  sub={
                    item.status === "assigned"
                      ? `Due ${shortDate(item.dueOn)}`
                      : item.status === "completed"
                        ? `Done ${shortDate(item.completedAt)}`
                        : "Cancelled"
                  }
                  right={
                    item.status === "assigned" && !readOnly ? (
                      <CancelHomeworkButton
                        homeworkId={item.id}
                        studentClerkId={student.clerkId}
                        title={item.title}
                      />
                    ) : undefined
                  }
                />
              ))
            )}
          </Card>
        )}
        {!readOnly && rights.capabilities.has("assign") && (
          <AssignForm
            studentClerkId={student.clerkId}
            firstName={first}
            skills={CATALOG_SKILLS.map((s) => ({
              id: s.id,
              label: s.label,
              group: `${SUBJECT_LABEL[s.subject]}: ${s.domainLabel}`,
            }))}
            domains={SKILL_DOMAINS.map((d) => ({
              id: d.id,
              label: d.label,
              group: SUBJECT_LABEL[d.subject],
            }))}
          />
        )}
      </Panel>
    </PortalShell>
  );
}
