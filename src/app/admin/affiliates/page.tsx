// ============================================================
// /admin/affiliates — affiliate tutors: their codes, seats used
// out of the limit, their tutor-affiliate subscription and the
// students who redeemed a code. Read-only.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbPage,
  WbPill,
  WbSearch,
  WbStats,
  WbTable,
  WbToolbar,
  formatDate,
  type Tone,
} from "@/components/admin/workbench";
import {
  groupBy,
  isSubscriptionLive,
  loadSubscriptions,
  loadUsers,
  matchesQuery,
  personName,
  selectRows,
  type AdminUserRow,
  type Row,
  type SubscriptionInfo,
} from "@/lib/admin/plans";

export const metadata: Metadata = { title: "Affiliate tutors" };
export const dynamic = "force-dynamic";

const PATH = "/admin/affiliates";

const STATUS_TONE: Record<string, Tone> = {
  active: "ok",
  trialing: "info",
  past_due: "warn",
  unpaid: "fail",
  canceled: "neutral",
};

interface Seat {
  id: string;
  student: AdminUserRow | null;
  code: string | null;
  redeemedAt: string | null;
  removedAt: string | null;
}

interface Tutor {
  id: string;
  user: AdminUserRow | null;
  seatLimit: number;
  activeCodes: string[];
  retiredCodes: number;
  seats: Seat[];
  live: number;
  sub: SubscriptionInfo | null;
}

