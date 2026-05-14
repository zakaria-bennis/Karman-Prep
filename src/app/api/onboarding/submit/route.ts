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

  // Run placement / matching based on tier.
  let placementSummary: Record<string, unknown> = {};
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
      if (r)
        placementSummary = { tutorUuid: r.tutorUuid, matchedAvailability: r.matchedAvailability };
      else placementSummary = { warning: "No tutors available — admin will assign manually" };
    }
  } catch (err) {
    console.error("[onboarding/submit] placement failed:", err);
    // Don't fail the whole onboarding — answers are saved. Admin can fix.
    placementSummary = { error: "Auto-placement failed; admin will resolve" };
  }

  // Mark onboarding complete.
  await supa
    .from("users")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", studentUuid);

  return NextResponse.json({
    ok: true,
    tier: sub.tier,
    placement: placementSummary,
  });
}
