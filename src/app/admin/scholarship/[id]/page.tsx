// ============================================================
// /admin/scholarship/:id — one claim: the score report, what the
// automatic check found, the cohort ranking, the decision and
// the Stripe test-mode payout.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { COHORT_SCHOLARSHIP } from "@/lib/marketing/offer";
import { centsToDollars, computePayoutSplit } from "@/lib/scholarship/payout-split";
import {
  cohortClaims,
  getClaim,
  getCohort,
  getUserById,
  listEvents,
  toRankInput,
} from "@/lib/scholarship/queries";
import { canApprove, rankClaims } from "@/lib/scholarship/ranking";
import {
  WbPage,
  WbPill,
  WbSection,
  WbTable,
  formatDate,
  formatDateTime,
} from "@/components/admin/workbench";
import {
  EVENT_LABEL,
  REASON_LABEL,
  REASON_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  claimStage,
  VERDICT_LABEL,
  VERDICT_TONE,
} from "../labels";
import ReviewPanel from "./ReviewPanel";

export const metadata: Metadata = { title: "Scholarship claim | Karman admin" };
export const dynamic = "force-dynamic";

function fullName(
  u: { firstName: string | null; lastName: string | null; email: string | null } | null
) {
  if (!u) return "Unknown student";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown student";
}

function meta(m: Record<string, unknown>, key: string): string {
  const v = m[key];
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "None";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTime(v);
  return String(v);
}