const text = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export default async function AffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().slice(0, 100);

  const affiliates = await selectRows("tutor_affiliates");
  const ids = affiliates.rows.map((r) => String(r.id));
  const [codes, redemptions] = await Promise.all([
    selectRows("tutor_affiliate_codes", "*", { column: "affiliate_id", values: ids }),
    selectRows("tutor_affiliate_redemptions", "*", { column: "affiliate_id", values: ids }),
  ]);
  const userIds = [
    ...new Set([
      ...affiliates.rows.map((r) => text(r.tutor_user_id)),
      ...redemptions.rows.map((r) => text(r.student_user_id)),
    ]),
  ].filter((v): v is string => v !== null);
  const users = await loadUsers({ column: "id", values: userIds });
  const userById = new Map(users.rows.map((u) => [u.id, u]));
  const tutorClerkIds = affiliates.rows
    .map((r) => userById.get(String(r.tutor_user_id))?.clerkId)
    .filter((v): v is string => !!v);
  const subs = await loadSubscriptions(tutorClerkIds);
  const now = new Date();

  const codeById = new Map(codes.rows.map((c) => [String(c.id), c]));
  const codesByAffiliate = groupBy(codes.rows, (c) => String(c.affiliate_id));
  const seatsByAffiliate = groupBy(redemptions.rows, (r) => String(r.affiliate_id));
  const affiliateSubs = groupBy(
    subs.rows.filter((s) => s.planId === "tutor-affiliate"),
    (s) => s.userId
  );

  const tutors: Tutor[] = affiliates.rows.map((a: Row) => {
    const id = String(a.id);
    const user = userById.get(String(a.tutor_user_id)) ?? null;
    const myCodes = codesByAffiliate.get(id) ?? [];
    const seats: Seat[] = (seatsByAffiliate.get(id) ?? []).map((r) => ({
      id: String(r.id),
      student: userById.get(String(r.student_user_id)) ?? null,
      code: text(codeById.get(String(r.code_id))?.code),
      redeemedAt: text(r.redeemed_at),
      removedAt: text(r.removed_at),
    }));
    const mySubs = (user?.clerkId && affiliateSubs.get(user.clerkId)) || [];
    return {
      id,
      user,
      seatLimit: typeof a.seat_limit === "number" ? a.seat_limit : 50,
      activeCodes: myCodes.filter((c) => !c.retired_at).map((c) => String(c.code)),
      retiredCodes: myCodes.filter((c) => !!c.retired_at).length,
      seats,
      live: seats.filter((s) => s.removedAt === null).length,
      sub: mySubs.find((s) => isSubscriptionLive(s, now)) ?? mySubs[0] ?? null,
    };
  });

  const shown = tutors.filter((t) =>
    matchesQuery(q, [
      t.user ? personName(t.user) : null,
      t.user?.email,
      ...(codesByAffiliate.get(t.id) ?? []).map((c) => text(c.code)),
    ])
  );
  const missing = affiliates.missing || codes.missing || redemptions.missing;
  const loadError = missing
    ? null
    : (affiliates.error ?? codes.error ?? redemptions.error ?? users.error ?? subs.error);

  return (
    <WbPage
      title="Affiliate tutors"
      summary="Tutors on the affiliate plan, their codes and the students who joined with them."
      actions={
        <>
          <Link href="/admin/plans">Plans and subscriptions</Link>
          <Link href="/admin/schools">Schools</Link>
        </>
      }
    >
      {loadError && (
        <p role="alert" className="wb-alert">
          Some affiliate data couldn&apos;t be read: {loadError}
        </p>
      )}

      <WbStats
        items={[
          { label: "Tutors", value: tutors.length },
          { label: "Seats in use", value: tutors.reduce((n, t) => n + t.live, 0) },
          {
            label: "Live subscriptions",
            value: tutors.filter((t) => t.sub && isSubscriptionLive(t.sub, now)).length,
          },
        ]}
      />

      <WbToolbar>
        <WbSearch
          label="Search by tutor name, email or code"
          placeholder="Tutor name, email or code"
          value={q}
          action={PATH}
        />
      </WbToolbar>

      <WbTable<Tutor>
        caption="Affiliate tutors"
        rows={shown}
        rowKey={(t) => t.id}
        empty={
          missing ? (
            <>
              <b>No affiliate tables on this database yet.</b>
              Tutors show up here once the affiliate update is merged.
            </>
          ) : q ? (
            <>
              <b>No tutor matches.</b>
              <Link href={PATH}>Clear the search</Link>
            </>
          ) : (
            <>
              <b>No affiliate tutors yet.</b>
              Tutors show up here once they start the affiliate plan.
            </>
          )
        }
        columns={[
          {
            key: "tutor",
            label: "Tutor",
            cell: (t) => (
              <>
                {t.user ? personName(t.user) : "Unknown tutor"}
                <small>{t.user?.email ?? "No email"}</small>
              </>
            ),
          },
          {
            key: "codes",
            label: "Code",
            cell: (t) => (
              <>
                {t.activeCodes.length ? t.activeCodes.join(", ") : "No active code"}
                {t.retiredCodes > 0 && <small>{t.retiredCodes} retired</small>}
              </>
            ),
          },
          {
            key: "seats",
            label: "Seats",
            numeric: true,
            cell: (t) => `${t.live} / ${t.seatLimit}`,
          },
          {
            key: "sub",
            label: "Subscription",
            cell: (t) =>
              t.sub ? (
                <WbPill tone={STATUS_TONE[t.sub.status] ?? "neutral"}>
                  {t.sub.status.replace("_", " ")}
                </WbPill>
              ) : (
                "No subscription"
              ),
          },
          {
            key: "students",
            label: "Students",
            cell: (t) =>
              t.seats.length === 0 ? (
                "No students yet"
              ) : (
                <details style={{ flex: "1 1 auto", textAlign: "left", minWidth: 0 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    {t.live} {t.live === 1 ? "student" : "students"}
                  </summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
                    {t.seats.map((s) => (
                      <li key={s.id}>
                        {s.student ? personName(s.student) : "Unknown student"}
                        <small>
                          {s.student?.email ?? "No email"} · joined {formatDate(s.redeemedAt)}
                          {s.code ? ` with ${s.code}` : ""}
                          {s.removedAt ? ` · removed ${formatDate(s.removedAt)}` : ""}
                        </small>
                      </li>
                    ))}
                  </ul>
                </details>
              ),
          },
        ]}
      />
    </WbPage>
  );
}
