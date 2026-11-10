// ============================================================
// /dashboard/student/scholarship — a cohort student uploads
// their official SAT score report for the cohort scholarship,
// and sees where their claim stands.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Panel } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { loadStudentContext } from "@/lib/student/context";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { COHORT_SCHOLARSHIP, formatPrice } from "@/lib/marketing/offer";
import { getStudentCohorts, getUserByClerkId, listStudentClaims } from "@/lib/scholarship/queries";
import { centsToDollars } from "@/lib/scholarship/payout-split";
import type { ClaimRow } from "@/lib/scholarship/schemas";
import ScholarshipUploadForm from "./ScholarshipUploadForm";

export const metadata: Metadata = { title: "Cohort scholarship" };
export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ClaimStatus({ claim, cohortName }: { claim: ClaimRow; cohortName: string }) {
  const lines: Record<ClaimRow["status"], { title: string; body: string }> = {
    submitted: {
      title: "We have your score report",
      body: `Uploaded ${formatDate(claim.submitted_at)} for ${cohortName}. We check every report by hand and email you when it's decided.`,
    },
    approved: {
      title: "You won the scholarship",
      body: `Congratulations. Your refund and the bank transfer for the bonus go out within ${COHORT_SCHOLARSHIP.payWithinDays} days.`,
    },
    rejected: {
      title: "We couldn't accept this report",
      body: claim.review_reason ?? "Upload your official College Board score report again.",
    },
    paid: {
      title: "Your scholarship is paid",
      body: `${centsToDollars(claim.refund_amount_cents ?? 0)} refunded to your original payment method${
        claim.bonus_amount_cents
          ? ` and a ${centsToDollars(claim.bonus_amount_cents)} merit bonus sent by bank transfer`
          : ""
      }.`,
    },
  };
  const line = lines[claim.status];
  return (
    <div aria-live="polite">
      <Card>
        <h2 className="kp-title">{line.title}</h2>
        <p className="kp-meta">{line.body}</p>
      </Card>
    </div>
  );
}

export default async function ScholarshipPage() {
  const { userId: realClerkId } = await safeAuth();
  if (!realClerkId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realClerkId);
  const [ctx, student] = await Promise.all([loadStudentContext(), getUserByClerkId(clerkId)]);
  const [cohorts, claims] = student
    ? await Promise.all([getStudentCohorts(student.id), listStudentClaims(student.id)])
    : [[], []];

  const open = cohorts.filter(
    (c) =>
      !claims.some((k) => k.cohort_id === c.id && (k.status === "approved" || k.status === "paid"))
  );

  return (
    <StudentPortal ctx={ctx} title="Cohort scholarship">
      <Panel label="Cohort scholarship">
        <p className="kp-meta">
          The top official SAT score in each cohort wins {formatPrice(COHORT_SCHOLARSHIP.amount)}:
          the {formatPrice(COHORT_SCHOLARSHIP.refund)} cohort price back, plus a{" "}
          {formatPrice(COHORT_SCHOLARSHIP.meritBonus)} merit bonus. Upload your official College
          Board score report within {COHORT_SCHOLARSHIP.claimDays} days of your scores coming out.{" "}
          <Link href="/terms#cohort-scholarship" className="kp-link">
            Read the rules
          </Link>
        </p>

        {claims.map((claim) => (
          <ClaimStatus
            key={claim.id}
            claim={claim}
            cohortName={cohorts.find((c) => c.id === claim.cohort_id)?.name ?? "your cohort"}
          />
        ))}

        {cohorts.length === 0 ? (
          <Card>
            <h2 className="kp-title">For cohort students</h2>
            <p className="kp-meta">
              The scholarship is for students in a 9-week cohort. Once you join one, you can upload
              your score report here after your official SAT.
            </p>
          </Card>
        ) : open.length > 0 ? (
          <ScholarshipUploadForm
            cohorts={open.map((c) => ({ id: c.id, name: c.name }))}
            hasClaim={claims.some((k) => open.some((c) => c.id === k.cohort_id))}
          />
        ) : null}
      </Panel>
    </StudentPortal>
  );
}
