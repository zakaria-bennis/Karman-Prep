/*
 * School portal home: the plan status, the classes with their join codes, and a new class.
 * Teachers see the classes they teach; school admins see every class.
 */
import type { Metadata } from "next";
import { Card, Cta, MoreLink, Num, Panel, Row, SectionHeader } from "@/components/portal";
import { ActionMessage, SchoolShell } from "@/components/school/SchoolShell";
import { requireSchoolContext, visibleClasses } from "@/lib/school/access";
import { schoolStudentCount, seatCounts } from "@/lib/school/roster";
import { formatLongDate, SCHOOL_TERMS } from "@/lib/school/terms";
import { createClassAction } from "./actions";

export const metadata: Metadata = { title: "School" };
export const dynamic = "force-dynamic";

export default async function SchoolHomePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const ctx = await requireSchoolContext();
  const [{ done, error }, classes, counts, students] = await Promise.all([
    searchParams,
    visibleClasses(ctx),
    seatCounts(ctx.school.id),
    schoolStudentCount(ctx.school.id),
  ]);

  const side = (
    <>
      <Card>
        <SectionHeader title="Your plan" />
        <p className="kp-meta">
          Free until {formatLongDate(ctx.school.freeUntil)}, then ${SCHOOL_TERMS.pricePerStudentPerYear}{" "}
          per student a year.
        </p>
        <Row title="Students with a seat" right={<Num>{students}</Num>} />
        <p className="kp-meta">Each student has a Practice plan of their own.</p>
        <MoreLink href="/school/billing">Billing and renewal</MoreLink>
      </Card>
      <Card>
        <SectionHeader title="How students join" />
        <p className="kp-meta">
          Students sign in to Karman, open Join a class, and type the class code. They get their
          own Practice plan at once.
        </p>
      </Card>
    </>
  );

  return (
    <SchoolShell ctx={ctx} title={ctx.school.name}>
      <Panel side={side}>
        <ActionMessage done={done} error={error} />
        <Card>
          <SectionHeader title="Classes" note={classes.length ? <Num>{classes.length}</Num> : undefined} />
          {classes.length ? (
            classes.map((c) => (
              <Row
                key={c.id}
                title={c.name}
                sub={
                  <>
                    Code <Num>{c.joinCode}</Num>
                  </>
                }
                right={
                  <>
                    <Num>{counts.get(c.id) ?? 0}</Num> {(counts.get(c.id) ?? 0) === 1 ? "student" : "students"}
                  </>
                }
                href={`/school/classes/${c.id}`}
              />
            ))
          ) : (
            <p className="kp-meta">No classes yet. Make your first one below.</p>
          )}
        </Card>
        <Card>
          <SectionHeader title="New class" />
          <form action={createClassAction} className="kp-form">
            <label className="kp-field">
              <span>Class name</span>
              <input className="kp-input" name="name" required maxLength={80} placeholder="Period 4 SAT Prep" />
            </label>
            <div>
              <Cta type="submit">Create class</Cta>
            </div>
          </form>
        </Card>
      </Panel>
    </SchoolShell>
  );
}
