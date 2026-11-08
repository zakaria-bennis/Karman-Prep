// ============================================================
// /admin/tutors — how many students each tutor has, regular and
// affiliate, with the list. Read-only. Data and the meaning of
// "regular" live in src/lib/admin/tutors.ts.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbPage,
  WbSearch,
  WbStats,
  WbTable,
  WbTabs,
  WbToolbar,
  formatDate,
} from "@/components/admin/workbench";
import { personName } from "@/lib/admin/plans";
import {
  filterTutors,
  loadTutorRoster,
  parseKind,
  roleLabel,
  rosterStats,
  type TutorKindFilter,
  type TutorRow,
} from "@/lib/admin/tutors";

export const metadata: Metadata = { title: "Tutors" };
export const dynamic = "force-dynamic";

const PATH = "/admin/tutors";

const KIND_TABS: Array<{ value: TutorKindFilter; label: string }> = [
  { value: "all", label: "All tutors" },
  { value: "regular", label: "Regular tutors" },
  { value: "affiliate", label: "Affiliate tutors" },
];

const EMPTY_TITLE: Record<TutorKindFilter, string> = {
  all: "No tutors yet.",
  regular: "No regular tutors yet.",
  affiliate: "No affiliate tutors yet.",
};

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

const CELL = { minWidth: 0, overflowWrap: "anywhere" } as const;

function StudentList({ tutor }: { tutor: TutorRow }) {
  if (tutor.students.length === 0) return <span>No students yet</span>;
  return (
    <details style={{ flex: "1 1 auto", textAlign: "left", minWidth: 0 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        {tutor.total} {tutor.total === 1 ? "student" : "students"}
      </summary>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 6, ...CELL }}>
        {tutor.students.map((s) => (
          <li key={s.userId}>
            {s.user?.clerkId ? (
              <Link href={`/admin/students/${encodeURIComponent(s.user.clerkId)}`}>
                {personName(s.user)}
              </Link>
            ) : s.user ? (
              personName(s.user)
            ) : (
              "Unknown student"
            )}
            <small>{s.user?.email ?? "No email"}</small>
            {s.links.map((l, i) => (
              <small key={`${l.label}-${i}`}>
                {l.label}
                {l.since ? `, since ${formatDate(l.since)}` : ""}
              </small>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 100);
  const kind = parseKind(first(sp.kind));
  const kindParam = kind === "all" ? undefined : kind;

  const roster = await loadTutorRoster();
  const stats = rosterStats(roster.tutors);
  const searched = filterTutors(roster.tutors, "all", q);
  const shown = filterTutors(searched, kind, "");

  return (
    <WbPage
      title="Tutors"
      summary="How many students each tutor has. Regular students are assigned to the tutor or are in a cohort the tutor leads. Affiliate students joined with a code from the tutor. Only current students count, and the total counts each student once."
      actions={
        <>
          <Link href="/admin/cohorts">Cohorts</Link>
          <Link href="/admin/affiliates">Affiliate codes</Link>
        </>
      }
    >
      {roster.error && (
        <p role="alert" className="wb-alert">
          Some tutor data couldn&apos;t be read: {roster.error}
        </p>
      )}
      {roster.affiliateMissing && (
        <p className="wb-note">
          The affiliate tables are not on this database yet, so affiliate counts show zero.
        </p>
      )}

      <WbStats
        items={[
          { label: "Tutors", value: stats.tutors },
          { label: "Students with a tutor", value: stats.students },
          {
            label: "Affiliate seats in use",
            value:
              stats.seatLimit > 0 ? `${stats.seatsUsed} of ${stats.seatLimit}` : stats.seatsUsed,
          },
        ]}
      />

      <WbToolbar>
        <WbTabs
          label="Tutor type"
          param="kind"
          value={kind}
          basePath={PATH}
          params={{ q: q || undefined }}
          options={KIND_TABS.map((o) => ({
            ...o,
            count: filterTutors(searched, o.value, "").length,
          }))}
        />
        <WbSearch
          label="Search by tutor name or email"
          placeholder="Tutor name or email"
          value={q}
          action={PATH}
          keep={{ kind: kindParam }}
        />
      </WbToolbar>

      <WbTable<TutorRow>
        caption="Tutors and their students"
        rows={shown}
        rowKey={(t) => t.userId}
        empty={
          q ? (
            <>
              <b>No tutor matches.</b>
              <Link href={kindParam ? `${PATH}?kind=${kindParam}` : PATH}>Clear the search</Link>
            </>
          ) : kind === "all" ? (
            <>
              <b>{EMPTY_TITLE.all}</b>
              Tutors show up here once someone has the tutor or affiliate tutor role.
            </>
          ) : (
            <>
              <b>{EMPTY_TITLE[kind]}</b>
              <Link href={PATH}>See all tutors</Link>
            </>
          )
        }
        columns={[
          {
            key: "tutor",
            label: "Tutor",
            cell: (t) => (
              <span style={CELL}>
                {t.user ? personName(t.user) : "Unknown tutor"}
                <small>{t.user?.email ?? "No email"}</small>
              </span>
            ),
          },
          {
            key: "role",
            label: "Role",
            cell: (t) => {
              const role = roleLabel(t);
              return (
                <span>
                  {role.label}
                  {role.note && <small>{role.note}</small>}
                </span>
              );
            },
          },
          { key: "regular", label: "Regular", numeric: true, cell: (t) => t.regular },
          {
            key: "affiliate",
            label: "Affiliate",
            numeric: true,
            cell: (t) => (
              <span>
                {t.affiliate}
                {t.seatLimit !== null && (
                  <small>
                    {t.affiliate} of {t.seatLimit} seats
                  </small>
                )}
              </span>
            ),
          },
          { key: "total", label: "Total", numeric: true, cell: (t) => t.total },
          { key: "students", label: "Students", cell: (t) => <StudentList tutor={t} /> },
        ]}
      />
    </WbPage>
  );
}
