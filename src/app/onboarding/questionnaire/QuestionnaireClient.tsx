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

export interface SatDateOption {
  iso: string;
  label: string;
}

interface Props {
  firstName: string;
  tier: "group" | "small_group" | "private" | "elite";
  satDates: SatDateOption[];
}

const HS_YEARS = ["freshman", "sophomore", "junior", "senior"] as const;
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const TIMES = ["morning", "afternoon", "evening"] as const;

const HEARD_OPTIONS = [
  "Friend or classmate",
  "Parent or family member",
  "Tutor or teacher",
  "School counselor",
  "Instagram",
  "TikTok",
  "Google search",
  "YouTube",
  "Reddit",
  "Other",
];

const COMMON_TZ = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

// ─────────────────────────────────────────────────────────────
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
  const [heardAboutStrata, setHeardAboutStrata] = useState<string>("");

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
    if (currentStep.key === "family") {
      // Both are technically optional, but at least one is encouraged.
      // Don't block — empty is allowed. (Spec didn't mark required.)
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
          heardAboutStrata: heardAboutStrata || null,
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
                    : "border-white/10 bg-white/[0.03] text-slate-500"
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
          <Step_SatSchedule
            satDates={satDates}
            satTestDate={satTestDate}
            setSatTestDate={setSatTestDate}
            goalSatScore={goalSatScore}
            setGoalSatScore={setGoalSatScore}
          />
        )}

        {currentStep.key === "bg" && (
          <Step_Background
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
          <Step_Availability
            availableDays={availableDays}
            setAvailableDays={setAvailableDays}
            availableTimes={availableTimes}
            setAvailableTimes={setAvailableTimes}
            timeZone={timeZone}
            setTimeZone={setTimeZone}
          />
        )}

        {currentStep.key === "family" && (
          <Step_Family
            parentEmail={parentEmail}
            setParentEmail={setParentEmail}
            parentPhone={parentPhone}
            setParentPhone={setParentPhone}
          />
        )}

        {currentStep.key === "heard" && (
          <Step_Heard
            heardAboutStrata={heardAboutStrata}
            setHeardAboutStrata={setHeardAboutStrata}
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

// ─────────────────────────────────────────────────────────────
// Step components
// ─────────────────────────────────────────────────────────────

function Step_SatSchedule(props: {
  satDates: SatDateOption[];
  satTestDate: string;
  setSatTestDate: (v: string) => void;
  goalSatScore: number;
  setGoalSatScore: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Which SAT date are you registered for?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {props.satDates.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => props.setSatTestDate(d.iso)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                props.satTestDate === d.iso
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>What&apos;s your goal score?</Label>
        <div className="mb-1 text-center text-3xl font-extrabold text-white">
          {props.goalSatScore}
        </div>
        <input
          type="range"
          min={400}
          max={1600}
          step={10}
          value={props.goalSatScore}
          onChange={(e) => props.setGoalSatScore(Number(e.target.value))}
          className="w-full accent-blue-400"
        />
        <div className="mt-1 flex justify-between text-[11px] text-slate-500">
          <span>400</span>
          <span>1600</span>
        </div>
      </div>
    </div>
  );
}

function Step_Background(props: {
  hsYear: string;
  setHsYear: (v: string) => void;
  satTaken: "yes" | "no" | "";
  setSatTaken: (v: "yes" | "no" | "") => void;
  recentSatMath: number;
  setRecentSatMath: (n: number) => void;
  recentSatReading: number;
  setRecentSatReading: (n: number) => void;
  recentSatTimePressure: "yes" | "no" | "";
  setRecentSatTimePressure: (v: "yes" | "no" | "") => void;
  psatTaken: "yes" | "no" | "";
  setPsatTaken: (v: "yes" | "no" | "") => void;
  psatScore: number;
  setPsatScore: (n: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>What year are you in high school?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {HS_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => props.setHsYear(y)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                props.hsYear === y
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Have you taken the SAT yet?</Label>
        <YesNoChoice value={props.satTaken} onChange={props.setSatTaken} />
      </div>

      {props.satTaken === "yes" && (
        <>
          <div>
            <Label>Most recent Math score</Label>
            <div className="mb-1 text-center text-2xl font-extrabold text-white">
              {props.recentSatMath}
            </div>
            <input
              type="range"
              min={200}
              max={800}
              step={5}
              value={props.recentSatMath}
              onChange={(e) => props.setRecentSatMath(Number(e.target.value))}
              className="w-full accent-blue-400"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>200</span>
              <span>800</span>
            </div>
          </div>
          <div>
            <Label>Most recent Reading & Writing score</Label>
            <div className="mb-1 text-center text-2xl font-extrabold text-white">
              {props.recentSatReading}
            </div>
            <input
              type="range"
              min={200}
              max={800}
              step={5}
              value={props.recentSatReading}
              onChange={(e) => props.setRecentSatReading(Number(e.target.value))}
              className="w-full accent-blue-400"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>200</span>
              <span>800</span>
            </div>
          </div>
          <div>
            <Label>Was time a pressuring factor on that test?</Label>
            <YesNoChoice
              value={props.recentSatTimePressure}
              onChange={props.setRecentSatTimePressure}
            />
          </div>
        </>
      )}

      <div>
        <Label>Have you taken the PSAT?</Label>
        <YesNoChoice value={props.psatTaken} onChange={props.setPsatTaken} />
      </div>
      {props.psatTaken === "yes" && (
        <div>
          <Label>PSAT total score</Label>
          <div className="mb-1 text-center text-2xl font-extrabold text-white">
            {props.psatScore}
          </div>
          <input
            type="range"
            min={320}
            max={1520}
            step={10}
            value={props.psatScore}
            onChange={(e) => props.setPsatScore(Number(e.target.value))}
            className="w-full accent-blue-400"
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>320</span>
            <span>1520</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Step_Availability(props: {
  availableDays: string[];
  setAvailableDays: (v: string[]) => void;
  availableTimes: string[];
  setAvailableTimes: (v: string[]) => void;
  timeZone: string;
  setTimeZone: (v: string) => void;
}) {
  function toggleDay(d: string) {
    props.setAvailableDays(
      props.availableDays.includes(d)
        ? props.availableDays.filter((x) => x !== d)
        : [...props.availableDays, d]
    );
  }
  function toggleTime(t: string) {
    props.setAvailableTimes(
      props.availableTimes.includes(t)
        ? props.availableTimes.filter((x) => x !== t)
        : [...props.availableTimes, t]
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <Label>Which days are you available?</Label>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-7">
          {DAYS.map((d) => {
            const on = props.availableDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-[11px] font-semibold capitalize transition-colors",
                  on
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
                )}
              >
                {d.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>What times work for you?</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIMES.map((t) => {
            const on = props.availableTimes.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTime(t)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-xs font-semibold capitalize transition-colors",
                  on
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
                )}
              >
                <div>{t}</div>
                <div className="text-[10px] font-normal opacity-70">
                  {t === "morning" ? "9–12" : t === "afternoon" ? "12–5" : "5–11"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Your time zone</Label>
        <select
          value={props.timeZone}
          onChange={(e) => props.setTimeZone(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none"
        >
          {COMMON_TZ.map((tz) => (
            <option key={tz} value={tz} className="bg-slate-900">
              {tz}
            </option>
          ))}
          {!COMMON_TZ.includes(props.timeZone) && (
            <option value={props.timeZone} className="bg-slate-900">
              {props.timeZone}
            </option>
          )}
        </select>
      </div>
    </div>
  );
}

function Step_Family(props: {
  parentEmail: string;
  setParentEmail: (v: string) => void;
  parentPhone: string;
  setParentPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">
        Parents see your progress + chat history through the parent portal. Optional but
        recommended.
      </p>
      <div>
        <Label>Parent&apos;s email</Label>
        <input
          type="email"
          value={props.parentEmail}
          onChange={(e) => props.setParentEmail(e.target.value)}
          placeholder="parent@example.com"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
        />
      </div>
      <div>
        <Label>Parent&apos;s phone</Label>
        <input
          type="tel"
          value={props.parentPhone}
          onChange={(e) => props.setParentPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
        />
      </div>
    </div>
  );
}

function Step_Heard(props: { heardAboutStrata: string; setHeardAboutStrata: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <Label>How did you hear about Karman?</Label>
      <div className="grid grid-cols-2 gap-2">
        {HEARD_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => props.setHeardAboutStrata(opt)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
              props.heardAboutStrata === opt
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoneSummary({ tier, placement }: { tier: string; placement: Record<string, unknown> }) {
  if (tier === "group" || tier === "small_group") {
    const name = placement.cohortName as string | undefined;
    const created = placement.cohortCreated as boolean | undefined;
    return (
      <p className="text-sm text-slate-300">
        You&apos;ve been placed in{" "}
        <span className="font-semibold text-white">{name ?? "your cohort"}</span>.
        {created ? " (Brand-new cohort created for your SAT date.)" : ""}
      </p>
    );
  }
  if (tier === "private" || tier === "elite") {
    const matched = placement.matchedAvailability as boolean | undefined;
    return (
      <p className="text-sm text-slate-300">
        You&apos;ve been paired with a tutor.{" "}
        {matched
          ? "Their availability matches yours."
          : "We'll fine-tune the match once your tutor reviews your schedule."}
      </p>
    );
  }
  return <p className="text-sm text-slate-300">You&apos;re all set.</p>;
}

// ─────────────────────────────────────────────────────────────
// Tiny shared bits
// ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
      {children}
    </label>
  );
}

function YesNoChoice({
  value,
  onChange,
}: {
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no" | "") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["yes", "no"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
            value === opt
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
