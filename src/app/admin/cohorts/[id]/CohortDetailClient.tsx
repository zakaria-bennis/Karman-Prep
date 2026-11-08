"use client";

// ============================================================
// CohortDetailClient: header, totals and tabs (Members, Notes,
// Homework). Admins add and remove members here. Notes and
// homework are read-only (the tutor portal owns them).
// Tabs live in ./_components/.
// ============================================================

import Link from "next/link";
import { WbPage, WbPill, WbStats, WbTabs, WbToolbar } from "@/components/admin/workbench";
import { tierLabel } from "@/lib/scheduling/tiers";
import type { CohortDetail, EligibleStudentRow } from "@/lib/supabase/queries/cohorts";
import { ProvisionChatButton } from "@/components/admin/ProvisionChatButton";
import { STATUS_LABEL, STATUS_TONE } from "../format";
import { CohortSetupBanner } from "./_components/CohortSetupBanner";
import { HomeworkTab } from "./_components/HomeworkTab";
import { MembersTab } from "./_components/MembersTab";
import { NotesTab } from "./_components/NotesTab";
import { formatSatDate, tutorDisplay, type TabKey } from "./_components/shared";

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
  const tutorName = tutorDisplay(cohort.tutor);
  const seatsOpen = cohort.max_size - members.length;

  return (
    <WbPage
      title={cohort.name}
      summary={`${tierLabel(cohort.tier)} for the ${formatSatDate(cohort.sat_date)} SAT, led by ${tutorName}.`}
      actions={<Link href="/admin/cohorts">All cohorts</Link>}
    >
      <WbToolbar>
        <WbPill tone={STATUS_TONE[cohort.status]}>{STATUS_LABEL[cohort.status]}</WbPill>
        {cohort.archived_at && <WbPill tone="neutral">Archived</WbPill>}
        <ProvisionChatButton cohortId={cohort.id} alreadyProvisioned={chatProvisioned} />
      </WbToolbar>

      {cohort.current_topic && <p className="wb-note">Current topic: {cohort.current_topic}</p>}

      <WbStats
        items={[
          { label: "Students", value: `${cohort.member_count} of ${cohort.max_size}` },
          { label: "Open seats", value: Math.max(0, seatsOpen) },
          { label: "Homework posted", value: homework.length },
        ]}
      />

      {cohort.setup_completed_at === null &&
      (cohort.tier === "group" || cohort.tier === "small_group") ? (
        <CohortSetupBanner cohortId={cohort.id} />
      ) : null}

      <WbTabs
        label="Cohort sections"
        param="tab"
        value={activeTab}
        basePath={`/admin/cohorts/${cohort.id}`}
        options={[
          { value: "members", label: "Members", count: members.length },
          { value: "notes", label: "Notes", count: tutorNote ? 1 : 0 },
          { value: "homework", label: "Homework", count: homework.length },
        ]}
      />

      {activeTab === "members" && (
        <MembersTab
          cohortId={cohort.id}
          members={members}
          seatsOpen={seatsOpen}
          cohortTier={cohort.tier}
          eligibleStudents={eligibleStudents}
        />
      )}
      {activeTab === "notes" && <NotesTab note={tutorNote} tutorName={tutorName} />}
      {activeTab === "homework" && <HomeworkTab homework={homework} />}
    </WbPage>
  );
}
