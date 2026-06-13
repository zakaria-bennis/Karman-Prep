"use client";

// ============================================================
// TutorCohortClient — tutor's editable view of a cohort.
// Tabs: Members (read-only) | Notes (editable) | Homework (CRUD).
// ============================================================

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  Users as UsersIcon,
  Plus,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import type {
  TutorCohortDetail,
  TutorCohortMember,
  TutorHomework,
} from "@/lib/supabase/queries/tutor";
import type { CohortTier, CohortStatus } from "@/lib/supabase/queries/cohorts";
import { actionSaveCohortNote, actionCreateHomework, actionDeleteHomework } from "./actions";

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
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <TierBadge tier={cohort.tier} />
          <StatusBadge status={cohort.status} />
          <span className="text-sm text-taupe">{formatDate(cohort.sat_date)} SAT</span>
          <span className="text-taupe">·</span>
          <span className="font-mono text-sm text-taupe">
            {members.length}/{cohort.max_size} seats
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ivory">{cohort.name}</h1>
        {cohort.current_topic && (
          <p className="mt-2 text-sm text-taupe">
            <span className="font-semibold text-ivory">Current topic —</span> {cohort.current_topic}
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-bronze text-sm">
        <TabButton
          tab="members"
          activeTab={activeTab}
          onClick={setActiveTab}
          icon={UsersIcon}
          label="Members"
          count={members.length}
        />
        <TabButton
          tab="notes"
          activeTab={activeTab}
          onClick={setActiveTab}
          icon={ClipboardList}
          label="Notes"
          count={noteBody ? 1 : 0}
        />
        <TabButton
          tab="homework"
          activeTab={activeTab}
          onClick={setActiveTab}
          icon={BookOpen}
          label="Homework"
          count={homework.length}
        />
      </div>

      {activeTab === "members" && <MembersTab members={members} />}
      {activeTab === "notes" && <NotesTab cohortId={cohort.id} initialBody={noteBody} />}
      {activeTab === "homework" && <HomeworkTab cohortId={cohort.id} homework={homework} />}
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────

function TabButton({
  tab,
  activeTab,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  tab: TabKey;
  activeTab: TabKey;
  onClick: (t: TabKey) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  const active = activeTab === tab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={cn(
        "inline-flex items-center gap-2 border-b-2 px-4 pb-3 font-semibold transition-colors",
        active ? "border-gold/40 text-gold" : "border-transparent text-taupe hover:text-ivory"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className={cn("font-mono text-xs", active ? "text-gold-bright" : "text-taupe")}>
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
    <div className="overflow-hidden rounded-xl border border-bronze">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-xs uppercase tracking-wider text-taupe">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Name</th>
            <th className="px-4 py-3 text-left font-semibold">Email</th>
            <th className="px-4 py-3 text-left font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bronze">
          {members.map((m) => (
            <tr key={m.user_id} className="transition-colors hover:bg-surface/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName(m) || m.email} avatarUrl={m.avatar_url} />
                  <span className="font-medium text-ivory">{fullName(m) || m.email}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-taupe">{m.email}</td>
              <td className="px-4 py-3 text-xs text-taupe">{formatDateTime(m.joined_at)}</td>
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
    <div className="rounded-xl border border-bronze bg-surface/40 p-5">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-taupe">
        Progress notes — only you and admin see these
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        placeholder="How is the cohort doing? What are you focused on this week?"
        className="w-full resize-y rounded-lg border border-bronze bg-night/60 px-3 py-2 text-sm text-ivory focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
      {err && <p className="mt-2 text-xs text-error-bright">{err}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-taupe">
          {dirty ? "Unsaved changes" : savedBody ? "Saved" : "Empty"}
        </span>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
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
        <p className="text-sm text-taupe">
          Assignments you post here appear in each student&apos;s cohort page and on the admin view.
        </p>
        {!composerOpen && (
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-night hover:bg-gold-bright"
          >
            <Plus className="h-4 w-4" />
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
  cohortId,
  onDone,
  onCancel,
}: {
  cohortId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState(""); // datetime-local value (no TZ)
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
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-bronze bg-surface/40 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ivory">Post new homework</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-taupe hover:text-ivory"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Linear Functions — Practice Set B)"
        required
        maxLength={140}
        className="w-full rounded-lg border border-bronze bg-night/60 px-3 py-2 text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Instructions (optional) — describe the task, link to resources, etc."
        className="w-full resize-y rounded-lg border border-bronze bg-night/60 px-3 py-2 text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-taupe">
          Due date (optional)
        </label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-lg border border-bronze bg-night/60 px-3 py-2 text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>
      {err && <p className="text-xs text-error-bright">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-bronze px-3 py-1.5 text-sm text-ivory hover:bg-surface-raised"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-night hover:bg-gold-bright disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
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
    <li className="rounded-xl border border-bronze bg-surface/40 p-5">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="font-semibold text-ivory">{h.title}</h3>
        <div className="flex items-center gap-2">
          <DueBadge dueAt={h.due_at} />
          <button
            onClick={deleteMe}
            disabled={pending}
            className="text-taupe hover:text-error-bright disabled:opacity-50"
            aria-label="Delete homework"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {h.body && (
        <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-taupe">{h.body}</p>
      )}
      <div className="text-xs text-taupe">
        Assigned {formatDateTime(h.assigned_at)}
        {h.due_at && <> · Due {formatDateTime(h.due_at)}</>}
      </div>
      {err && <p className="mt-2 text-xs text-error-bright">{err}</p>}
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
  let label: string;
  let classes: string;
  if (ms < 0) {
    label = days <= -1 ? `${Math.abs(days)}d overdue` : "due earlier";
    classes = "bg-surface-raised/20 text-taupe border-bronze/30";
  } else if (days <= 1) {
    label = days === 0 ? "due today" : "due tomorrow";
    classes = "bg-error/10 text-error-bright border-error/20";
  } else if (days <= 3) {
    label = `due in ${days}d`;
    classes = "bg-warning/10 text-warning-bright border-warning/20";
  } else {
    label = `due in ${days}d`;
    classes = "bg-success/10 text-success-bright border-success/20";
  }
  return (
    <span
      className={cn("inline-block rounded-md border px-2 py-0.5 text-xs font-semibold", classes)}
    >
      {label}
    </span>
  );
}

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-bronze px-8 py-10 text-center">
      <h3 className="text-base font-semibold text-ivory">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-taupe">{subtitle}</p>
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full border border-bronze object-cover"
        unoptimized
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-bronze bg-surface-raised text-xs font-semibold text-ivory"
    >
      {initials || "?"}
    </div>
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
      {tier === "small_group" ? "Small Group" : "Seminar"}
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

function fullName(p: { first_name: string | null; last_name: string | null }) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
