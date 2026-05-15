// ============================================================
// POST /api/onboarding/submit
//
// Receives the questionnaire payload, persists the answers, runs
// the placement + tutor-matching algorithm, sets
// onboarding_completed_at, and returns the resulting cohort /
// tutor info to the client for confirmation.
//
// Required fields per tier:
//   ALL                 sat_test_date, goal_sat_score, hs_year
//   Private + Elite     available_days, available_times, time_zone
// Other fields are optional. Optional fields with a value are
// validated for shape (range, enum) but not for presence.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveSubscription, getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { assignTutorOneToOne, placeInCohort } from "@/lib/onboarding/placement";
import { onboardingPayloadSchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = onboardingPayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription — onboarding requires a paid plan." },
      { status: 403 }
    );
  }

  // Tier-conditional rule: Private/Elite must declare availability.
  // Zod can't enforce this without the DB lookup, so it lives here.
  if (sub.tier === "private" || sub.tier === "elite") {
    if (!body.availableDays || body.availableDays.length === 0) {
      return NextResponse.json(
        { error: "availableDays required for Private/Elite" },
        { status: 400 }
      );
    }
    if (!body.availableTimes || body.availableTimes.length === 0) {
      return NextResponse.json(
        { error: "availableTimes required for Private/Elite" },
        { status: 400 }
      );
    }
    if (!body.timeZone) {
      return NextResponse.json({ error: "timeZone required for Private/Elite" }, { status: 400 });
    }
  }

  const studentUuid = await getUserUuidByClerkId(userId);
  if (!studentUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const supa = createAdminClient();

  // Persist all answers first.
  const { error: updErr } = await supa
    .from("users")
    .update({
      sat_test_date: body.satTestDate,
      goal_sat_score: body.goalSatScore,
      hs_year: body.hsYear,
      recent_sat_math: body.recentSatMath ?? null,
      recent_sat_reading: body.recentSatReading ?? null,
      recent_sat_time_pressure: body.recentSatTimePressure ?? null,
      psat_score: body.psatScore ?? null,
      available_days: body.availableDays ?? null,
      available_times: body.availableTimes ?? null,
      time_zone: body.timeZone ?? null,
      parent_email_collected: body.parentEmail ?? null,
      parent_phone_collected: body.parentPhone ?? null,
      heard_about_strata: body.heardAboutStrata ?? null,
    })
    .eq("id", studentUuid);
  if (updErr) {
    console.error("[onboarding/submit] user update failed:", updErr);
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }

  // Run placement / matching based on tier. Failures (throw OR
  // no-available-tutor) flag the user for admin follow-up rather
  // than silently leaving them un-placed. The student dashboard
  // shows a "we're matching you with a tutor" banner; the admin
  // gets an email so they can pair the student manually within
  // ~24h (audit #10).
  let placementSummary: Record<string, unknown> = {};
  let placementFailed = false;
  let placementFailureReason: string | null = null;
  try {
    if (sub.tier === "group" || sub.tier === "small_group") {
      const r = await placeInCohort({
        studentUuid,
        tier: sub.tier,
        satTestDate: body.satTestDate,
      });
      placementSummary = {
        cohortId: r.cohortId,
        cohortName: r.cohortName,
        cohortCreated: r.created,
      };
    } else if (sub.tier === "private" || sub.tier === "elite") {
      const r = await assignTutorOneToOne({
        studentUuid,
        availableDays: body.availableDays,
        availableTimes: body.availableTimes,
      });
      if (r) {
        placementSummary = { tutorUuid: r.tutorUuid, matchedAvailability: r.matchedAvailability };
      } else {
        placementSummary = { warning: "No tutors available — admin will assign manually" };
        placementFailed = true;
        placementFailureReason = `No tutor available matching student availability (tier=${sub.tier})`;
      }
    }
  } catch (err) {
    console.error("[onboarding/submit] placement failed:", err);
    placementSummary = { error: "Auto-placement failed; admin will resolve" };
    placementFailed = true;
    placementFailureReason = err instanceof Error ? err.message : "Unknown placement error";
  }

  // Mark onboarding complete. Also stamp placement_failure_at if
  // we hit the warning / catch path so the student dashboard knows
  // to render the matching banner. The flag self-clears via the
  // dashboard's "user has any active cohort/tutor row" check.
  await supa
    .from("users")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      ...(placementFailed ? { placement_failure_at: new Date().toISOString() } : {}),
    })
    .eq("id", studentUuid);

  // Admin alert — best-effort, never blocks onboarding response.
  if (placementFailed) {
    notifyAdminOfPlacementFailure({
      studentUuid,
      tier: sub.tier,
      reason: placementFailureReason ?? "Unknown",
    }).catch((err) => console.error("[onboarding/submit] admin alert failed:", err));
  }

  return NextResponse.json({
    ok: true,
    tier: sub.tier,
    placement: placementSummary,
    placementFailed,
  });
}

/** Fire an email to ADMIN_NOTIFICATION_EMAIL when a student lands
 *  on the dashboard without a cohort/tutor. Best-effort — failures
 *  here are logged but don't block the onboarding response.
 *  Includes the student name + email + tier + failure reason. */
async function notifyAdminOfPlacementFailure(args: {
  studentUuid: string;
  tier: string;
  reason: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  const supa = createAdminClient();
  const { data: student } = await supa
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", args.studentUuid)
    .maybeSingle();
  const name =
    [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim() ||
    student?.email ||
    args.studentUuid;

  const { resend, FROM } = await import("@/lib/integrations/resend/client");
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[Karman] Placement failed for ${name} (${args.tier})`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: auto; padding: 24px; color: #0f172a;">
        <h2 style="margin:0 0 12px 0;">Onboarding placement needs admin attention</h2>
        <p style="color:#334155;">
          <strong>${name}</strong> (${student?.email ?? "no email"}) just finished onboarding on the
          <strong>${args.tier}</strong> tier, but auto-placement failed:
        </p>
        <pre style="background:#f1f5f9; padding:12px; border-radius:8px; font-size:12px; color:#1e293b; white-space:pre-wrap;">${args.reason}</pre>
        <p style="color:#334155;">
          Next step: open <a href="https://karmanprep.com/admin/users">/admin/users</a>, find this
          student, and either
          ${args.tier === "private" || args.tier === "elite" ? "create a tutor_assignments row" : "add them to a cohort from /admin/cohorts"}.
          Once placed, the &ldquo;we&rsquo;re matching you&rdquo; banner on their dashboard goes
          away automatically.
        </p>
        <p style="color:#94a3b8; font-size:11px; margin-top:24px;">
          This alert fires from /api/onboarding/submit when placement throws or returns no match.
        </p>
      </div>
    `,
  });
}
