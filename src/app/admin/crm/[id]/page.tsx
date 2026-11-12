// ============================================================
// /admin/crm/[id] — one contact: who they are and how they found
// us, their portal accounts, what they paid (local rows, Stripe
// ids as text to look up by hand), their history, notes,
// follow-ups and tags. Students are mostly minors: this page
// shows only what an admin needs to follow up.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, SectionHeader } from "@/components/portal";
import { WbPage } from "@/components/admin/workbench";
import { PLAN_LABEL } from "@/lib/admin/plans";
import { isContactRouteId } from "@/lib/admin/crm/filters";
import { crmToday, formatCents } from "@/lib/admin/crm/format";
import { loadContactExtras, loadCrm } from "@/lib/admin/crm/load";
import { formAnswers, sourceKey, sourceLabel } from "@/lib/admin/crm/model";
import { STAGE_LABEL, TYPE_LABEL, type EventKind } from "@/lib/admin/crm/types";
import {
  NoteComposer,
  NoteDelete,
  OwnerPicker,
  StagePicker,
  TagEditor,
  TaskList,
} from "./ContactEditors";
import "../crm.css";

export const metadata: Metadata = { title: "Contact | Karman admin" };
export const dynamic = "force-dynamic";

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const KIND_LABEL: Readonly<Record<EventKind, string>> = {
  form: "Form",
  signup: "Account",
  onboarded: "Account",
  family: "Family",
  waitlist: "Waitlist",
  cohort: "Cohort",
  subscription: "Plan",
  purchase: "Purchase",
  refund: "Refund",
  school: "Plan",
  "tutor-code": "Plan",
  note: "Note",
  task: "Follow-up",
  stage: "Stage",
};

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isContactRouteId(id)) notFound();
  const now = new Date();
  const data = await loadCrm({ now, withNoteBodies: true });
  const c = data.contacts.find((x) => x.ids.includes(id));
  if (!c) notFound();
  if (c.id !== id) redirect(`/admin/crm/${c.id}`);
  const extras = await loadContactExtras(c.key);
  const authors = new Map(data.owners.map((o) => [o.id, o.name]));
  const today = crmToday(now);
  const answers = c.leads.flatMap((l) =>
    formAnswers(l.details, true).map(
      ([k, v]) => [`${k} (${sourceLabel(sourceKey(l.source))})`, v] as const
    )
  );

  return (
    <WbPage
      title={c.name}
      summary={
        <>
          {TYPE_LABEL[c.type]} · {STAGE_LABEL[c.stage]}
          {c.plan && <> · {PLAN_LABEL[c.plan]}</>}
        </>
      }
      actions={
        <Link className="kp-link" href="/admin/crm">
          Back to the CRM
        </Link>
      }
    >
      <div className="crm-detail">
        <div className="crm-detail-main">
          <Card label="Stage">
            <SectionHeader title="Stage" />
            <StagePicker contactKey={c.key} stage={c.stage} derived={c.derivedStage} />
          </Card>

          <Card label="Notes">
            <SectionHeader title="Notes" note={extras.notes.length || undefined} />
            <NoteComposer contactKey={c.key} />
            <ul className="crm-notes">
              {extras.notes.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <small>
                    {when(n.createdAt)}
                    {n.authorUserId && authors.get(n.authorUserId) && (
                      <> · {authors.get(n.authorUserId)}</>
                    )}{" "}
                    · <NoteDelete contactKey={c.key} id={n.id} />
                  </small>
                </li>
              ))}
            </ul>
          </Card>

          <Card label="Follow-ups" tone={c.overdueTasks > 0 ? "late" : undefined}>
            <SectionHeader
              title="Follow-ups"
              note={c.openTasks ? `${c.openTasks} open` : undefined}
            />
            <TaskList contactKey={c.key} tasks={extras.tasks} today={today} />
          </Card>

          <Card label="History">
            <SectionHeader title="History" note={c.events.length} />
            <ol className="crm-timeline">
              {c.events.map((e, i) => (
                <li key={`${e.at}-${i}`} data-kind={e.kind}>
                  <i aria-hidden="true" />
                  <div>
                    <b>{e.title}</b>
                    {e.detail && <p>{e.detail}</p>}
                    <small>
                      {KIND_LABEL[e.kind]} · {when(e.at)}
                    </small>
                  </div>
                </li>
              ))}
              {c.events.length === 0 && <li className="crm-hint">Nothing yet.</li>}
            </ol>
          </Card>
        </div>

        <div className="crm-detail-side">
          <Card label="Profile">
            <SectionHeader title="Profile" />
            <dl className="crm-dl">
              {(
                [
                  ["Email", c.email ?? "None on file"],
                  ["Came in through", c.sources.map(sourceLabel).join(", ") || "—"],
                  ["How they found us", c.foundUs ?? "Not asked yet"],
                  ["Last activity", when(c.lastActivity)],
                  ...answers,
                ] as Array<readonly [string, string]>
              ).map(([k, v], i) => (
                <div key={`${k}-${i}`}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <OwnerPicker contactKey={c.key} owner={c.ownerUserId} owners={data.owners} />
          </Card>

          <Card label="Tags">
            <SectionHeader title="Tags" />
            <TagEditor contactKey={c.key} tags={c.tags} />
          </Card>

          <Card label="Accounts and links">
            <SectionHeader title="Accounts and links" />
            {c.accounts.length === 0 && (
              <p className="crm-hint">No Karman account yet. They are on the list from a form.</p>
            )}
            <ul className="crm-links">
              {c.accounts.map((a) => (
                <li key={a.id}>
                  <b>{a.role === "affiliate_tutor" ? "Affiliate tutor" : a.role} account</b>
                  <small>Since {when(a.createdAt)}</small>
                </li>
              ))}
              {c.links.map((l, i) => (
                <li key={`${l.label}-${i}`}>
                  <Link
                    className="kp-link"
                    href={l.contactId ? `/admin/crm/${l.contactId}` : (l.href ?? "/admin/crm")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card label="Payments">
            <SectionHeader title="Payments" note={formatCents(c.paidCents)} />
            {c.payments.length === 0 ? (
              <p className="crm-hint">No purchases or subscriptions.</p>
            ) : (
              <ul className="crm-pay">
                {c.payments.map((p, i) => (
                  <li key={i}>
                    <span>
                      <b>{p.label}</b>
                      <small>
                        {when(p.at)} · {p.status}
                      </small>
                      {p.refs.map((r) => (
                        <small key={r.value} className="crm-ref">
                          {r.label}: <code>{r.value}</code>
                        </small>
                      ))}
                    </span>
                    <span
                      className="crm-pay-amt"
                      data-neg={p.cents !== null && p.cents < 0 ? "" : undefined}
                    >
                      {formatCents(p.cents)}
                      {p.cents !== null && !p.exact && <small>est.</small>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="crm-hint">
              Amounts are list prices times the payments made, from our own records. Look up the ids
              in Stripe for the exact amounts.
            </p>
          </Card>
        </div>
      </div>
    </WbPage>
  );
}
