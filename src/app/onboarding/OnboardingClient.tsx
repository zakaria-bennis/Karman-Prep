"use client";

// ============================================================
// OnboardingClient — pre-payment questionnaire that ends in a
// plan recommendation.
//
// Replaces the old "Are you a Student / Tutor / Parent?" picker.
// Runs BEFORE the user picks a tier, so its job is to learn
// enough about the student to recommend the right tier — and
// explain WHY that tier — without asking the obvious "would
// you like a small group or 1-on-1?" question (which just
// hands the student the answer).
//
// Step flow:
//   1. Role             (Student / Parent — re-frames every later
//                        question's wording)
//   2. SAT date         (test date OR "not registered yet")
//   3. Goal score       (target)
//   4. Baseline         (most recent SAT/PSAT, or "haven't taken")
//   5. Hours/week       (study time available)
//   6. Independence     (can the student stay on track alone?)
//   7. Learning pace    (how fast does new material click?)
//   8. Prior prep       (have they tried prep before, did it work?)
//   9. Billing          (subscription vs per-session)
//  10. Recommendation   (tier + reasoning + signals + CTA)
//
// Tutors come in through a separate URL — they don't need this
// recommendation flow.
// ============================================================

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, GraduationCap, Users, CalendarCheck, Target,
  Clock, Sparkles, CheckCircle2, Loader2, Compass, Gauge, History, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  recommendTier, tierLabel,
  type Recommendation, type Independence, type LearningPace,
  type PriorPrepResult, type BillingPreference,
} from "@/lib/onboarding/recommend-tier";

type Role = "student" | "parent";

// Re-framing labels — same prompt, different subject.
const COPY = {
  student: {
    sat: "When are you planning to take the SAT?",
    goal: "What's your goal SAT score?",
    baselineQ: "Have you taken the SAT or PSAT recently?",
    baselineYes: "Yes — I'll enter my score",
    baselineNo: "Not yet",
    hours: "How many hours per week can you commit to studying?",
    indeQ: "How well do you stay on track when you're studying alone?",
    indeOnOwn: "I finish what I start without anyone checking on me.",
    indeCheckins: "I do best when someone checks in regularly.",
    indeStructure: "I tend to procrastinate without scheduled time and accountability.",
    paceQ: "When you learn something new, how does it usually go?",
    paceQuick: "I usually get it on the first explanation.",
    paceAvg: "I get it after a couple of practice rounds.",
    paceSlow: "I prefer to work through it multiple ways before it sticks.",
    priorQ: "Have you tried test prep before for the SAT?",
    priorFirst: "First time prepping for the SAT.",
    priorWorked: "Yes — and my score moved.",
    priorFlat: "Yes — but my score didn't really move.",
  },
  parent: {
    sat: "When is your child planning to take the SAT?",
    goal: "What's your child's goal SAT score?",
    baselineQ: "Has your child taken the SAT or PSAT recently?",
    baselineYes: "Yes — I'll enter their score",
    baselineNo: "Not yet",
    hours: "How many hours per week can your child commit to studying?",
    indeQ: "How well does your child stay on track when studying alone?",
    indeOnOwn: "They finish what they start without anyone checking on them.",
    indeCheckins: "They do best when someone checks in regularly.",
    indeStructure: "They tend to procrastinate without scheduled time and accountability.",
    paceQ: "When your child learns something new, how does it usually go?",
    paceQuick: "They usually get it on the first explanation.",
    paceAvg: "They get it after a couple of practice rounds.",
    paceSlow: "They prefer to work through it multiple ways before it sticks.",
    priorQ: "Has your child tried test prep before for the SAT?",
    priorFirst: "First time prepping for the SAT.",
    priorWorked: "Yes — and their score moved.",
    priorFlat: "Yes — but their score didn't really move.",
  },
} as const;

