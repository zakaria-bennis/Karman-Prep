"use client";

// ============================================================
// CohortsClient — the interactive slice of /admin/cohorts.
// Table of existing cohorts + a "Create cohort" dialog.
// ============================================================

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  GraduationCap,
  X,
  Loader2,
  Filter,
  ChevronRight,
  Archive,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { actionCreateCohort, actionUnarchiveCohort } from "./actions";
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
  /** When true, the list also includes auto-archived cohorts (audit #13).
   *  Driven by `?show=archived` on the URL. */
  showArchived?: boolean;
}

export default function CohortsClient({ cohorts, satDates, tutors, showArchived }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tutorFilter, setTutorFilter] = useState<string>(""); // "" = all tutors

  // Filter cohorts by the selected tutor (empty string = show everyone).
  const visibleCohorts = useMemo(() => {
    if (!tutorFilter) return cohorts;
    return cohorts.filter((c) => c.tutor.id === tutorFilter);
  }, [cohorts, tutorFilter]);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ivory">Cohorts</h1>
          <p className="mt-1 text-sm text-taupe">
            Seminar (≤ 200 students) and small group (≤ 5) cohorts, grouped by SAT date.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          disabled={satDates.length === 0 || tutors.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
          title={
            satDates.length === 0
              ? "No upcoming SAT dates in the database yet"
              : tutors.length === 0
                ? "No users with role='tutor' yet"
                : undefined
          }
        >
          <Plus className="h-4 w-4" />
          Create cohort
        </button>
      </header>

      {/* Filter bar — only show once we actually have cohorts to filter through */}
      {cohorts.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-taupe">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </div>
          <select
            aria-label="Filter cohorts by tutor"
            value={tutorFilter}
            onChange={(e) => setTutorFilter(e.target.value)}
            className="rounded-lg border border-bronze bg-night/60 px-3 py-1.5 text-sm text-ivory focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="">All tutors ({cohorts.length})</option>
            {tutors.map((t) => {
              const n = cohorts.filter((c) => c.tutor.id === t.id).length;
              return (
                <option key={t.id} value={t.id}>
                  {tutorDisplay(t)} ({n})
                </option>
              );
            })}
          </select>
          {tutorFilter && visibleCohorts.length === 0 && (
            <span className="text-xs text-taupe">No cohorts for this tutor.</span>
          )}
          {/* Toggle between active-only and include-archived views.
              Drives `?show=archived` on the URL (audit #13). */}
          <Link
            href={showArchived ? "/admin/cohorts" : "/admin/cohorts?show=archived"}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-taupe hover:text-ivory"
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
        </div>
      )}

      {cohorts.length === 0 ? (
        <EmptyState
          canCreate={satDates.length > 0 && tutors.length > 0}
          missingSatDates={satDates.length === 0}
          missingTutors={tutors.length === 0}
        />
      ) : (
        <CohortTable cohorts={visibleCohorts} />
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
    <>
      {/* Mobile (<md): stacked cards. Whole card is clickable
          to the detail page; the inline UnarchiveButton stops
          propagation so it can be tapped independently.
          Audit S1 (Phase 2 — cohorts mirror). */}
      <ul className="space-y-2 md:hidden" aria-label="Cohorts (mobile view)">
        {cohorts.map((c) => (
          <li key={c.id}>
            <CohortCard cohort={c} />
          </li>
        ))}
      </ul>

      {/* Desktop (md+): full table. Status column hides at <lg
          since it's secondary; SAT date + Tutor + Members stay. */}
      <div className="hidden overflow-hidden rounded-xl border border-bronze md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-xs uppercase tracking-wider text-taupe">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Tier</th>
              <th className="px-4 py-3 text-left font-semibold">SAT date</th>
              <th className="px-4 py-3 text-left font-semibold">Tutor</th>
              <th className="px-4 py-3 text-right font-semibold">Members</th>
              <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Status</th>
              <th aria-hidden="true" className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bronze">
            {cohorts.map((c) => (
              <CohortRow key={c.id} cohort={c} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Mobile card layout (audit S1 Phase 2 — cohorts) ─────────

function CohortCard({ cohort: c }: { cohort: AdminCohortRow }) {
  const router = useRouter();
  return (
    <article
      onClick={() => router.push(`/admin/cohorts/${c.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/admin/cohorts/${c.id}`);
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open ${c.name}`}
      className="cursor-pointer rounded-xl border border-bronze bg-night/40 p-4 transition-colors hover:bg-surface/40 focus:bg-surface/60 focus:outline-none"
    >
      {/* Identity + status badges row */}
      <div className="mb-2 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn("text-base font-medium", c.archived_at ? "text-taupe" : "text-ivory")}>
            {c.name}
          </div>
        </div>
        {c.archived_at ? (
          <span className="shrink-0 rounded-md bg-surface-raised/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ivory">
            Archived
          </span>
        ) : null}
        {c.setup_completed_at === null &&
        !c.archived_at &&
        (c.tier === "group" || c.tier === "small_group") ? (
          <span className="shrink-0 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-bright">
            Needs setup
          </span>
        ) : null}
      </div>

      {/* Tier + Members + Status — wraps on narrow screens */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TierBadge tier={c.tier} />
        <StatusBadge status={c.status} />
        <span className="ml-auto text-sm">
          <span
            className={cn(
              "font-mono",
              c.member_count >= c.max_size ? "text-warning-bright" : "text-ivory"
            )}
          >
            {c.member_count}
          </span>
          <span className="font-mono text-taupe">/{c.max_size}</span>
          <span className="ml-1 text-xs text-taupe">members</span>
        </span>
      </div>

      {/* SAT date + Tutor (muted) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-taupe">
        <span>SAT {formatDate(c.sat_date)}</span>
        <span className="truncate">{tutorDisplay(c.tutor)}</span>
      </div>

      {/* Bottom-right: unarchive (if applicable) or open arrow */}
      {c.archived_at ? (
        <div className="mt-3 flex justify-end">
          <UnarchiveButton cohortId={c.id} />
        </div>
      ) : null}
    </article>
  );
}

// ─── Desktop table row ──────────────────────────────────────

function CohortRow({ cohort: c }: { cohort: AdminCohortRow }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/admin/cohorts/${c.id}`)}
      className="cursor-pointer transition-colors hover:bg-surface/40 focus:bg-surface/60 focus:outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/admin/cohorts/${c.id}`);
      }}
      role="link"
      aria-label={`Open ${c.name}`}
    >
      <td className="px-4 py-3 font-medium text-ivory">
        <div className="flex items-center gap-2">
          <span className={c.archived_at ? "text-taupe" : undefined}>{c.name}</span>
          {c.archived_at ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-surface-raised/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ivory">
              Archived
            </span>
          ) : null}
          {c.setup_completed_at === null &&
          !c.archived_at &&
          (c.tier === "group" || c.tier === "small_group") ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-bright">
              Needs setup
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <TierBadge tier={c.tier} />
      </td>
      <td className="px-4 py-3 text-ivory">{formatDate(c.sat_date)}</td>
      <td className="px-4 py-3 text-ivory">{tutorDisplay(c.tutor)}</td>
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            "font-mono",
            c.member_count >= c.max_size ? "text-warning-bright" : "text-ivory"
          )}
        >
          {c.member_count}
        </span>
        <span className="font-mono text-taupe">/{c.max_size}</span>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <StatusBadge status={c.status} />
      </td>
      <td className="px-2 py-3 text-taupe">
        {c.archived_at ? <UnarchiveButton cohortId={c.id} /> : <ChevronRight className="h-4 w-4" />}
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────────
// Inline unarchive button — manually restores a previously-archived
// cohort. Stops click propagation so the row's "open detail" handler
// doesn't fire. Audit #13.
// ────────────────────────────────────────────────────────────────
function UnarchiveButton({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      try {
        await actionUnarchiveCohort(cohortId);
        router.refresh();
      } catch (err) {
        console.error("[admin/cohorts] unarchive failed:", err);
      }
    });
  }
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded border border-bronze px-2 py-0.5 text-[10px] font-semibold text-ivory hover:border-success/40 hover:text-success-bright disabled:opacity-50"
      title="Restore this cohort to active dashboards"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
      Unarchive
    </button>
  );
}

