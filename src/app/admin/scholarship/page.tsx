// ============================================================
// /admin/scholarship — the scholarship review queue. Claims are
// ranked within their cohort (top score wins); the check column
// is the automatic PDF check. Open a claim to decide and pay.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { COHORT_SCHOLARSHIP, formatPrice } from "@/lib/marketing/offer";
import { claimListFilterSchema } from "@/lib/scholarship/schemas";
import {
  listClaimsForAdmin,
  toRankInput,
  type AdminClaimListItem,
} from "@/lib/scholarship/queries";
import { rankClaims, type Ranked } from "@/lib/scholarship/ranking";
import {
  WbPage,
  WbPill,
  WbSearch,
  WbStats,
  WbTable,
  WbTabs,
  WbToolbar,
  formatDate,
} from "@/components/admin/workbench";
import { STATUS_LABEL, STATUS_TONE, VERDICT_LABEL, VERDICT_TONE, claimStage } from "./labels";

export const metadata: Metadata = { title: "Scholarship review | Karman admin" };
export const dynamic = "force-dynamic";

type Item = AdminClaimListItem & { ranked: Ranked | undefined };

export default async function ScholarshipQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filter = claimListFilterSchema.parse({ status: raw.status, q: raw.q });
  let claims: AdminClaimListItem[] = [];
  let loadError: string | null = null;
  try {
    claims = await listClaimsForAdmin();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Claims could not be loaded.";
  }
  const ranks = new Map(rankClaims(claims.map(toRankInput)).map((r) => [r.id, r]));
  const count = (s: string) => claims.filter((c) => s === "all" || claimStage(c) === s).length;
  const q = filter.q.toLowerCase();
  const rows: Item[] = claims
    .filter((c) => filter.status === "all" || claimStage(c) === filter.status)
    .filter(
      (c) =>
        !q ||
        c.studentName.toLowerCase().includes(q) ||
        (c.studentEmail ?? "").toLowerCase().includes(q) ||
        c.cohortName.toLowerCase().includes(q)
    )
    .map((c) => ({ ...c, ranked: ranks.get(c.id) }))
    .sort((a, b) =>
      a.cohortName === b.cohortName
        ? (a.ranked?.rank ?? 999) - (b.ranked?.rank ?? 999)
        : a.cohortName.localeCompare(b.cohortName)
    );

  return (
    <WbPage
      title="Scholarship review"
      summary={`${formatPrice(COHORT_SCHOLARSHIP.amount)} to the top official SAT score in each cohort (split evenly in a tie): the cohort price back as a Stripe refund, in test mode, and the rest as a bank transfer you send by hand.`}
      actions={
        <Link className="kp-link" href="/terms#cohort-scholarship">
          The rules families see
        </Link>
      }
    >
      <WbStats
        items={[
          { label: "Waiting for review", value: count("submitted") },
          { label: "Approved, refund next", value: count("approved") },
          { label: "Bank transfer due", value: count("transfer") },
          { label: "Paid", value: count("paid") },
        ]}
      />
      <WbToolbar>
        <WbTabs
          label="Claim status"
          param="status"
          value={filter.status}
          basePath="/admin/scholarship"
          params={{ q: filter.q || undefined }}
          options={[
            { value: "submitted", label: "Waiting", count: count("submitted") },
            { value: "approved", label: "Approved", count: count("approved") },
            { value: "transfer", label: "Bank transfer due", count: count("transfer") },
            { value: "paid", label: "Paid", count: count("paid") },
            { value: "rejected", label: "Rejected", count: count("rejected") },
            { value: "all", label: "All", count: count("all") },
          ]}
        />
        <WbSearch
          label="Search claims"
          placeholder="Student, email or cohort"
          value={filter.q}
          action="/admin/scholarship"
          keep={{ status: filter.status }}
        />
      </WbToolbar>
      {loadError && (
        <p role="alert" className="wb-alert">
          {loadError}
        </p>
      )}
      <WbTable<Item>
        caption="Scholarship claims"
        rows={rows}
        rowKey={(r) => r.id}
        empty={
          filter.q
            ? `No claims match "${filter.q}".`
            : filter.status === "submitted"
              ? "Nothing to review. New score reports show up here when students upload them."
              : "No claims here yet."
        }
        columns={[
          {
            key: "student",
            label: "Student",
            cell: (r) => (
              <>
                <Link href={`/admin/scholarship/${r.id}`}>{r.studentName}</Link>
                <small>{r.studentEmail}</small>
              </>
            ),
          },
          { key: "cohort", label: "Cohort", cell: (r) => r.cohortName },
          {
            key: "score",
            label: "Score",
            numeric: true,
            cell: (r) => (
              <>
                {r.extracted_total_score ?? r.declared_total_score ?? "—"}
                {r.extracted_total_score === null ? (
                  <small>typed, not read</small>
                ) : r.declared_total_score !== null &&
                  r.declared_total_score !== r.extracted_total_score ? (
                  <small>typed {r.declared_total_score}</small>
                ) : null}
              </>
            ),
          },
          {
            key: "rank",
            label: "Rank in cohort",
            cell: (r) =>
              r.ranked?.rank ? (
                <>
                  {r.ranked.rank === 1 ? (
                    <WbPill tone="ok">{r.ranked.tied ? "Top score, tied" : "Top score"}</WbPill>
                  ) : (
                    `#${r.ranked.rank}`
                  )}
                  {r.ranked.tied && r.ranked.rank !== 1 && <small>Tied</small>}
                </>
              ) : (
                "—"
              ),
          },
          {
            key: "check",
            label: "Automatic check",
            cell: (r) =>
              r.check_verdict ? (
                <WbPill tone={VERDICT_TONE[r.check_verdict]}>
                  {VERDICT_LABEL[r.check_verdict]}
                </WbPill>
              ) : (
                "—"
              ),
          },
          { key: "submitted", label: "Uploaded", cell: (r) => formatDate(r.submitted_at) },
          {
            key: "status",
            label: "Status",
            cell: (r) => (
              <WbPill tone={STATUS_TONE[claimStage(r)]}>{STATUS_LABEL[claimStage(r)]}</WbPill>
            ),
          },
        ]}
      />
    </WbPage>
  );
}