// Real Digital SAT US administration dates (2026).
// Including the "not registered yet" escape hatch — many students
// haven't picked a date when they start prep.
const SAT_DATES = [
  { iso: "not_registered", label: "Not registered yet" },
  { iso: "2026-05-02", label: "May 2, 2026" },
  { iso: "2026-06-06", label: "Jun 6, 2026" },
  { iso: "2026-08-22", label: "Aug 22, 2026" },
  { iso: "2026-09-12", label: "Sep 12, 2026" },
  { iso: "2026-10-03", label: "Oct 3, 2026" },
  { iso: "2026-11-07", label: "Nov 7, 2026" },
  { iso: "2026-12-05", label: "Dec 5, 2026" },
];

export default function OnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierOverride = searchParams.get("tier");

  // ─── Form state ──────────────────────────────────────────
  const [role, setRole] = useState<Role>("student");
  const [satDate, setSatDate] = useState<string>("");
  const [goalScore, setGoalScore] = useState<number>(1300);
  const [hasBaseline, setHasBaseline] = useState<"" | "yes" | "no">("");
  const [baselineScore, setBaselineScore] = useState<number>(1000);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(5);
  const [independence, setIndependence] = useState<Independence | "">("");
  const [pace, setPace] = useState<LearningPace | "">("");
  const [priorPrep, setPriorPrep] = useState<PriorPrepResult | "">("");
  const [billing, setBilling] = useState<BillingPreference | "">("");

  const copy = COPY[role];
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const steps = useMemo(() => [
    "role", "sat", "goal", "baseline", "hours",
    "independence", "pace", "prior", "billing", "recommendation",
  ] as const, []);
  const totalSteps = steps.length;
  const currentStep = steps[step];
  const isLast = step === totalSteps - 1;

  const canAdvance = (() => {
    switch (currentStep) {
      case "role": return !!role;
      case "sat":  return !!satDate;
      case "goal": return goalScore >= 400 && goalScore <= 1600;
      case "baseline":
        if (hasBaseline === "") return false;
        if (hasBaseline === "yes") return baselineScore >= 400 && baselineScore <= 1600;
        return true;
      case "hours": return hoursPerWeek >= 1;
      case "independence": return !!independence;
      case "pace": return !!pace;
      case "prior": return !!priorPrep;
      case "billing": return !!billing;
      default: return true;
    }
  })();

  // ─── Compute recommendation ──────────────────────────────
  const recommendation: Recommendation | null = useMemo(() => {
    if (!independence || !pace || !priorPrep || !billing || !satDate) return null;
    const weeksToTest =
      satDate === "not_registered"
        ? null
        : Math.max(
            1,
            Math.round((new Date(satDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
          );
    return recommendTier({
      weeksToTest,
      goalScore,
      baselineScore: hasBaseline === "yes" ? baselineScore : null,
      hoursPerWeek,
      independence,
      pace,
      priorPrep,
      billingPreference: billing,
    });
  }, [satDate, goalScore, hasBaseline, baselineScore, hoursPerWeek, independence, pace, priorPrep, billing]);

  function next() { if (canAdvance && step < totalSteps - 1) setStep(step + 1); }
  function back() { if (step > 0) setStep(step - 1); }

  async function startCheckout(tier: string) {
    setSubmitting(true);
    try {
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }).catch(() => {});
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else router.push(`/billing?tier=${tier}`);
    } catch (err) {
      console.error("[onboarding] checkout failed:", err);
      setSubmitting(false);
      router.push(`/billing?tier=${tier}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Step {Math.min(step + 1, totalSteps)} of {totalSteps}</span>
            <span>{role === "student" ? "Student intake" : "Parent intake"}</span>
          </div>
          <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] dark:bg-slate-900/40 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
          {currentStep === "role" && <RoleStep role={role} onPick={setRole} />}

          {currentStep === "sat" && (
            <SatStep prompt={copy.sat} value={satDate} onChange={setSatDate} />
          )}

          {currentStep === "goal" && (
            <ScoreStep
              prompt={copy.goal}
              value={goalScore}
              onChange={setGoalScore}
              icon={<Target className="w-5 h-5 text-blue-400" />}
            />
          )}

          {currentStep === "baseline" && (
            <BaselineStep
              prompt={copy.baselineQ}
              yesLabel={copy.baselineYes}
              noLabel={copy.baselineNo}
              has={hasBaseline}
              onPickHas={setHasBaseline}
              score={baselineScore}
              onScoreChange={setBaselineScore}
            />
          )}

          {currentStep === "hours" && (
            <HoursStep prompt={copy.hours} value={hoursPerWeek} onChange={setHoursPerWeek} />
          )}

          {currentStep === "independence" && (
            <ChoiceStep
              icon={<Compass className="w-5 h-5 text-blue-400" />}
              prompt={copy.indeQ}
              options={[
                { id: "on_my_own",      label: copy.indeOnOwn },
                { id: "with_checkins",  label: copy.indeCheckins },
                { id: "needs_structure",label: copy.indeStructure },
              ]}
              value={independence}
              onChange={(v) => setIndependence(v as Independence)}
            />
          )}

          {currentStep === "pace" && (
            <ChoiceStep
              icon={<Gauge className="w-5 h-5 text-blue-400" />}
              prompt={copy.paceQ}
              options={[
                { id: "quick",   label: copy.paceQuick },
                { id: "average", label: copy.paceAvg },
                { id: "slower",  label: copy.paceSlow },
              ]}
              value={pace}
              onChange={(v) => setPace(v as LearningPace)}
            />
          )}

          {currentStep === "prior" && (
            <ChoiceStep
              icon={<History className="w-5 h-5 text-blue-400" />}
              prompt={copy.priorQ}
              options={[
                { id: "first_time", label: copy.priorFirst },
                { id: "worked",     label: copy.priorWorked },
                { id: "didnt_move", label: copy.priorFlat },
              ]}
              value={priorPrep}
              onChange={(v) => setPriorPrep(v as PriorPrepResult)}
            />
          )}

          {currentStep === "billing" && (
            <ChoiceStep
              icon={<CreditCard className="w-5 h-5 text-blue-400" />}
              prompt="How would you prefer to pay?"
              hint="All plans come with live tutoring — this just changes how billing works."
              options={[
                { id: "subscription", label: "Predictable monthly subscription — same charge every month." },
                { id: "per_session",  label: "Pay per session — only billed when I actually book one." },
              ]}
              value={billing}
              onChange={(v) => setBilling(v as BillingPreference)}
            />
          )}

          {currentStep === "recommendation" && recommendation && (
            <RecommendationStep
              recommendation={tierOverride ? { ...recommendation, tier: tierOverride as Recommendation["tier"] } : recommendation}
              onPick={startCheckout}
              submitting={submitting}
              role={role}
            />
          )}

          {!isLast && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canAdvance}
                className="btn-primary"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step components
// ─────────────────────────────────────────────────────────────

function RoleStep({ role, onPick }: { role: Role; onPick: (r: Role) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Who's filling this out?</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        We'll word the rest of the questions accordingly.
      </p>
      <div className="mt-6 space-y-3">
        <RoleOption
          icon={<GraduationCap className="w-5 h-5" />}
          label="I'm the student"
          desc="I want to improve my SAT score."
          active={role === "student"}
          onClick={() => onPick("student")}
        />
        <RoleOption
          icon={<Users className="w-5 h-5" />}
          label="I'm a parent"
          desc="I'm looking for prep for my child."
          active={role === "parent"}
          onClick={() => onPick("parent")}
        />
      </div>
    </div>
  );
}

function RoleOption({
  icon, label, desc, active, onClick,
}: { icon: React.ReactNode; label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
        active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-blue-300"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        active ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
      )}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function SatStep({ prompt, value, onChange }: { prompt: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-blue-400" /> {prompt}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Pick the closest official Digital SAT date — or let us know if you haven't registered yet.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SAT_DATES.map((d) => {
          const isNotRegistered = d.iso === "not_registered";
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onChange(d.iso)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all",
                isNotRegistered && "sm:col-span-2 italic",
                value === d.iso
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-blue-300"
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScoreStep({
  prompt, value, onChange, icon,
}: { prompt: string; value: number; onChange: (n: number) => void; icon: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
        {icon} {prompt}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">SAT scores run 400-1600.</p>
      <div className="mt-8">
        <div className="text-center text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums mb-3">
          {value}
        </div>
        <input
          type="range" min={400} max={1600} step={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-2 tabular-nums">
          <span>400</span><span>800</span><span>1200</span><span>1600</span>
        </div>
      </div>
    </div>
  );
}

function BaselineStep({
  prompt, yesLabel, noLabel, has, onPickHas, score, onScoreChange,
}: {
  prompt: string; yesLabel: string; noLabel: string;
  has: "" | "yes" | "no"; onPickHas: (v: "yes" | "no") => void;
  score: number; onScoreChange: (n: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{prompt}</h2>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPickHas("no")}
          className={cn(
            "px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
            has === "no"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-blue-300"
          )}
        >
          {noLabel}
        </button>
        <button
          type="button"
          onClick={() => onPickHas("yes")}
          className={cn(
            "px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
            has === "yes"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-blue-300"
          )}
        >
          {yesLabel}
        </button>
      </div>
      {has === "yes" && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center mb-3">
            Most recent total
          </p>
          <div className="text-center text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums mb-3">
            {score}
          </div>
          <input
            type="range" min={400} max={1600} step={10}
            value={score}
            onChange={(e) => onScoreChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2 tabular-nums">
            <span>400</span><span>800</span><span>1200</span><span>1600</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HoursStep({ prompt, value, onChange }: { prompt: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-400" /> {prompt}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Honest answer beats optimistic — we use this to size the recommendation.</p>
      <div className="mt-8">
        <div className="text-center text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums mb-1">
          {value}
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-3">
          {value === 1 ? "hour" : "hours"} per week
        </p>
        <input
          type="range" min={1} max={20} step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>1h</span><span>10h</span><span>20h</span>
        </div>
      </div>
    </div>
  );
}

function ChoiceStep({
  icon, prompt, hint, options, value, onChange,
}: {
  icon: React.ReactNode;
  prompt: string;
  hint?: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
        {icon} {prompt}
      </h2>
      {hint && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      <div className="mt-6 space-y-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all",
              value === o.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-blue-300"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecommendationStep({
  recommendation, onPick, submitting, role,
}: {
  recommendation: Recommendation;
  onPick: (tier: string) => void;
  submitting: boolean;
  role: Role;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-blue-400 inline-flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Our recommendation for {role === "parent" ? "your child" : "you"}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
        {recommendation.headline}
      </h2>

      <div className="mt-5 rounded-2xl border border-blue-300/40 bg-blue-50/60 dark:bg-blue-900/10 p-5">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-200 mb-2">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">{tierLabel(recommendation.tier)}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {recommendation.why}
        </p>
      </div>

      {recommendation.signals.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Why we picked this
          </p>
          <ul className="space-y-1">
            {recommendation.signals.map((s, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex gap-2">
                <span className="text-blue-400 shrink-0">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.alsoConsidered && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            We also considered
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {tierLabel(recommendation.alsoConsidered.tier)} —{" "}
            </span>
            {recommendation.alsoConsidered.reason}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onPick(recommendation.tier)}
        disabled={submitting}
        className="btn-primary w-full mt-6 text-base py-4 justify-center"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up checkout…
          </>
        ) : (
          <>
            Start free trial — {tierLabel(recommendation.tier)}
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => onPick("group")}
        className="mt-3 w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      >
        Or browse all plans →
      </button>
    </div>
  );
}
