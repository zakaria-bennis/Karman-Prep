"use client";

// ============================================================
// QuestionnaireClient — multi-step intake form, Karman cloud
// aesthetic. Renders a glass card on top of the auth backdrop.
//
// Steps depend on tier:
//   1. SAT schedule        (everyone)
//   2. Background          (everyone)
//   3. Availability        (private + elite only)
//   4. Family contact      (everyone)
//   5. How-did-you-hear    (everyone)
//   6. Submit + summary
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  GraduationCap,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SatScheduleStep, type SatDateOption } from "./_steps/SatSchedule";
import { BackgroundStep } from "./_steps/Background";
import { AvailabilityStep } from "./_steps/Availability";
import { FamilyStep } from "./_steps/Family";
import { HeardStep } from "./_steps/Heard";
import { DoneSummary } from "./_steps/DoneSummary";
import { COMMON_TZ } from "./_steps/shared";

export type { SatDateOption };

interface Props {
  firstName: string;
  tier: "group" | "small_group" | "private" | "elite";
  satDates: SatDateOption[];
}

export default function QuestionnaireClient({ firstName, tier, satDates }: Props) {
  const router = useRouter();
  const isOneToOne = tier === "private" || tier === "elite";

  // ─── Form state ──────────────────────────────────────────
  const [satTestDate, setSatTestDate] = useState<string>("");
  const [goalSatScore, setGoalSatScore] = useState<number>(1300);
  const [hsYear, setHsYear] = useState<string>("");
  const [satTaken, setSatTaken] = useState<"yes" | "no" | "">("");
  const [recentSatMath, setRecentSatMath] = useState<number>(500);
  const [recentSatReading, setRecentSatReading] = useState<number>(500);
  const [recentSatTimePressure, setRecentSatTimePressure] = useState<"yes" | "no" | "">("");
  const [psatTaken, setPsatTaken] = useState<"yes" | "no" | "">("");
  const [psatScore, setPsatScore] = useState<number>(1000);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [timeZone, setTimeZone] = useState<string>("America/New_York");
  const [parentEmail, setParentEmail] = useState<string>("");
  const [parentPhone, setParentPhone] = useState<string>("");
  const [heardAboutKarman, setHeardAboutKarman] = useState<string>("");

  // Browser-detected default tz
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && COMMON_TZ.includes(tz)) setTimeZone(tz);
      else if (tz) setTimeZone(tz);
    } catch {
      /* keep default */
    }
  }, []);

  // ─── Step list (depends on tier) ─────────────────────────
  const steps = useMemo(() => {
    const all = [
      { key: "sat", label: "SAT", icon: CalendarCheck },
      { key: "bg", label: "Background", icon: GraduationCap },
      ...(isOneToOne ? [{ key: "avail", label: "Availability", icon: Clock }] : []),
      { key: "family", label: "Family", icon: Users },
      { key: "heard", label: "Source", icon: Sparkles },
    ];
    return all;
  }, [isOneToOne]);

  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx];

  // ─── Per-step validation ─────────────────────────────────
  function canAdvance(): { ok: boolean; reason?: string } {
    if (currentStep.key === "sat") {
      if (!satTestDate) return { ok: false, reason: "Pick your SAT date." };
      if (goalSatScore < 400 || goalSatScore > 1600)
        return { ok: false, reason: "Goal score must be 400–1600." };
    }
    if (currentStep.key === "bg") {
      if (!hsYear) return { ok: false, reason: "Pick your high school year." };
      if (!satTaken) return { ok: false, reason: "Have you taken the SAT?" };
      if (satTaken === "yes" && !recentSatTimePressure) {
        return { ok: false, reason: "Was time a pressuring factor?" };
      }
      if (!psatTaken) return { ok: false, reason: "Have you taken the PSAT?" };
    }
    if (currentStep.key === "avail") {
      if (availableDays.length === 0)
        return { ok: false, reason: "Pick at least one available day." };
      if (availableTimes.length === 0)
        return { ok: false, reason: "Pick at least one available time." };
      if (!timeZone) return { ok: false, reason: "Pick your timezone." };
    }
    return { ok: true };
  }

  // ─── Submit ──────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ tier: string; placement: Record<string, unknown> } | null>(
    null
  );
  const [validationErr, setValidationErr] = useState<string | null>(null);

  async function handleSubmit() {
    const v = canAdvance();
    if (!v.ok) {
      setValidationErr(v.reason ?? "Required field missing");
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          satTestDate,
          goalSatScore,
          hsYear,
          recentSatMath: satTaken === "yes" ? recentSatMath : null,
          recentSatReading: satTaken === "yes" ? recentSatReading : null,
          recentSatTimePressure: satTaken === "yes" ? recentSatTimePressure === "yes" : null,
          psatScore: psatTaken === "yes" ? psatScore : null,
          availableDays: isOneToOne ? availableDays : undefined,
          availableTimes: isOneToOne ? availableTimes : undefined,
          timeZone: isOneToOne ? timeZone : undefined,
          parentEmail: parentEmail.trim() || null,
          parentPhone: parentPhone.trim() || null,
          heardAboutKarman: heardAboutKarman || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        tier?: string;
        placement?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setSubmitErr(body.error ?? `Submit failed (${res.status})`);
        return;
      }
      setDone({ tier: body.tier ?? tier, placement: body.placement ?? {} });
    } catch (err) {
      setSubmitErr((err as Error).message ?? "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setValidationErr(null);
    const v = canAdvance();
    if (!v.ok) {
      setValidationErr(v.reason ?? null);
      return;
    }
    if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1);
    else handleSubmit();
  }

  function prev() {
    setValidationErr(null);
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  // ─── Done state ──────────────────────────────────────────
  if (done) {
    return (
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-md">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
        <h2 className="mb-2 text-2xl font-extrabold text-white">You&apos;re all set</h2>
        <DoneSummary tier={done.tier} placement={done.placement} />
        <button
          onClick={() => router.push("/dashboard/student")}
          className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 px-6 py-3 font-bold text-white transition-all hover:from-blue-500 hover:via-indigo-400 hover:to-violet-400"
        >
          Go to your dashboard
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="relative z-10 w-full max-w-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-300">
          Welcome, {firstName}
        </p>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Let&apos;s get you{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-300 bg-clip-text font-extrabold italic text-transparent">
            placed
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          A few questions so we can match you with the right cohort and tutor.
        </p>
      </div>

      {/* Step indicator */}
      <ol className="mb-5 flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
                i < stepIdx
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                  : i === stepIdx
                    ? "border-transparent bg-gradient-to-br from-blue-500 to-violet-500 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400"
              )}
            >
              {i + 1}
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-white/10" />}
          </li>
        ))}
      </ol>

      {/* Card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <currentStep.icon className="h-3.5 w-3.5" />
          Step {stepIdx + 1} of {steps.length} — {currentStep.label}
        </div>

        {currentStep.key === "sat" && (
          <SatScheduleStep
            satDates={satDates}
            satTestDate={satTestDate}
            setSatTestDate={setSatTestDate}
            goalSatScore={goalSatScore}
            setGoalSatScore={setGoalSatScore}
          />
        )}

        {currentStep.key === "bg" && (
          <BackgroundStep
            hsYear={hsYear}
            setHsYear={setHsYear}
            satTaken={satTaken}
            setSatTaken={setSatTaken}
            recentSatMath={recentSatMath}
            setRecentSatMath={setRecentSatMath}
            recentSatReading={recentSatReading}
            setRecentSatReading={setRecentSatReading}
            recentSatTimePressure={recentSatTimePressure}
            setRecentSatTimePressure={setRecentSatTimePressure}
            psatTaken={psatTaken}
            setPsatTaken={setPsatTaken}
            psatScore={psatScore}
            setPsatScore={setPsatScore}
          />
        )}

        {currentStep.key === "avail" && (
          <AvailabilityStep
            availableDays={availableDays}
            setAvailableDays={setAvailableDays}
            availableTimes={availableTimes}
            setAvailableTimes={setAvailableTimes}
            timeZone={timeZone}
            setTimeZone={setTimeZone}
          />
        )}

        {currentStep.key === "family" && (
          <FamilyStep
            parentEmail={parentEmail}
            setParentEmail={setParentEmail}
            parentPhone={parentPhone}
            setParentPhone={setParentPhone}
          />
        )}

        {currentStep.key === "heard" && (
          <HeardStep
            heardAboutKarman={heardAboutKarman}
            setHeardAboutKarman={setHeardAboutKarman}
          />
        )}

        {validationErr && <p className="mt-4 text-sm text-rose-300">{validationErr}</p>}
        {submitErr && <p className="mt-4 text-sm text-rose-300">{submitErr}</p>}

        {/* Footer buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={stepIdx === 0 || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:from-blue-500 hover:via-indigo-400 hover:to-violet-400 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {stepIdx === steps.length - 1 ? "Finish & place me" : "Next"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
