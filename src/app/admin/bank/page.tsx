// ============================================================
// /admin/bank — read-only view of the question bank: counts by
// domain and skill (core = difficulty 1 to 5, mastery = 6 and 7),
// a search by id, id start or stem text, and the open flags for
// the import team. Nothing on this page writes to the bank.
// ============================================================

import Link from "next/link";
import {
  WbPage,
  WbPill,
  WbSearch,
  WbSection,
  WbStats,
  WbTable,
  formatDate,
  type WbColumn,
} from "@/components/admin/workbench";
import {
  SEARCH_LIMIT,
  difficultyBand,
  domainLabel,
  flagReasonLabel,
  humanize,
  listOpenFlags,
  loadBankSummary,
  planSearch,
  publishTone,
  searchBank,
  shortId,
  skillLabel,
  type DomainCount,
  type ImportFlag,
  type SearchHit,
  type SkillCount,
} from "@/lib/admin/bank";

export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/admin/questions/dashboard", label: "Dashboard" },
  { href: "/admin/questions/review", label: "Review" },
  { href: "/admin/questions/preview", label: "Preview" },
  { href: "/admin/questions/import", label: "Import" },
  { href: "/admin/curriculum", label: "Curriculum" },
];

const n = (value: number) => value.toLocaleString("en-US");

function Difficulty({ level }: { level: number | null }) {
  const band = difficultyBand(level);
  if (level === null) return <span>—</span>;
  return (
    <span>
      {level}{" "}
      <WbPill tone={band === "mastery" ? "info" : "neutral"}>
        {band === "mastery" ? "Mastery" : band === "core" ? "Core" : "Unrated"}
      </WbPill>
    </span>
  );
}

const domainColumns: WbColumn<DomainCount>[] = [
  { key: "domain", label: "Domain", cell: (row) => row.label },
  { key: "core", label: "Core", numeric: true, cell: (row) => n(row.core) },
  { key: "mastery", label: "Mastery", numeric: true, cell: (row) => n(row.mastery) },
  {
    key: "total",
    label: "Total",
    numeric: true,
    cell: (row) => n(row.core + row.mastery + row.unrated),
  },
];

const skillColumns: WbColumn<SkillCount>[] = [
  { key: "skill", label: "Skill", cell: (row) => row.label },
  { key: "domain", label: "Domain", cell: (row) => row.domainLabel },
  { key: "core", label: "Core", numeric: true, cell: (row) => n(row.core) },
  { key: "mastery", label: "Mastery", numeric: true, cell: (row) => n(row.mastery) },
  {
    key: "total",
    label: "Total",
    numeric: true,
    cell: (row) => n(row.core + row.mastery + row.unrated),
  },
];

const hitColumns: WbColumn<SearchHit>[] = [
  {
    key: "id",
    label: "Question",
    cell: (row) => <Link href={`/admin/bank/${row.id}`}>{shortId(row.id)}</Link>,
  },
  { key: "stem", label: "Stem", cell: (row) => row.stem || "No stem text" },
  { key: "skill", label: "Skill", cell: (row) => skillLabel(row.skillId) },
  { key: "domain", label: "Domain", cell: (row) => domainLabel(row.domain) },
  { key: "level", label: "Difficulty", cell: (row) => <Difficulty level={row.level} /> },
  {
    key: "status",
    label: "Status",
    cell: (row) =>
      row.archived ? (
        <WbPill tone="neutral">Archived</WbPill>
      ) : (
        <WbPill tone={publishTone(row.publishStatus)}>
          {row.publishStatus ? humanize(row.publishStatus) : "No status"}
        </WbPill>
      ),
  },
];

