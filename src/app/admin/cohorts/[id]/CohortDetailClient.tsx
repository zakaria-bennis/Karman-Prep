"use client";

// ============================================================
// CohortDetailClient — header + tabs (Members / Notes / Homework).
// Admin can add/remove members. Notes + homework are read-only
// here (the tutor portal owns their CRUD).
// ============================================================

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, Loader2, Plus, Trash2, Users as UsersIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import type {
  CohortDetail,
  CohortMemberRow,
  EligibleStudentRow,
  HomeworkRow,
  CohortTier,
  CohortStatus,
} from "@/lib/supabase/queries/cohorts";
import { actionAddCohortMember, actionRemoveCohortMember } from "./members-actions";
import { ProvisionChatButton } from "@/components/admin/ProvisionChatButton";

type TabKey = "members" | "notes" | "homework";

interface Props {
  detail: CohortDetail;
  activeTab: TabKey;
  eligibleStudents: EligibleStudentRow[];
  chatProvisioned: boolean;
}

const TIER_LABEL: Record<CohortTier, string> = {
  small_group: "Small Group",
  group: "Seminar",
};

export default function CohortDetailClient({ detail, activeTab, eligibleStudents, chatProvisioned }: Props) {
  const { cohort, members, tutorNote, homework } = detail;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <TierBadge tier={cohort.tier} />
          <StatusBadge status={cohort.status} />
          <span className="text-sm text-slate-400">
            {formatDate(cohort.sat_date)} SAT
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-sm text-slate-400">
            {tutorDisplay(cohort.tutor)}
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-sm text-slate-400 font-mono">
            {cohort.member_count}/{cohort.max_size} seats
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {cohort.name}
        </h1>
        {cohort.current_topic && (
          <p className="mt-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">Current topic —</span>{" "}
            {cohort.current_topic}
          </p>
        )}
        <div className="mt-3">
          <ProvisionChatButton cohortId={cohort.id} alreadyProvisioned={chatProvisioned} />
        </div>
      </header>

      {/* ── Tab nav ────────────────────────────────────────── */}
      <div className="border-b border-slate-800 flex gap-1 text-sm mb-6">
        <TabLink
          cohortId={cohort.id}
          tab="members"
          activeTab={activeTab}
          icon={UsersIcon}
          label="Members"
          count={members.length}
        />
        <TabLink
          cohortId={cohort.id}
          tab="notes"
          activeTab={activeTab}
          icon={ClipboardList}
          label="Notes"
          count={tutorNote ? 1 : 0}
        />
        <TabLink
          cohortId={cohort.id}
          tab="homework"
          activeTab={activeTab}
          icon={BookOpen}
          label="Homework"
          count={homework.length}
        />
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {activeTab === "members"  && (
        <MembersTab
          cohortId={cohort.id}
          members={members}
          seatsOpen={cohort.max_size - members.length}
          cohortTier={cohort.tier}
          eligibleStudents={eligibleStudents}
        />
      )}
      {activeTab === "notes"    && <NotesTab note={tutorNote} tutorName={tutorDisplay(cohort.tutor)} />}
      {activeTab === "homework" && <HomeworkTab homework={homework} />}
    </div>
  );
}

// ─── Tab link ────────────────────────────────────────────────

function TabLink({
  cohortId, tab, activeTab, icon: Icon, label, count,
}: {
  cohortId: string;
  tab: TabKey;
  activeTab: TabKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  const active = activeTab === tab;
  const href = tab === "members"
    ? `/admin/cohorts/${cohortId}`
    : `/admin/cohorts/${cohortId}?tab=${tab}`;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-4 pb-3 font-semibold border-b-2 transition-colors",
        active
          ? "border-indigo-500 text-indigo-400"
          : "border-transparent text-slate-500 hover:text-slate-200"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count > 0 && (
        <span className={cn("text-xs font-mono",
          active ? "text-indigo-300" : "text-slate-500"
        )}>
          {count}
        </span>
      )}
    </Link>
  );
}

// ─── Members tab ─────────────────────────────────────────────