export default async function ScholarshipClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = z.guid().safeParse((await params).id);
  if (!id.success) notFound();
  const claim = await getClaim(id.data);
  if (!claim) notFound();

  const [student, cohort, events, siblings] = await Promise.all([
    getUserById(claim.user_id),
    getCohort(claim.cohort_id),
    listEvents(claim.id),
    cohortClaims(claim.cohort_id),
  ]);
  const ranked = rankClaims(siblings.map(toRankInput));
  const mine = ranked.find((r) => r.id === claim.id);
  const people = new Map(
    await Promise.all(
      siblings.map(async (s) => [s.id, fullName(await getUserById(s.user_id))] as const)
    )
  );
  // The claim's share: set at approval, or what approving it now would give (a tie splits it).
  const awardCents = COHORT_SCHOLARSHIP.amount * 100;
  const approval = canApprove(claim.id, siblings.map(toRankInput), awardCents);
  const shareCents = claim.award_cents ?? (approval.ok ? approval.shareCents : awardCents);
  const split = computePayoutSplit({
    awardCents: shareCents,
    cohortPriceCents: COHORT_SCHOLARSHIP.refund * 100,
    paidCents: COHORT_SCHOLARSHIP.refund * 100,
    refundedElsewhereCents: 0,
  });
  const stageOf = new Map(siblings.map((x) => [x.id, claimStage(x)]));
  const name = fullName(student);
  const m = claim.check_metadata;

  return (
    <WbPage
      title={name}
      summary={`${cohort?.name ?? "Unknown cohort"} · uploaded ${formatDate(claim.submitted_at)}`}
      actions={
        <Link className="kp-link" href="/admin/scholarship">
          Back to the queue
        </Link>
      }
    >
      <div className="wb-toolbar">
        <WbPill tone={STATUS_TONE[claimStage(claim)]}>{STATUS_LABEL[claimStage(claim)]}</WbPill>
        {claim.check_verdict && (
          <WbPill tone={VERDICT_TONE[claim.check_verdict]}>
            Check: {VERDICT_LABEL[claim.check_verdict]}
          </WbPill>
        )}
        {mine?.rank === 1 && (
          <WbPill tone="ok">
            {mine.tied ? "Tied for the top score" : "Top score in the cohort"}
          </WbPill>
        )}
        {mine?.tied && <WbPill tone="warn">Tied score</WbPill>}
      </div>

      <div className="wb-grid">
        <div className="wb-grid">
          <ReviewPanel
            claimId={claim.id}
            status={claim.status}
            verdict={claim.check_verdict}
            payoutStatus={claim.payout_status}
            payoutError={claim.payout_error}
            reviewReason={claim.review_reason}
            isTop={mine?.rank === 1}
            approveBlock={approval.ok ? null : approval.reason}
            shareLabel={centsToDollars(shareCents)}
            tiedWith={approval.ok ? approval.tiedWith : 0}
            refundLabel={centsToDollars(claim.refund_amount_cents ?? split.refundCents)}
            bonusLabel={centsToDollars(claim.bonus_amount_cents ?? split.bonusCents)}
            refundId={claim.stripe_refund_id}
            transfer={
              claim.bonus_paid_on
                ? {
                    paidOn: formatDate(claim.bonus_paid_on),
                    reference: claim.bonus_transfer_reference ?? "",
                  }
                : null
            }
            paidAt={claim.paid_at ? formatDateTime(claim.paid_at) : null}
          />

          <WbSection title="Automatic check">
            {claim.check_reasons.length === 0 ? (
              <p className="wb-note">The check hasn&apos;t run yet.</p>
            ) : (
              <ul className="wb-reasons">
                {claim.check_reasons.map((r) => (
                  <li key={r.code}>
                    <WbPill tone={REASON_TONE[r.level]}>{REASON_LABEL[r.level]}</WbPill>
                    <span>{r.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </WbSection>

          <WbSection title="Score report">
            <iframe
              className="wb-frame"
              src={`/admin/scholarship/${claim.id}/report`}
              title={`Score report uploaded by ${name}`}
            />
            <p className="wb-note">
              {claim.report_file_name} ·{" "}
              <a
                className="kp-link"
                href={`/admin/scholarship/${claim.id}/report`}
                target="_blank"
                rel="noreferrer"
              >
                Open in a new tab
              </a>
            </p>
          </WbSection>
          <WbSection title="What the report says">
            <dl className="wb-dl">
              <dt>Name</dt>
              <dd>{claim.extracted_name ?? "Not read"}</dd>
              <dt>Test date</dt>
              <dd>
                {claim.extracted_test_date ? formatDate(claim.extracted_test_date) : "Not read"}
              </dd>
              <dt>Total</dt>
              <dd>{claim.extracted_total_score ?? "Not read"}</dd>
              <dt>Reading and Writing</dt>
              <dd>{claim.extracted_rw_score ?? "Not read"}</dd>
              <dt>Math</dt>
              <dd>{claim.extracted_math_score ?? "Not read"}</dd>
              <dt>Student typed</dt>
              <dd>
                {claim.declared_total_score ?? "—"} on{" "}
                {claim.declared_test_date ? formatDate(claim.declared_test_date) : "—"}
              </dd>
            </dl>
          </WbSection>

          <WbSection title="File details">
            <dl className="wb-dl">
              <dt>Made with</dt>
              <dd>
                {[meta(m, "producer"), meta(m, "creator")].filter((x) => x !== "—").join(" · ") ||
                  "—"}
              </dd>
              <dt>Created</dt>
              <dd>{meta(m, "creationDate")}</dd>
              <dt>Changed</dt>
              <dd>{meta(m, "modDate")}</dd>
              <dt>Pages</dt>
              <dd>{meta(m, "pageCount")}</dd>
              <dt>Saves</dt>
              <dd>{meta(m, "eofCount")}</dd>
              <dt>Drawn on top</dt>
              <dd>{meta(m, "annotationSubtypes")}</dd>
              <dt>File fingerprint</dt>
              <dd>{claim.report_sha256.slice(0, 16)}…</dd>
            </dl>
          </WbSection>
        </div>
      </div>

      <WbSection title="Cohort ranking">
        <WbTable
          caption="Claims in this cohort, top score first"
          rows={ranked.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))}
          rowKey={(r) => r.id}
          empty="No other claims in this cohort."
          columns={[
            { key: "rank", label: "Rank", cell: (r) => (r.rank ? `#${r.rank}` : "Out") },
            {
              key: "who",
              label: "Student",
              cell: (r) =>
                r.id === claim.id ? (
                  <b>{people.get(r.id)}</b>
                ) : (
                  <Link href={`/admin/scholarship/${r.id}`}>{people.get(r.id)}</Link>
                ),
            },
            {
              key: "score",
              label: "Score",
              numeric: true,
              cell: (r) => (
                <>
                  {r.score ?? "—"}
                  {!r.scoreVerified && <small>typed, not read</small>}
                </>
              ),
            },
            {
              key: "status",
              label: "Status",
              cell: (r) => {
                const stage = stageOf.get(r.id) ?? "submitted";
                return <WbPill tone={STATUS_TONE[stage]}>{STATUS_LABEL[stage]}</WbPill>;
              },
            },
          ]}
        />
      </WbSection>

      <WbSection title="History">
        <ul className="wb-timeline">
          {events.map((e) => (
            <li key={e.id}>
              <time dateTime={e.created_at}>{formatDateTime(e.created_at)}</time>
              {EVENT_LABEL[e.kind] ?? e.kind}
              {typeof e.detail.reason === "string" && `: ${e.detail.reason}`}
              {typeof e.detail.error === "string" && `: ${e.detail.error}`}
              {typeof e.detail.verdict === "string" &&
                ` (${VERDICT_LABEL[e.detail.verdict] ?? e.detail.verdict})`}
            </li>
          ))}
        </ul>
      </WbSection>
    </WbPage>
  );
}