const flagColumns: WbColumn<ImportFlag>[] = [
  {
    key: "question",
    label: "Question",
    cell: (row) => <Link href={`/admin/bank/${row.questionId}`}>{shortId(row.questionId)}</Link>,
  },
  { key: "reason", label: "Reason", cell: (row) => flagReasonLabel(row.reason) },
  {
    key: "note",
    label: "Note",
    cell: (row) =>
      !row.note ? "No note" : row.note.length > 160 ? `${row.note.slice(0, 159)}…` : row.note,
  },
  { key: "created", label: "Flagged", cell: (row) => formatDate(row.createdAt) },
];

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const plan = planSearch(q);
  const canSearch = Boolean(plan.id || plan.range || plan.text);

  let loaded;
  try {
    const [summary, open, search] = await Promise.all([
      loadBankSummary(),
      listOpenFlags(),
      canSearch ? searchBank(q) : Promise.resolve(null),
    ]);
    loaded = { summary, open, search };
  } catch (err) {
    console.error("[admin/bank]", err);
    loaded = null;
  }

  const tools = (
    <p className="wb-note">
      Other question tools:{" "}
      {TOOLS.map((tool, i) => (
        <span key={tool.href}>
          {i > 0 && ", "}
          <Link href={tool.href}>{tool.label}</Link>
        </span>
      ))}
      .
    </p>
  );

  if (!loaded) {
    return (
      <WbPage title="Question bank" summary="Read-only. Flags go to the import team.">
        <p role="alert" className="wb-alert">
          The question bank could not be loaded. Reload the page to try again.
        </p>
        {tools}
      </WbPage>
    );
  }

  const { summary, open, search } = loaded;

  return (
    <WbPage title="Question bank" summary="Read-only. Flags go to the import team.">
      {tools}
      <WbStats
        items={[
          { label: "Questions (not archived)", value: n(summary.total) },
          { label: "Core, difficulty 1 to 5", value: n(summary.core) },
          { label: "Mastery, difficulty 6 and 7", value: n(summary.mastery) },
          { label: "No skill tag", value: n(summary.untagged) },
          { label: "Archived", value: n(summary.archived) },
          { label: "Open flags", value: n(open.total) },
        ]}
      />
      {summary.partial && (
        <p role="alert" className="wb-alert">
          Some rows did not load, so these counts may be low. Reload the page to try again.
        </p>
      )}
      {summary.unrated > 0 && (
        <p className="wb-note">
          {n(summary.unrated)} questions have no difficulty from 1 to 7. They count in the totals
          only.
        </p>
      )}

      <WbSearch
        label="Search questions"
        placeholder="Id, start of an id, or words from the stem"
        value={q}
        action="/admin/bank"
      />

      {q && (
        <WbSection title="Search results">
          {!canSearch ? (
            <p className="wb-note">Type at least 2 characters to search.</p>
          ) : (
            <>
              <WbTable
                caption={`Questions matching ${q}`}
                columns={hitColumns}
                rows={search?.hits ?? []}
                rowKey={(row) => row.id}
                empty={
                  <>
                    <b>No questions match &ldquo;{q}&rdquo;.</b>
                    <span>Try a shorter id or fewer words.</span>
                  </>
                }
              />
              {search?.more && (
                <p className="wb-note">
                  Showing the first {SEARCH_LIMIT}. Add more words or id characters to narrow it.
                </p>
              )}
            </>
          )}
        </WbSection>
      )}

      <WbSection title="Open flags">
        <WbTable
          caption="Open flags for the import team"
          columns={flagColumns}
          rows={open.flags}
          rowKey={(row) => row.id}
          empty={
            <>
              <b>No open flags.</b>
              <span>Flag a question from its page and it shows up here.</span>
            </>
          }
        />
        {open.total > open.flags.length && (
          <p className="wb-note">
            Showing the newest {open.flags.length} of {n(open.total)}.
          </p>
        )}
      </WbSection>

      <WbSection title="By domain">
        <WbTable
          caption="Questions by domain"
          columns={domainColumns}
          rows={summary.domains}
          rowKey={(row) => row.id ?? "none"}
          empty={<b>No questions yet.</b>}
        />
      </WbSection>

      <WbSection title="By skill">
        <WbTable
          caption="Questions by skill"
          columns={skillColumns}
          rows={summary.skills}
          rowKey={(row) => row.id ?? "none"}
          empty={<b>No questions yet.</b>}
        />
      </WbSection>
    </WbPage>
  );
}
