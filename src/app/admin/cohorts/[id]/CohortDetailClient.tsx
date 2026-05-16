"use client";

// ============================================================
// CohortDetailClient — header + tabs (Members / Notes / Homework).
// Admin can add/remove members. Notes + homework are read-only
// here (the tutor portal owns their CRUD).
//
// The tab implementations + shared primitives live in
// ./_components/ (audit M1 split — was a single 700-line file).
// ============================================================

import { BookOpen, ClipboardList, Users as UsersIcon } from "lucide-react";
import type { CohortDetail, EligibleStudentRow } from "@/lib/supabase/queries/cohorts";
import { ProvisionChatButton } from "@/components/admin/ProvisionChatButton";
import { CohortSetupBanner } from "./_components/CohortSetupBanner";
import { HomeworkTab } from "./_components/HomeworkTab";
import { MembersTab } from "./_components/MembersTab";
import { NotesTab } from "./_components/NotesTab";
import {
  formatDate,
  StatusBadge,
  TabLink,
  TierBadge,
  tutorDisplay,
  type TabKey,
} from "./_components/shared";

interface Props {
  detail: CohortDetail;
  activeTab: TabKey;
  eligibleStudents: EligibleStudentRow[];
  chatProvisioned: boolean;
}

export default function CohortDetailClient({
  detail,
  activeTab,
  eligibleStudents,
  chatProvisioned,
}: Props) {
  const { cohort, members, tutorNote, homework } = detail;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <TierBadge tier={cohort.tier} />
          <StatusBadge status={cohort.status} />
          <span className="text-sm text-slate-400">{formatDate(cohort.sat_date)} SAT</span>
          <span className="text-slate-400">·</span>
          <span className="text-sm text-slate-400">{tutorDisplay(cohort.tutor)}</span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-sm text-slate-400">
            {cohort.member_count}/{cohort.max_size} seats
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{cohort.name}</h1>
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

      {cohort.setup_completed_at === null &&
      (cohort.tier === "group" || cohort.tier === "small_group") ? (
        <CohortSetupBanner cohortId={cohort.id} />
      ) : null}

      {/* ── Tab nav ────────────────────────────────────────── */}
      <div className="mb-6 flex gap-1 border-b border-slate-800 text-sm">
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
      {activeTab === "members" && (
        <MembersTab
          cohortId={cohort.id}
          members={members}
          seatsOpen={cohort.max_size - members.length}
          cohortTier={cohort.tier}
          eligibleStudents={eligibleStudents}
        />
      )}
      {activeTab === "notes" && (
        <NotesTab note={tutorNote} tutorName={tutorDisplay(cohort.tutor)} />
      )}
      {activeTab === "homework" && <HomeworkTab homework={homework} />}
    </div>
  );
}
