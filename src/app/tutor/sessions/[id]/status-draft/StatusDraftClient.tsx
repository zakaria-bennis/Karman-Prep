"use client";

// ============================================================
// StatusDraftClient — the editable form + live preview pane
// for the session recap draft.
//
// State machine the page handles:
//   1. recap already sent → read-only summary, link to log
//   2. transcript missing → manual-paste form (calls
//      actionSetManualTranscript which generates a draft)
//   3. transcript present, draft generation failed → show
//      error + empty editable fields
//   4. transcript + valid draft → editable form (default
//      read-only with "Edit" toggle)
//
// The Send button is wired but stubbed in Phase 4; Phase 5
// implements actual delivery.
// ============================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Save,
  Edit3,
  RefreshCw,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users as UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusDraft } from "@/lib/integrations/openai/generate-status-draft";
import {
  actionSaveDraft,
  actionRegenerateDraft,
  actionSetManualTranscript,
  actionSendRecap,
} from "./actions";

export interface StatusDraftPageData {
  bookingId: string;
  callerIsAdmin: boolean;
  studentName: string;
  studentEmail: string | null;
  parents: Array<{ id: string; name: string; email: string }>;
  cohortName: string | null;
  sessionDateIso: string;
  durationMinutes: number;
  planTier: string;
  tutorName: string;
  tutorSignatureOverride: string | null;
  hasTranscript: boolean;
  transcriptSource: string | null;
  draft: StatusDraft | null;
  draftError: string | null;
  draftCreatedAt: string | null;
  draftEditedAt: string | null;
  recapSent: boolean;
  recapSentAt: string | null;
}

type Field = keyof StatusDraft;

const FIELDS: Array<{ key: Field; label: string }> = [
  { key: "date_and_time_of_session", label: "Date and Time of Session" },
  { key: "student_performance_progress", label: "Student Performance/Progress" },
  { key: "subjects_covered_during_session", label: "Subjects Covered During the Session" },
  { key: "specific_weak_points_or_mistakes", label: "Specific Weak Points or Mistakes to Review" },
  { key: "next_steps_homework_assigned", label: "Next Steps Homework Assigned" },
  { key: "subjects_to_cover_next_session", label: "Subjects to Cover Next Session" },
  {
    key: "homework_practice_before_next_session",
    label: "Homework/Practice to Complete Before Next Session",
  },
  { key: "date_and_time_of_next_session", label: "Date and Time of Next Session" },
];

const EMPTY_DRAFT: StatusDraft = Object.fromEntries(
  FIELDS.map((f) => [f.key, ""])
) as unknown as StatusDraft;