function MembersTab({
  cohortId, members, seatsOpen, cohortTier, eligibleStudents,
}: {
  cohortId: string;
  members: CohortMemberRow[];
  seatsOpen: number;
  cohortTier: CohortTier;
  eligibleStudents: EligibleStudentRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const fullCapacity = seatsOpen <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {seatsOpen > 0
            ? <>{seatsOpen} open seat{seatsOpen === 1 ? "" : "s"}.</>
            : <>Cohort is at capacity.</>}
        </p>
        <button
          onClick={() => setAdding(true)}
          disabled={fullCapacity || eligibleStudents.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            fullCapacity ? "Cohort is at capacity"
            : eligibleStudents.length === 0 ? "No eligible students available"
            : undefined
          }
        >
          <Plus className="w-4 h-4" />
          Add member
        </button>
      </div>

      {members.length === 0 ? (
        <EmptyBlock
          title="No members yet"
          subtitle="Click Add member to place a student in this cohort."
        />
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
                <th aria-hidden="true" className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {members.map((m) => (
                <MemberRow
                  key={m.user_id}
                  cohortId={cohortId}
                  member={m}
                  onError={setRowError}
                />
              ))}
            </tbody>
          </table>
          {rowError && (
            <div className="px-4 py-2 text-xs text-rose-300 bg-rose-500/5 border-t border-slate-800">
              {rowError}
            </div>
          )}
        </div>
      )}

      {adding && (
        <AddMemberDialog
          cohortId={cohortId}
          cohortTier={cohortTier}
          eligibleStudents={eligibleStudents}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function MemberRow({
  cohortId, member, onError,
}: {
  cohortId: string;
  member: CohortMemberRow;
  onError: (msg: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  async function remove() {
    const name = studentDisplay(member);
    const ok = await confirm({
      title: `Remove ${name}?`,
      description:
        "This ends their cohort membership. Quiz history and node mastery stay with the student — they can be added to another cohort right away.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    onError(null);
    startTransition(async () => {
      try {
        await actionRemoveCohortMember(cohortId, member.user_id);
        router.refresh(); // pull fresh server data so the row disappears
      } catch (e) {
        onError(e instanceof Error ? e.message : "Failed to remove member");
      }
    });
  }

  return (
    <tr className="hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={studentDisplay(member)} avatarUrl={member.avatar_url} />
          <span className="text-white font-medium">{studentDisplay(member)}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{member.email}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(member.joined_at)}</td>
      <td className="px-2 py-3">
        <button
          onClick={remove}
          disabled={pending}
          className="text-slate-500 hover:text-rose-300 disabled:opacity-50"
          aria-label={`Remove ${studentDisplay(member)} from cohort`}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </td>
    </tr>
  );
}

function AddMemberDialog({
  cohortId, cohortTier, eligibleStudents, onClose,
}: {
  cohortId: string;
  cohortTier: CohortTier;
  eligibleStudents: EligibleStudentRow[];
  onClose: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Sort: students with matching sub tier first (clearest candidates),
  // then everyone else (admin override).
  const sorted = useMemo(() => {
    const matching = eligibleStudents.filter((s) => s.subscription_tier === cohortTier);
    const other    = eligibleStudents.filter((s) => s.subscription_tier !== cohortTier);
    return [...matching, ...other];
  }, [eligibleStudents, cohortTier]);

  const selected = sorted.find((s) => s.id === studentId) ?? null;
  const tierMismatch = selected && selected.subscription_tier !== cohortTier;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await actionAddCohortMember(cohortId, studentId);
        router.refresh();
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to add member");
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
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white">Add member</h2>
        <p className="text-sm text-slate-400 mt-1">
          Only students not currently in another active cohort are shown.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Student
            </span>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">Select a student…</option>
              {sorted.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                const tierBit = s.subscription_tier ? ` · ${s.subscription_tier}` : " · no active sub";
                return (
                  <option key={s.id} value={s.id}>
                    {name}{tierBit}
                  </option>
                );
              })}
            </select>
          </label>

          {tierMismatch && (
            <p className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              Heads up — this student&apos;s subscription tier is{" "}
              <span className="font-semibold">{selected?.subscription_tier ?? "none"}</span>, not{" "}
              <span className="font-semibold">{cohortTier}</span>. You can still place them (admin override),
              but their billing won&apos;t match the cohort.
            </p>
          )}

          {err && (
            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">
              {err}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!studentId || pending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to cohort
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Notes tab ───────────────────────────────────────────────

function NotesTab({ note, tutorName }: { note: string | null; tutorName: string }) {
  if (!note) {
    return (
      <EmptyBlock
        title="No notes yet"
        subtitle={`${tutorName} hasn't written any progress notes for this cohort. Notes are authored in the tutor portal.`}
      />
    );
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Notes by {tutorName}
      </div>
      <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
        {note}
      </div>
    </div>
  );
}

// ─── Homework tab ────────────────────────────────────────────

function HomeworkTab({ homework }: { homework: HomeworkRow[] }) {
  if (homework.length === 0) {
    return (
      <EmptyBlock
        title="No homework posted yet"
        subtitle="Assignments the tutor posts from the tutor portal will appear here."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {homework.map((h) => (
        <li
          key={h.id}
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-white font-semibold">{h.title}</h3>
            <DueBadge dueAt={h.due_at} />
          </div>
          {h.body && (
            <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed mb-3">
              {h.body}
            </p>
          )}
          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
            <span>Assigned {formatDateTime(h.assigned_at)}</span>
            {h.due_at && <span>· Due {formatDateTime(h.due_at)}</span>}
            <span>· by {tutorDisplay(h.created_by)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DueBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));

  let label: string;
  let classes: string;
  if (ms < 0) {
    label = days <= -1 ? `${Math.abs(days)}d overdue` : "due earlier";
    classes = "bg-slate-700/20 text-slate-400 border-slate-600/30";
  } else if (days <= 1) {
    label = days === 0 ? "due today" : "due tomorrow";
    classes = "bg-rose-400/10 text-rose-300 border-rose-400/20";
  } else if (days <= 3) {
    label = `due in ${days}d`;
    classes = "bg-amber-400/10 text-amber-300 border-amber-400/20";
  } else {
    label = `due in ${days}d`;
    classes = "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
  }
  return (
    <span
      className={cn(
        "shrink-0 inline-block px-2 py-0.5 rounded-md text-xs font-semibold border",
        classes
      )}
    >
      {label}
    </span>
  );
}

// ─── Shared helpers ──────────────────────────────────────────

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 px-8 py-12 text-center">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">{subtitle}</p>
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover border border-slate-700" />;
  }
  // Initials fallback
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center"
      aria-hidden="true"
    >
      {initials || "?"}
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

function studentDisplay(s: { first_name: string | null; last_name: string | null; email: string }) {
  const full = [s.first_name, s.last_name].filter(Boolean).join(" ");
  return full || s.email;
}

function tutorDisplay(t: { first_name: string | null; last_name: string | null; email: string }) {
  const full = [t.first_name, t.last_name].filter(Boolean).join(" ");
  return full || t.email;
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

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
