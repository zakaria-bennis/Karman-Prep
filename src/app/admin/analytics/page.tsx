// ============================================================
// /admin/analytics — Karman's own usage numbers (founder, 2026-11-12): the sign-up funnel with
// its drop-offs, daily active students, time by feature, top pages, where visits end, and a
// per-student panel tutors can use. Real rows from public.analytics_events and the answer
// tables; ?sample=1 shows made-up data, labelled, and never mixed with real rows.
// ============================================================

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { RANGES, loadAnalytics, type RangeDays } from "@/lib/analytics/load";
import { ANALYTICS_RETENTION_MONTHS } from "@/lib/analytics/shared";
import {
  WbEmpty,
  WbPage,
  WbSection,
  WbStats,
  WbTable,
  WbTabs,
  formatDateTime,
} from "@/components/admin/workbench";
import {
  DailyActiveChart,
  ExitChart,
  FeatureTimeChart,
  FunnelChart,
} from "@/components/admin/analytics/Charts";

export const metadata: Metadata = { title: "Analytics | Admin" };
export const dynamic = "force-dynamic";

const n = (x: number) => x.toLocaleString("en-US");

function secondsLabel(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; sample?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(sp.days))
    ? (Number(sp.days) as RangeDays)
    : 30;
  const sample = sp.sample === "1";
  const data = await loadAnalytics(days, sample);
  const params = { days: String(days), sample: sample ? "1" : undefined };
  const maxMinutes = Math.max(1, ...data.students.map((s) => s.minutes));

  return (
    <WbPage
      title="Analytics"
      summary={`What visitors and students do on Karman, from our own records (no outside trackers). Raw events are kept ${ANALYTICS_RETENTION_MONTHS} months.`}
      actions={
        <Link
          className="wb-btn"
          href={`/admin/analytics?days=${days}${sample ? "" : "&sample=1"}`}
          data-variant={sample ? "primary" : undefined}
        >
          {sample ? "Back to real data" : "Preview with sample data"}
        </Link>
      }
    >
      {data.mode === "sample" ? (
        <p className="an-mode" role="note">
          <b>Sample data.</b> Every number on this page is made up so the charts can be judged
          before real traffic exists. Nothing here is a real visitor or student.
        </p>
      ) : (
        data.eventCount === 0 && (
          <p className="an-mode" role="note">
            <b>No events yet in this window.</b> Visits are counted on the public site after a
            visitor allows analytics, and in the portals for signed-in users.{" "}
            <Link className="kp-link" href={`/admin/analytics?days=${days}&sample=1`}>
              See the page with sample data
            </Link>
            .
          </p>
        )
      )}

      <WbTabs
        label="Time range"
        param="days"
        value={String(days)}
        basePath="/admin/analytics"
        params={params}
        options={RANGES.map((d) => ({ value: String(d), label: `Last ${d} days` }))}
      />

      <WbStats
        items={[
          { label: "Site visitors (who allowed analytics)", value: n(data.totals.visitors) },
          { label: "Students active", value: n(data.totals.students) },
          { label: "Student minutes", value: n(data.totals.minutes) },
          { label: "Student visits", value: n(data.totals.sessions) },
        ]}
      />
      {data.truncated && (
        <p className="an-note">
          Showing the most recent 50,000 events of this window; pick a shorter range for the rest.
        </p>
      )}

      <FunnelChart rows={data.funnel} />
      <DailyActiveChart daily={data.daily} />
      <div className="an-grid" data-columns="2">
        <FeatureTimeChart features={data.features} />
        <ExitChart exits={data.exits} />
      </div>

      <WbSection title="Top pages">
        <WbTable
          caption="Most viewed pages"
          rowKey={(p) => p.path}
          empty={<WbEmpty title="No page views in this window" />}
          rows={data.pages}
          columns={[
            { key: "path", label: "Page", cell: (p) => <code>{p.path}</code> },
            {
              key: "where",
              label: "Where",
              cell: (p) => (p.surface === "site" ? "Site" : "Portal"),
            },
            { key: "views", label: "Views", numeric: true, cell: (p) => n(p.views) },
            { key: "people", label: "People", numeric: true, cell: (p) => n(p.people) },
            {
              key: "time",
              label: "Avg. time",
              numeric: true,
              cell: (p) => secondsLabel(p.avgSeconds),
            },
          ]}
        />
      </WbSection>

      <WbSection title="Students: engagement">
        <p className="an-note">
          For tutors: active minutes and visits in the portal, the feature they use most, where
          their visits usually end, and how many visits ended with a question still on screen.
          Questions answered come from the practice and test answer records.
        </p>
        <WbTable
          caption="Engagement per student"
          rowKey={(s) => s.userId}
          empty={<WbEmpty title="No student activity in this window" />}
          rows={data.students}
          columns={[
            {
              key: "name",
              label: "Student",
              cell: (s) =>
                data.mode === "real" ? (
                  <Link
                    className="kp-link"
                    href={`/admin/students/${encodeURIComponent(s.userId)}`}
                  >
                    {s.name}
                  </Link>
                ) : (
                  s.name
                ),
            },
            {
              key: "minutes",
              label: "Minutes",
              numeric: true,
              cell: (s) => (
                <>
                  {n(s.minutes)}
                  <span className="an-mini" aria-hidden="true">
                    <span
                      style={{ "--w": `${(s.minutes / maxMinutes) * 100}%` } as CSSProperties}
                    />
                  </span>
                </>
              ),
            },
            { key: "visits", label: "Visits", numeric: true, cell: (s) => n(s.sessions) },
            { key: "days", label: "Active days", numeric: true, cell: (s) => n(s.activeDays) },
            { key: "top", label: "Uses most", cell: (s) => s.topFeature ?? "—" },
            { key: "stall", label: "Visits end in", cell: (s) => s.stallsAt ?? "—" },
            {
              key: "mid",
              label: "Left mid-question",
              numeric: true,
              cell: (s) => n(s.leftMidQuestion),
            },
            {
              key: "qs",
              label: "Questions seen / answered",
              numeric: true,
              cell: (s) => `${n(s.questionsSeen)} / ${n(s.questionsAnswered)}`,
            },
            { key: "last", label: "Last seen", cell: (s) => formatDateTime(s.lastSeen) },
          ]}
        />
      </WbSection>
    </WbPage>
  );
}
