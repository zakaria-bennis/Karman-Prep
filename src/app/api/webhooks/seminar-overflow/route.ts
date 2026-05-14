// ============================================================
// POST /api/webhooks/seminar-overflow
//
// Triggered by a Supabase Database Webhook on cohort_members
// INSERT. Counts active members in the affected cohort; if it
// exceeds 200 (the seminar cap), we:
//   1. Create a sibling 'group' cohort named "<original> · Overflow N"
//      with the same tutor/sat_date but no auto-population.
//   2. Email the admin so they can rebalance students into the
//      new cohort and configure its Cal/Zoom event.
//
// We do NOT call Cal.com to provision a new event-type here —
// the Cal-side seminar config (event-type slug, schedule, Zoom
// integration) requires admin judgment and is a 30-second
// dashboard task. The email tells them what to do.
//
// Auth: simple shared secret in `Authorization: Bearer ...`.
// Configure SUPABASE_DB_WEBHOOK_SECRET in .env.local AND in the
// Supabase Dashboard → Database → Webhooks → custom HTTP header.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resend, FROM } from "@/lib/integrations/resend/client";

export const runtime = "nodejs";

const SEMINAR_CAP = 200;

interface CohortMembersInsertPayload {
  type: string;
  table: string;
  schema: string;
  record?: { cohort_id?: string; left_at?: string | null };
  old_record?: unknown;
}

export async function POST(req: NextRequest) {
  const expected = process.env.SUPABASE_DB_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[seminar-overflow] SUPABASE_DB_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CohortMembersInsertPayload;
  try {
    payload = (await req.json()) as CohortMembersInsertPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    payload.table !== "cohort_members" ||
    payload.type !== "INSERT" ||
    !payload.record?.cohort_id ||
    payload.record.left_at != null
  ) {
    // Wrong table, wrong event type, or member is being inactivated — ignore.
    return NextResponse.json({ received: true, note: "not a relevant insert" });
  }

  const cohortId = payload.record.cohort_id;
  const supa = createAdminClient();

  const [{ data: cohort, error: cErr }, { count: activeCount, error: countErr }] =
    await Promise.all([
      supa
        .from("cohorts")
        .select("id, name, tier, tutor_user_id, sat_date")
        .eq("id", cohortId)
        .maybeSingle(),
      supa
        .from("cohort_members")
        .select("cohort_id", { count: "exact", head: true })
        .eq("cohort_id", cohortId)
        .is("left_at", null),
    ]);

  if (cErr || !cohort) {
    console.error("[seminar-overflow] cohort lookup failed:", cErr);
    return NextResponse.json({ error: "Cohort lookup failed" }, { status: 500 });
  }
  if (countErr) {
    console.error("[seminar-overflow] count failed:", countErr);
    return NextResponse.json({ error: "Member count failed" }, { status: 500 });
  }

  // Only seminar (`group`) cohorts have a 200-cap. Small-group cohorts
  // are capped at 5 by product policy and are managed manually.
  const c = cohort as {
    id: string;
    name: string;
    tier: "group" | "small_group";
    tutor_user_id: string;
    sat_date: string | null;
  };

  if (c.tier !== "group") {
    return NextResponse.json({ received: true, note: "not a seminar cohort" });
  }
  const count = activeCount ?? 0;
  if (count <= SEMINAR_CAP) {
    return NextResponse.json({ received: true, count });
  }

  // Create the overflow cohort. Naming pattern: "<original> · Overflow"
  // (or " · Overflow 2", "· Overflow 3" if multiples already exist).
  const baseName = c.name.replace(/\s*·\s*Overflow.*$/i, "");
  const { count: existingOverflow } = await supa
    .from("cohorts")
    .select("id", { count: "exact", head: true })
    .eq("tutor_user_id", c.tutor_user_id)
    .ilike("name", `${baseName} · Overflow%`);
  const idx = (existingOverflow ?? 0) + 1;
  const overflowName = idx === 1 ? `${baseName} · Overflow` : `${baseName} · Overflow ${idx}`;

  const { data: newCohort, error: nErr } = await supa
    .from("cohorts")
    .insert({
      name: overflowName,
      tier: "group",
      tutor_user_id: c.tutor_user_id,
      sat_date: c.sat_date,
    })
    .select("id, name")
    .single();
  if (nErr) {
    console.error("[seminar-overflow] new cohort insert failed:", nErr);
    return NextResponse.json({ error: "Overflow cohort insert failed" }, { status: 500 });
  }

  // Email all admins.
  const { data: admins } = await supa.from("users").select("email, first_name").eq("role", "admin");
  const adminEmails = (admins ?? []).map((a) => a.email as string).filter((e) => !!e);

  if (adminEmails.length > 0) {
    try {
      await resend.emails.send({
        from: FROM,
        to: adminEmails,
        subject: `Seminar overflow — "${c.name}" passed ${SEMINAR_CAP} members`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
            <h2 style="color: #0f172a;">Seminar overflow triggered</h2>
            <p style="color: #334155;">
              The seminar cohort <strong>${c.name}</strong> just exceeded the ${SEMINAR_CAP}-student cap (now at ${count}).
              We've automatically created a sibling cohort named <strong>${newCohort?.name ?? overflowName}</strong>.
            </p>
            <p style="color: #334155;">
              Next steps:
            </p>
            <ol style="color: #334155;">
              <li>Rebalance students by moving some from <em>${c.name}</em> to <em>${newCohort?.name ?? overflowName}</em>.</li>
              <li>Configure the new cohort's seminar event in Cal.com (event-type, schedule, Zoom location).</li>
              <li>Resume normal admin push flow once both seminars are scheduled.</li>
            </ol>
          </div>
        `,
      });
    } catch (err) {
      console.error("[seminar-overflow] admin email failed:", err);
      // Don't fail the request — overflow cohort was created, that's the important bit.
    }
  } else {
    console.warn("[seminar-overflow] no admin users found to notify");
  }

  return NextResponse.json({
    received: true,
    overflowCreated: true,
    overflowCohortId: newCohort?.id,
    parentCount: count,
  });
}