function TierBadge({ tier }: { tier: CohortTier }) {
  const classes =
    tier === "small_group"
      ? "bg-success/10 text-success-bright border-success/20"
      : "bg-gold/10 text-gold-bright border-gold/20";
  return (
    <span
      className={cn("inline-block rounded-md border px-2 py-0.5 text-xs font-semibold", classes)}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

function StatusBadge({ status }: { status: CohortStatus }) {
  const map: Record<CohortStatus, string> = {
    forming: "bg-surface-raised/10 text-ivory border-bronze/20",
    active: "bg-success/10 text-success-bright border-success/20",
    completed: "bg-surface-raised/20 text-taupe border-bronze/30",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-md border px-2 py-0.5 text-xs font-semibold",
        map[status]
      )}
    >
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
    <div className="rounded-xl border border-dashed border-bronze px-8 py-16 text-center">
      <GraduationCap className="mx-auto mb-3 h-8 w-8 text-taupe" />
      <h2 className="text-base font-semibold text-ivory">No cohorts yet</h2>
      {canCreate ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-taupe">
          Click <span className="font-semibold text-ivory">Create cohort</span> to spin up the first
          one.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm text-warning-bright">
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-night/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-bronze bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-taupe hover:text-ivory"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-ivory">Create cohort</h2>
        <p className="mt-1 text-sm text-taupe">
          One cohort per (tier × SAT date × tutor). Students join via onboarding or admin.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* Tier */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-taupe">
              Tier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["group", "small_group"] as CohortTier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTierChange(t)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                    tier === t
                      ? "border-gold/40 bg-gold text-night"
                      : "border-bronze bg-night/40 text-ivory hover:bg-surface-raised"
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
              <p className="mt-1 text-xs text-taupe">Auto-generated — edit to override.</p>
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
            <p className="rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error-bright">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-bronze px-4 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-surface-raised disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night transition-colors hover:bg-gold-bright disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
  "w-full rounded-lg bg-night/60 border border-bronze text-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40";
const inputCls = selectCls;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-taupe">
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
