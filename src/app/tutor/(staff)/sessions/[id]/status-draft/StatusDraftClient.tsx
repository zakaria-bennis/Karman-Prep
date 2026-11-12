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

import {
  type Field,
  type StatusDraftPageData,
  FIELDS,
  EMPTY_DRAFT,
  RecapPreview,
  RecapAlreadySent,
  PlanTierPill,
  DraftStatusPill,
} from "./status-draft-parts";
import { formatSessionDate, shortDate, timeSince, humanizeError } from "./status-draft-format";

export type { StatusDraftPageData } from "./status-draft-parts";

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
        <h2 className="kp-title">Session recap draft: {data.studentName}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--mute)]">
          <span>{sessionDateLabel}</span>
          <span className="text-[color:var(--mute)]">·</span>
          <span>{data.durationMinutes} min</span>
          <span className="text-[color:var(--mute)]">·</span>
          <PlanTierPill tier={data.planTier} />
          <span className="text-[color:var(--mute)]">·</span>
          <DraftStatusPill data={data} />
        </div>
      </header>

      {/* Group-session gate: recaps send for private tutoring only */}
      {!isOneOnOne && (
        <div className="flex items-start gap-2 rounded border border-[color-mix(in_srgb,var(--warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--warn)_5%,transparent)] px-4 py-3 text-sm text-[color:var(--warn)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Group session: auto-recap deferred.</strong> Recaps send for private tutoring
            sessions only for now. Cohort and weekly live session recaps come later.
          </div>
        </div>
      )}

      {/* ── No transcript yet — manual paste form ──────── */}
      {!data.hasTranscript && (
        <section className="rounded border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[color:var(--mute)]" />
            <h2 className="text-sm font-bold text-[color:var(--ink)]">No transcript yet</h2>
          </div>
          <p className="mb-3 text-sm text-[color:var(--mute)]">
            If Fireflies has a transcript for this session, the draft will appear here
            automatically. Otherwise, paste the transcript below and we&apos;ll generate the draft.
          </p>
          <textarea
            value={pendingTranscript}
            onChange={(e) => setPendingTranscript(e.target.value)}
            placeholder={`Paste transcript here. Format like:\n\nZakaria: Today we covered linear equations…\nMaya: I'm still confused about negative coefficients.\n…`}
            rows={8}
            className="w-full rounded border border-[color:var(--line)] bg-[color:var(--sunk)] px-3 py-2 font-mono text-sm leading-relaxed text-[color:var(--ink)] focus:border-[color-mix(in_srgb,var(--info)_40%,transparent)] focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleManualTranscript}
              disabled={isPending || !pendingTranscript.trim()}
              className="inline-flex items-center gap-2 rounded bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="flex items-start gap-2 rounded border border-[color-mix(in_srgb,var(--late)_30%,transparent)] bg-[color-mix(in_srgb,var(--late)_5%,transparent)] px-4 py-3 text-sm text-[color:var(--late)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Draft generation failed.</strong> The transcript is saved. You can write the
            recap manually in the form below or regenerate.
            <div className="mt-1 font-mono text-xs text-[color-mix(in_srgb,var(--late)_80%,transparent)]">
              {data.draftError}
            </div>
          </div>
        </div>
      )}

      {/* ── Action error ────────────────────────────────── */}
      {error && (
        <div className="rounded border border-[color-mix(in_srgb,var(--late)_30%,transparent)] bg-[color-mix(in_srgb,var(--late)_5%,transparent)] px-4 py-3 text-sm text-[color:var(--late)]">
          {error}
        </div>
      )}

      {/* ── Edit form + Preview (split 7/5 on desktop) ─── */}
      {(data.hasTranscript || data.draft || data.draftError) && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT — editable fields */}
          <section className="rounded border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[color:var(--mute)]" />
                <h2 className="text-sm font-bold text-[color:var(--ink)]">Edit draft</h2>
                {savedAt && (
                  <span className="text-xs text-[color:var(--mute)]">
                    · saved {timeSince(savedAt)} ago
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-md border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--raised)]"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--good)_28%,transparent)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color-mix(in_srgb,var(--good)_28%,transparent)] disabled:opacity-40"
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--raised)] disabled:opacity-40"
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
                  <label className="mb-1.5 block text-[11px] font-bold text-[color:var(--mute)]">
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
                        ? "border-[color:var(--line)] bg-[color:var(--sunk)] text-[color:var(--ink)] focus:border-[color-mix(in_srgb,var(--info)_40%,transparent)] focus:outline-none"
                        : "cursor-default border-[color:var(--line)] bg-[color:var(--card)] text-[color:var(--ink)]"
                    )}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT — preview */}
          <aside className="lg:col-span-5">
            <div className="sticky top-6 rounded border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[color:var(--info)]" />
                <h2 className="text-sm font-bold text-[color:var(--ink)]">
                  Preview — what the parent sees
                </h2>
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
        <section className="rounded border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-[color:var(--mute)]" />
            <h2 className="text-sm font-bold text-[color:var(--ink)]">Recipients</h2>
          </div>
          {allRecipients.length === 0 ? (
            <p className="text-sm text-[color:var(--mute)]">
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
                    className="h-4 w-4 accent-[color:var(--info)]"
                  />
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold",
                      r.type === "student"
                        ? "bg-[color-mix(in_srgb,var(--good)_20%,transparent)] text-[color:var(--good)]"
                        : "bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-text)]"
                    )}
                  >
                    {r.type}
                  </span>
                  <span className="font-medium text-[color:var(--ink)]">{r.label}</span>
                  <span className="text-[color:var(--mute)]">{r.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Send button ─────────────────────────────────── */}
      {(data.hasTranscript || data.draft) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-[color:var(--mute)]">
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
            className="inline-flex items-center gap-2 rounded bg-[color:var(--accent)] px-6 py-3 text-sm font-bold text-[color:var(--accent-ink)] hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
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
