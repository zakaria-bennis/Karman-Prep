// ============================================================
// /admin/crm — the People CRM: every lead, parent, student,
// school contact and affiliate tutor in one list, merged by
// email. Stages follow purchases and subscriptions (local rows,
// never Stripe); an admin can move a contact by hand. List and
// pipeline views, filters in the address bar, and the follow-ups
// that are overdue.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { Card, Row, SectionHeader } from "@/components/portal";
import { WbPage } from "@/components/admin/workbench";
import { PLAN_IDS, PLAN_LABEL } from "@/lib/admin/plans";
import { filterContacts, filterHref, parseFilters } from "@/lib/admin/crm/filters";
import { loadCrm } from "@/lib/admin/crm/load";
import { crmToday, dayLabel, formatCents } from "@/lib/admin/crm/format";
import { SOURCE_LABEL, sourceLabel } from "@/lib/admin/crm/model";
import {
  CONTACT_TYPES,
  STAGES,
  STAGE_HINT,
  STAGE_LABEL,
  TYPE_LABEL,
  type Contact,
  type Stage,
} from "@/lib/admin/crm/types";
import CountUp from "./CountUp";
import CrmBoard, { type BoardCard } from "./CrmBoard";
import FilterBar from "./FilterBar";
import { selectRows } from "@/lib/admin/plans";
import "./crm.css";

export const metadata: Metadata = { title: "CRM | Karman admin" };
export const dynamic = "force-dynamic";

const LIST_LIMIT = 200;

