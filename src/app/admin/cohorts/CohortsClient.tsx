"use client";

// ============================================================
// CohortsClient — the interactive slice of /admin/cohorts.
// Table of existing cohorts + a "Create cohort" dialog.
// ============================================================

import { useMemo, useState, useTransition } from "react";
import { Plus, Users, Calendar, GraduationCap, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionCreateCohort } from "./actions";
import type {
  AdminCohortRow,
  SatDateRow,
  TutorRow,
  CohortTier,
  CohortStatus,
} from "@/lib/supabase/queries/cohorts";

// Hard caps mirrored from the DB CHECK constraint and the server action.
// Used for client-side validation + the auto-suggest default.
const TIER_CAP: Record<CohortTier, number> = { small_group: 5, group: 200 };
const TIER_LABEL: Record<CohortTier, string> = {
  small_group: "Small Group",
  group: "Seminar",
};

interface Props {
  cohorts: AdminCohortRow[];
  satDates: SatDateRow[];
  tutors: TutorRow[];
}

export default function CohortsClient({ cohorts, satDates, tutors }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Cohorts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Seminar (≤ 200 students) and small group (≤ 5) cohorts, grouped by SAT date.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          disabled={satDates.length === 0 || tutors.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            satDates.length === 0
              ? "No upcoming SAT dates in the database yet"
              : tutors.length === 0
              ? "No users with role='tutor' yet"
              : undefined
          }
        >
          <Plus className="w-4 h-4" />
          Create cohort
        </button>
      </header>

      {cohorts.length === 0 ? (
        <EmptyState
          canCreate={satDates.length > 0 && tutors.length > 0}
          missingSatDates={satDates.length === 0}
          missingTutors={tutors.length === 0}
        />
      ) : (
        <CohortTable cohorts={cohorts} />
      )}

      {dialogOpen && (
        <CreateCohortDialog
          satDates={satDates}
          tutors={tutors}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────

function CohortTable({ cohorts }: { cohorts: AdminCohortRow[] }) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left  px-4 py-3 font-semibold">Name</th>
            <th className="text-left  px-4 py-3 font-semibold">Tier</th>
            <th className="text-left  px-4 py-3 font-semibold">SAT date</th>
            <th className="text-left  px-4 py-3 font-semibold">Tutor</th>
            <th className="text-right px-4 py-3 font-semibold">Members</th>
            <th className="text-left  px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {cohorts.map((c) => (
            <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{c.name}</td>
              <td className="px-4 py-3">
                <TierBadge tier={c.tier} />
              </td>
              <td className="px-4 py-3 text-slate-300">{formatDate(c.sat_date)}</td>
              <td className="px-4 py-3 text-slate-300">
                {tutorDisplay(c.tutor)}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={cn(
                    "font-mono",
                    c.member_count >= c.max_size ? "text-amber-300" : "text-slate-300"
                  )}
                >
                  {c.member_count}
                </span>
                <span className="text-slate-500 font-mono">/{c.max_size}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TierBadge({ tier }: { tier: CohortTier }) {
  const classes =
    tier === "small_group"
      ? "bg-teal-400/10 text-teal-300 border-teal-400/20"
      : "bg-indigo-400/10 text-indigo-300 border-indigo-400/20";
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-semibold border", classes)}>
      {TIER_LABEL[tier]}
    </span>
  );
}

function StatusBadge({ status }: { status: CohortStatus }) {
  const map: Record<CohortStatus, string> = {
    forming:   "bg-slate-400/10 text-slate-300 border-slate-400/20",
    active:    "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    completed: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  };
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-semibold border", map[status])}>
      {status}
    </span>
  );
}

function EmptyState({
  canCreate,
  missingSatDates,
  missingTutors,
}: {
  canCreate: boolean;
  missingSatDates: boolean;
  missingTutors: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 px-8 py-16 text-center">
      <GraduationCap className="w-8 h-8 mx-auto text-slate-600 mb-3" />
      <h2 className="text-base font-semibold text-white">No cohorts yet</h2>
      {canCreate ? (
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          Click <span className="text-white font-semibold">Create cohort</span> to spin up the first one.
        </p>
      ) : (
        <ul className="mt-3 text-sm text-amber-300 space-y-1">
          {missingSatDates && <li>· No SAT dates seeded — paste the seed SQL first.</li>}
          {missingTutors && <li>· No users with role=&apos;tutor&apos; yet.</li>}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create cohort dialog
// ─────────────────────────────────────────────────────────────

function CreateCohortDialog({
  satDates,
  tutors,
  onClose,
}: {
  satDates: SatDateRow[];
  tutors: TutorRow[];
  onClose: () => void;
}) {
  const [tier, setTier] = useState<CohortTier>("group");
  const [satDate, setSatDate] = useState<string>(satDates[0]?.test_date ?? "");
  const [tutorId, setTutorId] = useState<string>(tutors[0]?.id ?? "");
  const [maxSize, setMaxSize] = useState<number>(TIER_CAP["group"]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [nameOverridden, setNameOverridden] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-generated suggestion: "<Tier> · <SAT date> · <Tutor first name>"
  const suggestedName = useMemo(() => {
    const tutor = tutors.find((t) => t.id === tutorId);
    const tutorName = tutor?.first_name || tutor?.email?.split("@")[0] || "tutor";
    const niceDate = satDate ? formatDate(satDate) : "TBD";
    return `${TIER_LABEL[tier]} · ${niceDate} · ${tutorName}`;
  }, [tier, satDate, tutorId, tutors]);

  // Use the suggestion unless the admin overrode it.
  const effectiveName = nameOverridden ? name : suggestedName;

  function onTierChange(next: CohortTier) {
    setTier(next);
    // Reset max_size to that tier's cap so the value is always sensible
    setMaxSize(TIER_CAP[next]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await actionCreateCohort({
          name: effectiveName,
          tier,
          sat_date: satDate,
          tutor_user_id: tutorId,
          max_size: maxSize,
          current_topic: currentTopic || null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create cohort");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white">Create cohort</h2>
        <p className="text-sm text-slate-400 mt-1">
          One cohort per (tier × SAT date × tutor). Students join via onboarding or admin.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* Tier */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Tier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["group", "small_group"] as CohortTier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTierChange(t)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-semibold transition-colors",
                    tier === t
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                  )}
                >
                  {TIER_LABEL[t]}
                  <span className="ml-1.5 text-xs opacity-70">≤ {TIER_CAP[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SAT date */}
          <Field label="SAT date">
            <select
              value={satDate}
              onChange={(e) => setSatDate(e.target.value)}
              className={selectCls}
              required
            >
              {satDates.map((d) => (
                <option key={d.test_date} value={d.test_date}>
                  {formatDate(d.test_date)}
                  {d.registration_deadline
                    ? ` · reg by ${formatDate(d.registration_deadline)}`
                    : " · reg deadline TBA"}
                </option>
              ))}
            </select>
          </Field>

          {/* Tutor */}
          <Field label="Tutor">
            <select
              value={tutorId}
              onChange={(e) => setTutorId(e.target.value)}
              className={selectCls}
              required
            >
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {tutorDisplay(t)}
                </option>
              ))}
            </select>
          </Field>

          {/* Name */}
          <Field label="Name">
            <input
              type="text"
              value={effectiveName}
              onChange={(e) => {
                setName(e.target.value);
                setNameOverridden(true);
              }}
              className={inputCls}
              required
              maxLength={120}
            />
            {!nameOverridden && (
              <p className="mt-1 text-xs text-slate-500">
                Auto-generated — edit to override.
              </p>
            )}
          </Field>

          {/* Max size */}
          <Field label={`Max size (cap ${TIER_CAP[tier]})`}>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(parseInt(e.target.value, 10) || 0)}
              min={1}
              max={TIER_CAP[tier]}
              className={inputCls}
              required
            />
          </Field>

          {/* Current topic (optional) */}
          <Field label="Current topic (optional)">
            <input
              type="text"
              value={currentTopic}
              onChange={(e) => setCurrentTopic(e.target.value)}
              placeholder="e.g. Linear Functions week"
              className={inputCls}
              maxLength={200}
            />
          </Field>

          {error && (
            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create cohort
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const selectCls =
  "w-full rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500";
const inputCls = selectCls;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function tutorDisplay(t: { first_name: string | null; last_name: string | null; email: string }) {
  const full = [t.first_name, t.last_name].filter(Boolean).join(" ");
  return full || t.email;
}
