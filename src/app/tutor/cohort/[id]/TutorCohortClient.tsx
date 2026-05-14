"use client";

// ============================================================
// TutorCohortClient — tutor's editable view of a cohort.
// Tabs: Members (read-only) | Notes (editable) | Homework (CRUD).
// ============================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, Users as UsersIcon, Plus, Trash2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import type {
  TutorCohortDetail,
  TutorCohortMember,
  TutorHomework,
} from "@/lib/supabase/queries/tutor";
import type { CohortTier, CohortStatus } from "@/lib/supabase/queries/cohorts";
import {
  actionSaveCohortNote,
  actionCreateHomework,
  actionDeleteHomework,
} from "./actions";

type TabKey = "members" | "notes" | "homework";

interface Props {
  detail: TutorCohortDetail;
}

export default function TutorCohortClient({ detail }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("members");
  const { cohort, members, noteBody, homework } = detail;

  return (
    <div>
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <TierBadge tier={cohort.tier} />
          <StatusBadge status={cohort.status} />
          <span className="text-sm text-slate-400">{formatDate(cohort.sat_date)} SAT</span>
          <span className="text-slate-700">·</span>
          <span className="text-sm text-slate-400 font-mono">
            {members.length}/{cohort.max_size} seats
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">{cohort.name}</h1>
        {cohort.current_topic && (
          <p className="mt-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">Current topic —</span> {cohort.current_topic}
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-1 text-sm mb-6">
        <TabButton tab="members"  activeTab={activeTab} onClick={setActiveTab} icon={UsersIcon}    label="Members"  count={members.length} />
        <TabButton tab="notes"    activeTab={activeTab} onClick={setActiveTab} icon={ClipboardList} label="Notes"    count={noteBody ? 1 : 0} />
        <TabButton tab="homework" activeTab={activeTab} onClick={setActiveTab} icon={BookOpen}      label="Homework" count={homework.length} />
      </div>

      {activeTab === "members"  && <MembersTab  members={members} />}
      {activeTab === "notes"    && <NotesTab    cohortId={cohort.id} initialBody={noteBody} />}
      {activeTab === "homework" && <HomeworkTab cohortId={cohort.id} homework={homework} />}
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────

function TabButton({
  tab, activeTab, onClick, icon: Icon, label, count,
}: {
  tab: TabKey; activeTab: TabKey; onClick: (t: TabKey) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string; count: number;
}) {
  const active = activeTab === tab;
  return (
    <button
      onClick={() => onClick(tab)}
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
        <span className={cn("text-xs font-mono", active ? "text-indigo-300" : "text-slate-500")}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Members tab (read-only) ──────────────────────────────

function MembersTab({ members }: { members: TutorCohortMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyBlock
        title="No members yet"
        subtitle="Students will appear here once admin places them in this cohort."
      />
    );
  }
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Email</th>
            <th className="text-left px-4 py-3 font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {members.map((m) => (
            <tr key={m.user_id} className="hover:bg-slate-900/40 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName(m) || m.email} avatarUrl={m.avatar_url} />
                  <span className="text-white font-medium">{fullName(m) || m.email}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{m.email}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(m.joined_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Notes tab (editable notepad) ─────────────────────────

function NotesTab({ cohortId, initialBody }: { cohortId: string; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const dirty = body !== savedBody;

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        await actionSaveCohortNote(cohortId, body);
        setSavedBody(body);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Progress notes — only you and admin see these
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        placeholder="How is the cohort doing? What are you focused on this week?"
        className="w-full rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-y"
      />
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {dirty ? "Unsaved changes" : savedBody ? "Saved" : "Empty"}
        </span>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save notes
        </button>
      </div>
    </div>
  );
}

// ─── Homework tab (CRUD) ─────────────────────────────────

function HomeworkTab({ cohortId, homework }: { cohortId: string; homework: TutorHomework[] }) {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Assignments you post here appear in each student&apos;s cohort page and on the admin view.
        </p>
        {!composerOpen && (
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Post homework
          </button>
        )}
      </div>

      {composerOpen && (
        <HomeworkComposer
          cohortId={cohortId}
          onDone={() => setComposerOpen(false)}
          onCancel={() => setComposerOpen(false)}
        />
      )}

      {homework.length === 0 && !composerOpen ? (
        <EmptyBlock
          title="No homework yet"
          subtitle='Click "Post homework" to assign the cohort their first task.'
        />
      ) : (
        <ul className="space-y-3">
          {homework.map((h) => (
            <HomeworkItem key={h.id} cohortId={cohortId} h={h} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HomeworkComposer({
  cohortId, onDone, onCancel,
}: {
  cohortId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody]   = useState("");
  const [dueAt, setDueAt] = useState("");   // datetime-local value (no TZ)
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        const dueIso = dueAt ? new Date(dueAt).toISOString() : null;
        await actionCreateHomework(cohortId, {
          title,
          body: body || undefined,
          due_at: dueIso,
        });
        router.refresh();
        onDone();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Post new homework</h3>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-200" aria-label="Cancel">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Linear Functions — Practice Set B)"
        required
        maxLength={140}
        className="w-full rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Instructions (optional) — describe the task, link to resources, etc."
        className="w-full rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
      />
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Due date (optional)
        </label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
      {err && <p className="text-xs text-rose-300">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Post
        </button>
      </div>
    </form>
  );
}

function HomeworkItem({ cohortId, h }: { cohortId: string; h: TutorHomework }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const confirm = useConfirm();

  async function deleteMe() {
    const ok = await confirm({
      title: `Delete "${h.title}"?`,
      description: "Students will no longer see this assignment. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setErr(null);
    startTransition(async () => {
      try {
        await actionDeleteHomework(cohortId, h.id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="text-white font-semibold">{h.title}</h3>
        <div className="flex items-center gap-2">
          <DueBadge dueAt={h.due_at} />
          <button
            onClick={deleteMe}
            disabled={pending}
            className="text-slate-500 hover:text-rose-300 disabled:opacity-50"
            aria-label="Delete homework"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {h.body && (
        <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed mb-3">
          {h.body}
        </p>
      )}
      <div className="text-xs text-slate-500">
        Assigned {formatDateTime(h.assigned_at)}
        {h.due_at && <> · Due {formatDateTime(h.due_at)}</>}
      </div>
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
    </li>
  );
}

// ─── Shared pieces ─────────────────────────────────────────

function DueBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  let label: string; let classes: string;
  if (ms < 0)       { label = days <= -1 ? `${Math.abs(days)}d overdue` : "due earlier"; classes = "bg-slate-700/20 text-slate-400 border-slate-600/30"; }
  else if (days <= 1) { label = days === 0 ? "due today" : "due tomorrow"; classes = "bg-rose-400/10 text-rose-300 border-rose-400/20"; }
  else if (days <= 3) { label = `due in ${days}d`; classes = "bg-amber-400/10 text-amber-300 border-amber-400/20"; }
  else               { label = `due in ${days}d`; classes = "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"; }
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-semibold border", classes)}>
      {label}
    </span>
  );
}

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 px-8 py-10 text-center">
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
  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center"
    >
      {initials || "?"}
    </div>
  );
}

function TierBadge({ tier }: { tier: CohortTier }) {
  const classes = tier === "small_group"
    ? "bg-teal-400/10 text-teal-300 border-teal-400/20"
    : "bg-indigo-400/10 text-indigo-300 border-indigo-400/20";
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-semibold border", classes)}>
      {tier === "small_group" ? "Small Group" : "Seminar"}
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

function fullName(p: { first_name: string | null; last_name: string | null }) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