function ago(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function openTasks(today: string) {
  const res = await selectRows("crm_tasks", "id, contact_key, title, due_on, done_at");
  return res.rows
    .filter((r) => !r.done_at && String(r.due_on ?? "") <= today)
    .map((r) => ({
      key: String(r.contact_key),
      title: String(r.title),
      dueOn: String(r.due_on).slice(0, 10),
    }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const f = parseFilters(await searchParams);
  const now = new Date();
  const today = crmToday(now);
  const [data, due] = await Promise.all([loadCrm({ now }), openTasks(today)]);
  const { contacts } = data;
  const shown = filterContacts(contacts, f);
  const byKey = new Map(contacts.map((c) => [c.key, c]));
  const owners = new Map(data.owners.map((o) => [o.id, o.name]));

  const count = (s: Stage) => contacts.filter((c) => c.stage === s).length;
  const paidTotal = contacts.reduce((sum, c) => sum + Math.max(0, c.paidCents ?? 0), 0);
  const overdue = due.filter((t) => t.dueOn < today);
  const dueToday = due.filter((t) => t.dueOn === today);

  const sourceKeys = [...new Set(contacts.flatMap((c) => c.sources))].sort((a, b) =>
    sourceLabel(a).localeCompare(sourceLabel(b))
  );
  const tags = [...new Set(contacts.flatMap((c) => c.tags))].sort();

  return (
    <WbPage
      title="CRM"
      summary="Everyone who has come our way: leads, parents, students, school contacts and affiliate tutors, merged by email. Stages follow what they bought; move a card when you know more."
    >
      <div className="crm-wrap">
        <nav className="crm-funnel" aria-label="People by stage">
          {STAGES.map((s) => {
            const n = count(s);
            return (
              <Link
                key={s}
                href={filterHref(f, { stage: f.stage === s ? "all" : s })}
                className="crm-stage"
                data-stage={s}
                aria-current={f.stage === s ? "true" : undefined}
                title={STAGE_HINT[s]}
                style={{ flexGrow: Math.max(1, n) }}
              >
                <span className="crm-stage-n">
                  <CountUp value={n} />
                </span>
                <span className="crm-stage-l">{STAGE_LABEL[s]}</span>
                <i className="crm-stage-bar" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
        <p className="crm-total">
          <CountUp value={paidTotal} kind="cents" ms={1200} /> paid in all, estimated at list price
          from local purchases and subscriptions, after refunds. Stripe has the exact amounts.
        </p>

        <Card tone={overdue.length > 0 ? "late" : undefined} label="Follow-ups due">
          <SectionHeader
            title="Overdue follow-ups"
            note={`${overdue.length} overdue, ${dueToday.length} due today`}
          />
          {overdue.length + dueToday.length === 0 && (
            <p className="crm-hint">
              Nothing overdue. Add a follow-up with a due date on anyone&apos;s page.
            </p>
          )}
          {[...overdue, ...dueToday].slice(0, 8).map((t, i) => {
            const c = byKey.get(t.key);
            return (
              <Row
                key={`${t.key}-${i}`}
                title={t.title}
                sub={c?.name ?? "Contact no longer listed"}
                right={t.dueOn < today ? `Due ${dayLabel(t.dueOn)}` : "Today"}
                rightTone={t.dueOn < today ? "late" : undefined}
                href={c ? `/admin/crm/${c.id}` : undefined}
              />
            );
          })}
          {overdue.length + dueToday.length > 8 && (
            <p className="crm-hint">And {overdue.length + dueToday.length - 8} more.</p>
          )}
        </Card>

        <div className="crm-bar">
          <div className="crm-views" role="group" aria-label="View">
            <Link
              href={filterHref(f, { view: "list" })}
              aria-current={f.view === "list" ? "page" : undefined}
            >
              List
            </Link>
            <Link
              href={filterHref(f, { view: "board" })}
              aria-current={f.view === "board" ? "page" : undefined}
            >
              Pipeline
            </Link>
            <i className="crm-views-pill" data-at={f.view} aria-hidden="true" />
          </div>
          <FilterBar
            filters={f}
            types={CONTACT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
            stages={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
            sources={sourceKeys.map((s) => ({ value: s, label: SOURCE_LABEL[s] ?? s }))}
            plans={[
              { value: "none", label: "No plan" },
              ...PLAN_IDS.filter((p) => p !== "free").map((p) => ({
                value: p,
                label: PLAN_LABEL[p],
              })),
            ]}
            tags={tags.map((t) => ({ value: t, label: t }))}
          />
        </div>

        {(data.missing.length > 0 || data.errors.length > 0) && (
          <p className="wb-alert" role="alert">
            {data.missing.length > 0 &&
              `Not on this database yet: ${data.missing.join(", ")}. Those parts read as empty. `}
            {data.errors.length > 0 && `Couldn't read: ${data.errors.join("; ")}`}
          </p>
        )}

        <p className="crm-count">
          {shown.length === contacts.length
            ? `${contacts.length} people`
            : `${shown.length} of ${contacts.length} people`}
          {(f.type !== "all" ||
            f.stage !== "all" ||
            f.source ||
            f.plan !== "all" ||
            f.tag ||
            f.q) && (
            <>
              {" · "}
              <Link
                className="kp-link"
                href={filterHref(f, {
                  type: "all",
                  stage: "all",
                  source: "",
                  plan: "all",
                  tag: "",
                  q: "",
                })}
              >
                Clear filters
              </Link>
            </>
          )}
        </p>

        {f.view === "board" ? (
          <CrmBoard
            cards={shown.map(toCard)}
            moreHref={
              Object.fromEntries(
                STAGES.map((s) => [s, filterHref(f, { view: "list", stage: s })])
              ) as Record<Stage, string>
            }
          />
        ) : shown.length === 0 ? (
          <p className="crm-empty">
            {contacts.length === 0
              ? "No one yet. Leads from the site's forms, sign-ups, schools and affiliate tutors show up here on their own."
              : "No one matches these filters."}
          </p>
        ) : (
          <ul className="crm-list">
            {shown.slice(0, LIST_LIMIT).map((c, i) => (
              <li key={c.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                <Link className="crm-item" href={`/admin/crm/${c.id}`}>
                  <span className="crm-item-who">
                    <b>{c.name}</b>
                    <small>
                      {TYPE_LABEL[c.type]}
                      {c.sources[0] && <> · {sourceLabel(c.sources[0])}</>}
                      {c.ownerUserId && owners.get(c.ownerUserId) && (
                        <> · {owners.get(c.ownerUserId)}</>
                      )}
                    </small>
                  </span>
                  <span className="crm-item-stage" data-stage={c.stage}>
                    <i className="crm-dot" data-stage={c.stage} aria-hidden="true" />
                    {STAGE_LABEL[c.stage]}
                    {c.stageManual && <span className="crm-sr"> (set by hand)</span>}
                  </span>
                  <span className="crm-item-plan">{c.plan ? PLAN_LABEL[c.plan] : "No plan"}</span>
                  <span className="crm-item-paid">{formatCents(c.paidCents)}</span>
                  <span className="crm-item-when">{ago(c.lastActivity, now)}</span>
                  {(c.tags.length > 0 || c.overdueTasks > 0) && (
                    <span className="crm-chips">
                      {c.overdueTasks > 0 && (
                        <span className="crm-chip" data-tone="late">
                          {c.overdueTasks} overdue
                        </span>
                      )}
                      {c.tags.map((t) => (
                        <span key={t} className="crm-chip">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {f.view === "list" && shown.length > LIST_LIMIT && (
          <p className="crm-count">
            Showing the {LIST_LIMIT} most recent. Narrow the filters to see the rest.
          </p>
        )}
      </div>
    </WbPage>
  );
}

function toCard(c: Contact): BoardCard {
  return {
    id: c.id,
    key: c.key,
    name: c.name,
    typeLabel: TYPE_LABEL[c.type],
    planLabel: c.plan ? PLAN_LABEL[c.plan] : null,
    paid: c.paidCents ? formatCents(c.paidCents) : null,
    stage: c.stage,
    derivedStage: c.derivedStage,
    overdue: c.overdueTasks,
    tags: c.tags,
  };
}
