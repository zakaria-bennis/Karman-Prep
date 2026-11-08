// The affiliate tutor's home: their code, seats used out of 50, the roster
// with progress at a glance, and billing status. Server component.

import Link from "next/link";
import {
  Banner,
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
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { getAffiliateOverview } from "@/lib/tutor-affiliate/service";
import { fetchStudentGlances } from "@/lib/tutor-affiliate/progress";
import CodeCard from "./CodeCard";
import { StartTutorPlanButton } from "./BillingButtons";
import {
  AFFILIATE_TUTOR_NAV,
  TUTOR_PLAN_PRICE,
  billingLine,
  joinLink,
  shortDate,
  studentName,
} from "./nav";

export default async function AffiliateHome({
  clerkId,
  firstName,
  email,
  readOnly,
}: {
  clerkId: string;
  firstName: string | null;
  email: string | null;
  readOnly: boolean;
}) {
  const overview = await getAffiliateOverview(affiliateDeps, clerkId);
  const shell = (body: React.ReactNode) => (
    <PortalShell
      portal="Tutor"
      nav={AFFILIATE_TUTOR_NAV}
      title="Your students"
      name={firstName ?? undefined}
      accountDetail={email ?? undefined}
    >
      {body}
    </PortalShell>
  );

  if (!overview) {
    return shell(
      <Panel>
        <Card>
          <SectionHeader title="Start the tutor plan" />
          <p className="kp-meta">
            {TUTOR_PLAN_PRICE}. One code for up to 50 of your students. Each one gets the Practice
            plan free while your plan is active.
          </p>
          {!readOnly && <StartTutorPlanButton label="Start the tutor plan" />}
        </Card>
      </Panel>
    );
  }

  const { seats, students, capabilities, access, subscription } = overview;
  const glances = capabilities.has("view_progress")
    ? await fetchStudentGlances(students.map((s) => s.student.clerkId))
    : new Map();

  const banner =
    access === "lapsed" ? (
      <Banner>
        Your tutor plan has ended, so your {students.length === 1 ? "student is" : "students are"}{" "}
        on the Free plan.{" "}
        <Link className="kp-link" href="/tutor/billing">
          Restart it
        </Link>{" "}
        to give them Practice again.
      </Banner>
    ) : undefined;

  const side = (
    <>
      <Card>
        <SectionHeader title="Seats" />
        <div className="kp-ring-row">
          <Ring
            value={seats.used / seats.limit}
            size={96}
            width={8}
            label={`${seats.used} of ${seats.limit} seats used`}
          >
            <Num>{seats.used}</Num>
          </Ring>
          <p className="kp-meta">
            <Num>{seats.used}</Num> of <Num>{seats.limit}</Num> used.{" "}
            {seats.full ? (
              "Your group is full."
            ) : (
              <>
                <Num>{seats.remaining}</Num> left.
              </>
            )}
          </p>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Billing" />
        <p className="kp-meta">{billingLine(subscription, access === "active")}</p>
        <MoreLink href="/tutor/billing">Billing</MoreLink>
      </Card>
    </>
  );

  return shell(
    <Panel banner={banner} side={side} label="Your tutor group">
      <CodeCard
        code={overview.code}
        link={overview.code ? joinLink(overview.code) : null}
        canRegenerate={!readOnly && capabilities.has("regenerate_code")}
      />
      <Card>
        <SectionHeader title="Students" note={`${seats.used} of ${seats.limit}`} />
        {students.length === 0 ? (
          <p className="kp-meta">Share your code. Students who join show up here.</p>
        ) : (
          students.map(({ student, link }) => {
            const glance = glances.get(student.clerkId);
            const name = studentName(student);
            const overall = glance
              ? Math.round((glance.math.percent + glance.reading.percent) / 2)
              : null;
            const domains = glance ? [...glance.math.domains, ...glance.reading.domains] : [];
            return (
              <Row
                key={link.id}
                href={`/tutor/${encodeURIComponent(student.clerkId)}`}
                leading={
                  overall !== null ? (
                    <Ring
                      value={overall / 100}
                      size={44}
                      width={5}
                      label={`${name}: ${overall}% of the way`}
                    >
                      <Num>{overall}</Num>
                    </Ring>
                  ) : undefined
                }
                title={name}
                sub={`Joined ${shortDate(link.redeemedAt)}`}
                right={
                  domains.length ? (
                    <SkillSquares
                      align="end"
                      skills={domains.map((d) => ({ level: d.level, name: d.label }))}
                      label={`${name}: one square per Domain`}
                    />
                  ) : undefined
                }
              />
            );
          })
        )}
      </Card>
    </Panel>
  );
}
