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

const VALID_HS_YEARS = ["freshman", "sophomore", "junior", "senior"] as const;
const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const VALID_TIMES = ["morning", "afternoon", "evening"] as const;

interface OnboardingPayload {
  // Always required
  satTestDate: string; // YYYY-MM-DD
  goalSatScore: number; // 400–1600
  hsYear: (typeof VALID_HS_YEARS)[number];

  // Optional academic background
  recentSatMath?: number | null;
  recentSatReading?: number | null;
  recentSatTimePressure?: boolean | null;
  psatScore?: number | null;

  // Required for Private/Elite
  availableDays?: string[];
  availableTimes?: string[];
  timeZone?: string;

  // Always collected
  parentEmail?: string | null;
  parentPhone?: string | null;
  heardAboutStrata?: string | null;
}

function validate(p: Partial<OnboardingPayload>, tier: string): string | null {
  if (!p.satTestDate || !/^\d{4}-\d{2}-\d{2}$/.test(p.satTestDate)) {
    return "satTestDate (YYYY-MM-DD) required";
  }
  if (typeof p.goalSatScore !== "number" || p.goalSatScore < 400 || p.goalSatScore > 1600) {
    return "goalSatScore must be 400-1600";
  }
  if (!p.hsYear || !VALID_HS_YEARS.includes(p.hsYear as (typeof VALID_HS_YEARS)[number])) {
    return "hsYear required (freshman|sophomore|junior|senior)";
  }
  if (p.recentSatMath != null && (p.recentSatMath < 200 || p.recentSatMath > 800)) {
    return "recentSatMath must be 200-800";
  }
  if (p.recentSatReading != null && (p.recentSatReading < 200 || p.recentSatReading > 800)) {
    return "recentSatReading must be 200-800";
  }
  if (p.psatScore != null && (p.psatScore < 320 || p.psatScore > 1520)) {
    return "psatScore must be 320-1520";
  }

  const isOneToOne = tier === "private" || tier === "elite";
  if (isOneToOne) {
    if (!p.availableDays || p.availableDays.length === 0) {
      return "availableDays required for Private/Elite";
    }
    if (!p.availableTimes || p.availableTimes.length === 0) {
      return "availableTimes required for Private/Elite";
    }
    if (!p.timeZone) return "timeZone required for Private/Elite";
    for (const d of p.availableDays) {
      if (!VALID_DAYS.includes(d as (typeof VALID_DAYS)[number])) return `Invalid day: ${d}`;
    }
    for (const t of p.availableTimes) {
      if (!VALID_TIMES.includes(t as (typeof VALID_TIMES)[number])) return `Invalid time: ${t}`;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<OnboardingPayload>;
  try {
    body = (await req.json()) as Partial<OnboardingPayload>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription — onboarding requires a paid plan." },
      { status: 403 }
    );
  }

  const validationErr = validate(body, sub.tier);
  if (validationErr) {
    return NextResponse.json({ error: validationErr }, { status: 400 });
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
        satTestDate: body.satTestDate!,
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
