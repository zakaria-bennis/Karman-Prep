// ============================================================
// /tutor/earnings — the staff tutor's money at a glance.
//
// Lifetime totals, the way to a payout (the one main button,
// only when something is pending), and a link to the detailed
// earnings data. The shell gives the heading and tabs.
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchTutorEarningsSummary } from "@/lib/supabase/queries/earnings";
import { Card, Cta, MoreLink, Num, SectionHeader } from "@/components/portal";
import { WbStats } from "@/components/admin/workbench";

export const metadata: Metadata = { title: "My Earnings — Karman" };
export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtHours = (n: number) => `${n.toFixed(2)}h`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function TutorEarningsPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  const summary = await fetchTutorEarningsSummary(caller.id as string);
  const canRequestPayout = summary.pending_amount > 0;
  const readySessions = summary.sessions_with_recap - summary.sessions_paid;

  return (
    <div className="wb" style={{ paddingBlock: 0 }}>
      <Card>
        <SectionHeader
          title="All time"
          note={`Updated ${timeSince(summary.last_refreshed_at)} ago`}
        />
        <WbStats
          items={[
            { label: "Hours taught", value: <Num>{fmtHours(summary.total_hours_worked)}</Num> },
            { label: "Earned", value: <Num>{fmt.format(summary.total_earnings)}</Num> },
            { label: "Waiting to be paid", value: <Num>{fmt.format(summary.pending_amount)}</Num> },
          ]}
        />
        <p className="kp-meta">
          <Num>{fmt.format(summary.paid_amount)}</Num> paid for{" "}
          <Num>{plural(summary.sessions_paid, "session")}</Num>.
        </p>
      </Card>

      <Card>
        <SectionHeader title="Payout" />
        {canRequestPayout ? (
          <>
            <p className="kp-meta">
              <Num>{fmt.format(summary.pending_amount)}</Num> from{" "}
              <Num>{plural(readySessions, "session")}</Num> is ready. Choose Instant or ACH on the
              next screen.
            </p>
            <Cta href="/tutor/payouts">Request a payout</Cta>
          </>
        ) : (
          <p className="kp-meta">
            Nothing to pay out yet. Send the recap after each session and it becomes ready here.
          </p>
        )}
      </Card>

      <Card>
        <SectionHeader title="Earnings data" />
        <p className="kp-meta">
          Every session by date range, payout history, and the last 12 weeks.
        </p>
        <MoreLink href="/tutor/earnings/data">See earnings data</MoreLink>
      </Card>

      <p className="wb-note">
        Pay is $35 an hour, rounded down to the nearest 15 minutes. The rate is the same for 1:1 and
        group sessions.
      </p>
    </div>
  );
}

function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
