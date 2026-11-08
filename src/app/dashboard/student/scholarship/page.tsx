// ============================================================
// /dashboard/student/scholarship — a cohort student uploads
// their official SAT score report for the cohort scholarship,
// and sees where their claim stands.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
      body: `Congratulations. Your payment goes out within ${COHORT_SCHOLARSHIP.payWithinDays} days.`,
    },
    rejected: {
      title: "We couldn't accept this report",
      body: claim.review_reason ?? "Upload your official College Board score report again.",
    },
    paid: {
      title: "Your scholarship is paid",
      body: `${centsToDollars(claim.refund_amount_cents ?? 0)} refunded to your original payment method and a ${centsToDollars(
        claim.bonus_amount_cents ?? 0
      )} merit bonus credited to your Karman account.`,
    },
  };
  const line = lines[claim.status];
  return (
    <section aria-live="polite" className="rounded-lg border border-bronze/40 bg-surface p-5">
      <h2 className="text-base font-semibold text-foreground">{line.title}</h2>
      <p className="mt-1 text-sm text-taupe">{line.body}</p>
    </section>
  );
}

export default async function ScholarshipPage() {
  const { userId: realClerkId } = await safeAuth();
  if (!realClerkId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realClerkId);
  const student = await getUserByClerkId(clerkId);
  const [cohorts, claims] = student
    ? await Promise.all([getStudentCohorts(student.id), listStudentClaims(student.id)])
    : [[], []];

  const open = cohorts.filter(
    (c) =>
      !claims.some((k) => k.cohort_id === c.id && (k.status === "approved" || k.status === "paid"))
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Cohort scholarship</h1>
          <p className="text-sm leading-6 text-taupe">
            The top official SAT score in each cohort wins {formatPrice(COHORT_SCHOLARSHIP.award)}:
            the {formatPrice(COHORT_SCHOLARSHIP.refund)} cohort price back, plus a{" "}
            {formatPrice(COHORT_SCHOLARSHIP.meritBonus)} merit bonus. Upload your official College
            Board score report within {COHORT_SCHOLARSHIP.claimDays} days of your scores coming out.{" "}
            <Link
              href="/terms#cohort-scholarship"
              className="font-medium text-foreground underline"
            >
              Read the rules
            </Link>
          </p>
        </header>

        {claims.map((claim) => (
          <ClaimStatus
            key={claim.id}
            claim={claim}
            cohortName={cohorts.find((c) => c.id === claim.cohort_id)?.name ?? "your cohort"}
          />
        ))}

        {cohorts.length === 0 ? (
          <section className="rounded-lg border border-bronze/40 bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">For cohort students</h2>
            <p className="mt-1 text-sm text-taupe">
              The scholarship is for students in a 9-week cohort. Once you join one, you can upload
              your score report here after your official SAT.
            </p>
          </section>
        ) : open.length > 0 ? (
          <ScholarshipUploadForm
            cohorts={open.map((c) => ({ id: c.id, name: c.name }))}
            hasClaim={claims.some((k) => open.some((c) => c.id === k.cohort_id))}
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
