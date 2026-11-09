"use client";

// Shared types, field list and presentational pieces for the
// session recap draft page (StatusDraftClient).

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { learningPlanCopy } from "@/lib/learning-plan/copy";
import type { StatusDraft } from "@/lib/integrations/openai/generate-status-draft";
import { tierLabelOf } from "@/lib/scheduling/tiers";

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

export type Field = keyof StatusDraft;

export const FIELDS: Array<{ key: Field; label: string }> = [
  { key: "date_and_time_of_session", label: "Date and Time of Session" },
  { key: "student_performance_progress", label: "Student Performance/Progress" },
  { key: "subjects_covered_during_session", label: "Subjects Covered During the Session" },
  { key: "specific_weak_points_or_mistakes", label: "Specific Weak Points or Mistakes to Review" },
  { key: "next_steps_homework_assigned", label: "Next Steps Homework Assigned" },
  { key: "subjects_to_cover_next_session", label: "Subjects to Cover Next Session" },
  {
    key: "homework_practice_before_next_session",
    label: learningPlanCopy.tutorPracticeField,
  },
  { key: "date_and_time_of_next_session", label: "Date and Time of Next Session" },
];

export const EMPTY_DRAFT: StatusDraft = Object.fromEntries(
  FIELDS.map((f) => [f.key, ""])
) as unknown as StatusDraft;

// ──────────────────────────────────────────────────────────
// Preview component — renders draft as the parent will see it
// ──────────────────────────────────────────────────────────
export function RecapPreview({
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
    <div className="overflow-hidden rounded-md border border-[color:var(--line)] bg-[color:var(--sunk)]">
      <header className="border-b border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] px-4 py-3 text-xs">
        <div className="text-[color:var(--mute)]">From</div>
        <div className="text-[color:var(--ink)]">{fromName} &lt;noreply@karmanprep.com&gt;</div>
        <div className="mt-1.5 text-[color:var(--mute)]">Subject</div>
        <div className="font-semibold text-[color:var(--ink)]">{subject}</div>
      </header>
      <div className="space-y-3 px-4 py-4 font-serif text-sm leading-relaxed text-[color:var(--ink)]">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="font-sans font-semibold not-italic text-[color:var(--ink)]">
              {f.label}:
            </div>
            <div className="mt-0.5 whitespace-pre-wrap">
              {draft[f.key]?.trim() || (
                <span className="italic text-[color:var(--mute)]">— empty —</span>
              )}
            </div>
          </div>
        ))}
        <div className="mt-3 whitespace-pre-wrap border-t border-[color:var(--line)] pt-3 text-[color:var(--ink)]">
          {signature}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Read-only state for already-sent recaps
// ──────────────────────────────────────────────────────────
export function RecapAlreadySent({
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
        <h2 className="kp-title">Recap sent: {data.studentName}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--mute)]">
          <CheckCircle2 className="h-4 w-4 text-[color:var(--good)]" />
          <span>Sent {data.recapSentAt ? new Date(data.recapSentAt).toLocaleString() : "—"}</span>
        </div>
      </header>
      <div className="rounded border border-[color-mix(in_srgb,var(--good)_30%,transparent)] bg-[color-mix(in_srgb,var(--good)_5%,transparent)] p-5">
        <p className="text-sm text-[color:var(--good)]">
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
export function PlanTierPill({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    private: "bg-[color-mix(in_srgb,var(--warn)_20%,transparent)] text-[color:var(--warn)]",
    elite: "bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-text)]",
    small_group: "bg-[color-mix(in_srgb,var(--good)_20%,transparent)] text-[color:var(--good)]",
    group: "bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-text)]",
  };
  const label = tierLabelOf(tier);
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold",
        map[tier] ?? "bg-[color:var(--raised)] text-[color:var(--ink)]"
      )}
    >
      {label}
    </span>
  );
}

export function DraftStatusPill({ data }: { data: StatusDraftPageData }) {
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
    emerald: "bg-[color-mix(in_srgb,var(--good)_20%,transparent)] text-[color:var(--good)]",
    slate: "bg-[color:var(--raised)] text-[color:var(--ink)]",
    rose: "bg-[color-mix(in_srgb,var(--late)_20%,transparent)] text-[color:var(--late)]",
    blue: "bg-[color-mix(in_srgb,var(--info)_20%,transparent)] text-[color:var(--info)]",
    amber: "bg-[color-mix(in_srgb,var(--warn)_20%,transparent)] text-[color:var(--warn)]",
  };
  return (
    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold", map[color])}>{children}</span>
  );
}