export default function StatusDraftClient({ data }: { data: StatusDraftPageData }) {
  const router = useRouter();
  const [draft, setDraft] = useState<StatusDraft>(data.draft ?? EMPTY_DRAFT);
  const [editMode, setEditMode] = useState(!data.draft && !data.recapSent);
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [recipientIds, setRecipientIds] = useState<Set<string>>(() => {
    // Default: every parent + the student (if email exists) is checked.
    const ids = new Set<string>();
    if (data.studentEmail) ids.add(`student:${data.bookingId}`);
    for (const p of data.parents) ids.add(`parent:${p.id}`);
    return ids;
  });
  const [savedAt, setSavedAt] = useState<string | null>(data.draftEditedAt);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allRecipients = useMemo(() => {
    const list: Array<{ id: string; label: string; email: string; type: "student" | "parent" }> =
      [];
    if (data.studentEmail) {
      list.push({
        id: `student:${data.bookingId}`,
        label: data.studentName,
        email: data.studentEmail,
        type: "student",
      });
    }
    for (const p of data.parents) {
      list.push({
        id: `parent:${p.id}`,
        label: p.name,
        email: p.email,
        type: "parent",
      });
    }
    return list;
  }, [data.bookingId, data.studentName, data.studentEmail, data.parents]);

  const allFieldsFilled = FIELDS.every((f) => draft[f.key]?.trim().length);
  const sessionDateLabel = formatSessionDate(data.sessionDateIso);
  const signature = data.tutorSignatureOverride?.trim() || `Best regards,\n${data.tutorName}`;
  const subject = `Session recap — ${data.studentName} — ${shortDate(data.sessionDateIso)}`;
  // Group sessions are now supported too — this gate stays at app
  // layer = always true. Kept variable name to minimize diff churn.
  const isOneOnOne = true;
  void data.planTier;

  function updateField(field: Field, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function toggleRecipient(id: string) {
    setRecipientIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Action handlers ────────────────────────────────────
  async function handleSaveDraft() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await actionSaveDraft(data.bookingId, draft);
        setSavedAt(res.savedAt);
        setEditMode(false);
      } catch (err) {
        setError(humanizeError(err));
      }
    });
  }

  async function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await actionRegenerateDraft(data.bookingId);
        setDraft(res.draft);
        setSavedAt(null);
        setEditMode(false);
        router.refresh();
      } catch (err) {
        setError(humanizeError(err));
      }
    });
  }

  async function handleManualTranscript() {
    setError(null);
    if (!pendingTranscript.trim()) {
      setError("Paste the transcript first.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await actionSetManualTranscript(data.bookingId, pendingTranscript);
        if (res.draft) {
          setDraft(res.draft);
          setEditMode(false);
        } else {
          setError(
            `Transcript saved, but draft generation failed: ${res.draftError}. Write the draft manually below.`
          );
          setEditMode(true);
        }
        setPendingTranscript("");
        router.refresh();
      } catch (err) {
        setError(humanizeError(err));
      }
    });
  }

  async function handleSend() {
    setError(null);
    const recipientUserIds = [...recipientIds];
    startTransition(async () => {
      try {
        await actionSendRecap(data.bookingId, draft, recipientUserIds);
        router.push("/tutor/schedule");
      } catch (err) {
        setError(humanizeError(err));
      }
    });
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────

  // STATE 1: already sent — show read-only summary
  if (data.recapSent) {
    return <RecapAlreadySent data={data} draft={draft} signature={signature} subject={subject} />;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <header>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
          Session Recap Draft
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{data.studentName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span>{sessionDateLabel}</span>
          <span className="text-slate-700">·</span>
          <span>{data.durationMinutes} min</span>
          <span className="text-slate-700">·</span>
          <PlanTierPill tier={data.planTier} />
          <span className="text-slate-700">·</span>
          <DraftStatusPill data={data} />
        </div>
      </header>

      {/* Group/Seminar gate — Phase 4 ships 1:1 only */}
      {!isOneOnOne && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Group session — auto-recap deferred.</strong> v1 ships recaps for{" "}
            <code className="text-amber-100">private</code> and{" "}
            <code className="text-amber-100">elite</code> tier sessions only. Group + small group
            recaps are tracked for v2.
          </div>
        </div>
      )}

      {/* ── No transcript yet — manual paste form ──────── */}
      {!data.hasTranscript && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-white">No transcript yet</h2>
          </div>
          <p className="mb-3 text-sm text-slate-400">
            If Fireflies has a transcript for this session, the draft will appear here
            automatically. Otherwise, paste the transcript below and we&apos;ll generate the draft.
          </p>
          <textarea
            value={pendingTranscript}
            onChange={(e) => setPendingTranscript(e.target.value)}
            placeholder={`Paste transcript here. Format like:\n\nZakaria: Today we covered linear equations…\nMaya: I'm still confused about negative coefficients.\n…`}
            rows={8}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm leading-relaxed text-slate-100 focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleManualTranscript}
              disabled={isPending || !pendingTranscript.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Save transcript &amp; generate draft
            </button>
          </div>
        </section>
      )}

      {/* ── Draft generation failed ─────────────────────── */}
      {data.draftError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Draft generation failed.</strong> The transcript is saved. You can write the
            recap manually in the form below or regenerate.
            <div className="mt-1 font-mono text-xs text-rose-300/80">{data.draftError}</div>
          </div>
        </div>
      )}

      {/* ── Action error ────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* ── Edit form + Preview (split 7/5 on desktop) ─── */}
      {(data.hasTranscript || data.draft || data.draftError) && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT — editable fields */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-bold text-white">Edit draft</h2>
                {savedAt && (
                  <span className="text-xs text-slate-500">· saved {timeSince(savedAt)} ago</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save draft
                  </button>
                )}
                {data.hasTranscript && (
                  <button
                    onClick={handleRegenerate}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                    title="Re-run OpenAI on the stored transcript"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {f.label}
                  </label>
                  <textarea
                    value={draft[f.key] || ""}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    readOnly={!editMode}
                    rows={
                      f.key === "student_performance_progress" ||
                      f.key === "subjects_covered_during_session"
                        ? 4
                        : 2
                    }
                    className={cn(
                      "w-full resize-y rounded-md border px-3 py-2 text-sm leading-relaxed",
                      editMode
                        ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-blue-500 focus:outline-none"
                        : "cursor-default border-slate-800 bg-slate-900 text-slate-200"
                    )}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT — preview */}
          <aside className="lg:col-span-5">
            <div className="sticky top-6 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">Preview — what the parent sees</h2>
              </div>
              <RecapPreview
                draft={draft}
                signature={signature}
                subject={subject}
                fromName={data.tutorName}
              />
            </div>
          </aside>
        </div>
      )}

      {/* ── Recipients ──────────────────────────────────── */}
      {(data.hasTranscript || data.draft) && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-white">Recipients</h2>
          </div>
          {allRecipients.length === 0 ? (
            <p className="text-sm text-slate-500">
              No email addresses on file for this student or any linked parents. Add a parent
              linkage in <code>parent_student_links</code> or update the student email before
              sending.
            </p>
          ) : (
            <ul className="space-y-2">
              {allRecipients.map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={recipientIds.has(r.id)}
                    onChange={() => toggleRecipient(r.id)}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      r.type === "student"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-purple-500/20 text-purple-300"
                    )}
                  >
                    {r.type}
                  </span>
                  <span className="font-medium text-slate-200">{r.label}</span>
                  <span className="text-slate-500">{r.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Send button ─────────────────────────────────── */}
      {(data.hasTranscript || data.draft) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {!allFieldsFilled
              ? `Fill in all ${FIELDS.length} fields to enable sending.`
              : recipientIds.size === 0
                ? "Pick at least one recipient."
                : !isOneOnOne
                  ? "Group session recaps deferred to v2."
                  : "Ready to send."}
          </p>
          <button
            onClick={handleSend}
            disabled={isPending || !allFieldsFilled || recipientIds.size === 0 || !isOneOnOne}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send recap &amp; mark for payout
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Preview component — renders draft as the parent will see it
// ──────────────────────────────────────────────────────────
function RecapPreview({
  draft,
  signature,
  subject,
  fromName,
}: {
  draft: StatusDraft;
  signature: string;
  subject: string;
  fromName: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 px-4 py-3 text-xs">
        <div className="text-slate-500">From</div>
        <div className="text-slate-200">{fromName} &lt;noreply@karmanprep.com&gt;</div>
        <div className="mt-1.5 text-slate-500">Subject</div>
        <div className="font-semibold text-slate-200">{subject}</div>
      </header>
      <div className="space-y-3 px-4 py-4 font-serif text-sm leading-relaxed text-slate-200">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="font-sans font-semibold not-italic text-slate-300">{f.label}:</div>
            <div className="mt-0.5 whitespace-pre-wrap">
              {draft[f.key]?.trim() || <span className="italic text-slate-600">— empty —</span>}
            </div>
          </div>
        ))}
        <div className="mt-3 whitespace-pre-wrap border-t border-slate-800 pt-3 text-slate-300">
          {signature}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Read-only state for already-sent recaps
// ──────────────────────────────────────────────────────────
function RecapAlreadySent({
  data,
  draft,
  signature,
  subject,
}: {
  data: StatusDraftPageData;
  draft: StatusDraft;
  signature: string;
  subject: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Recap sent
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{data.studentName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Sent {data.recapSentAt ? new Date(data.recapSentAt).toLocaleString() : "—"}</span>
        </div>
      </header>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <p className="text-sm text-emerald-200">
          This recap has already been sent. The fields below are read-only.
        </p>
      </div>
      <RecapPreview
        draft={draft}
        signature={signature}
        subject={subject}
        fromName={data.tutorName}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Small badges
// ──────────────────────────────────────────────────────────
function PlanTierPill({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    private: "bg-amber-500/20 text-amber-300",
    elite: "bg-violet-500/20 text-violet-300",
    small_group: "bg-teal-500/20 text-teal-300",
    group: "bg-indigo-500/20 text-indigo-300",
  };
  const label =
    (
      {
        private: "Private",
        elite: "Elite",
        small_group: "Small Group",
        group: "Seminar",
      } as Record<string, string>
    )[tier] ?? tier;
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[tier] ?? "bg-slate-800 text-slate-300"
      )}
    >
      {label}
    </span>
  );
}

function DraftStatusPill({ data }: { data: StatusDraftPageData }) {
  if (data.recapSent) {
    return <Pill color="emerald">Sent</Pill>;
  }
  if (!data.hasTranscript) {
    return <Pill color="slate">No transcript</Pill>;
  }
  if (data.draftError) {
    return <Pill color="rose">Draft failed</Pill>;
  }
  if (data.draft) {
    return <Pill color="blue">Draft ready</Pill>;
  }
  return <Pill color="amber">Drafting…</Pill>;
}

function Pill({
  color,
  children,
}: {
  color: "emerald" | "slate" | "rose" | "blue" | "amber";
  children: React.ReactNode;
}) {
  const map = {
    emerald: "bg-emerald-500/20 text-emerald-300",
    slate: "bg-slate-700 text-slate-300",
    rose: "bg-rose-500/20 text-rose-300",
    blue: "bg-blue-500/20 text-blue-300",
    amber: "bg-amber-500/20 text-amber-300",
  };
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[color]
      )}
    >
      {children}
    </span>
  );
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
function humanizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "already_sent")
    return "This recap has already been sent. Refresh the page to see the locked state.";
  if (msg === "group_session_deferred")
    return "Group/Seminar recaps are deferred to v2. Only Private and Elite recaps send for now.";
  if (msg === "no_resolved_emails")
    return "None of the selected recipients have email addresses on file.";
  if (msg === "missing_student_data") return "Couldn't find the student's data on this booking.";
  if (msg === "missing_tutor_data") return "Couldn't find the tutor's data on this booking.";
  if (msg === "no_transcript") return "There's no transcript saved for this session yet.";
  if (msg === "empty_transcript") return "Paste a transcript before saving.";
  if (msg === "forbidden") return "You don't have permission to edit this booking.";
  if (msg.startsWith("resend_failed:"))
    return `Email delivery failed: ${msg.slice("resend_failed: ".length)}`;
  if (msg.startsWith("booking_update_failed_after_send:")) {
    return "The email was sent BUT the booking record didn't update. Contact admin — manual fix needed.";
  }
  return msg;
}
