// ============================================================
// /admin/messages/[parentId]/[studentId] — one family's
// conversation with the team. With the assistant on: its read of
// the conversation, its draft in an editable box, Send (a person
// presses it), Redraft with an instruction, and the log of every
// draft and who sent what. Off: a plain reply box.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WbPage, WbPill } from "@/components/admin/workbench";
import { Card, Cta, SectionHeader } from "@/components/portal";
import { Thread, when } from "@/components/messages/Thread";
import { ActionMessage } from "@/components/school/SchoolShell";
import { STATE_LABEL } from "@/lib/message-assistant/model";
import { isAssistantOn, loadDrafts, loadTriage } from "@/lib/message-assistant/server";
import { familyNames, isLinkedFamily, loadFamilyThread } from "@/lib/parent/messages";
import {
  discardDraftAction,
  markHandledAction,
  redraftAction,
  sendReplyAction,
} from "../../actions";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Family messages | Karman admin" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FamilyMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ parentId: string; studentId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const [{ parentId, studentId }, { done, error }] = await Promise.all([params, searchParams]);
  if (!UUID.test(parentId) || !UUID.test(studentId)) notFound();
  if (!(await isLinkedFamily(parentId, studentId))) notFound();
  const assistant = isAssistantOn();
  const [thread, names, triage, drafts] = await Promise.all([
    loadFamilyThread(parentId, studentId),
    familyNames(parentId, studentId),
    assistant ? loadTriage() : null,
    loadDrafts(parentId, studentId),
  ]);
  const read = triage?.get(`${parentId}:${studentId}`) ?? null;
  const current = drafts.find((d) => d.status === "drafted") ?? null;
  const open = thread.filter((m) => m.from === "parent" && m.status === "open").length;
  const hidden = (
    <>
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="studentId" value={studentId} />
    </>
  );

  return (
    <WbPage
      title={`${names.parent} for ${names.student}`}
      summary={<Link href="/admin/messages">All messages</Link>}
      actions={
        open > 0 ? (
          <form action={markHandledAction}>
            {hidden}
            <button className="kp-textbtn" type="submit">
              Mark {open} handled
            </button>
          </form>
        ) : null
      }
    >
      <ActionMessage done={done} error={error} />

      {assistant && read && (
        <Card label="Assistant's read">
          <SectionHeader
            title="Where it stands"
            note={
              <WbPill tone={read.state === "needs_you" ? "warn" : "ok"}>
                {STATE_LABEL[read.state]}
              </WbPill>
            }
          />
          {read.asking && (
            <p>
              <b>Asking: </b>
              {read.asking}
            </p>
          )}
          <p className="kp-meta">{read.summary}</p>
        </Card>
      )}

      <Card label="Conversation">
        <SectionHeader title="Conversation" note={`${thread.length} messages`} />
        {thread.length ? (
          <Thread messages={thread} mine="staff" familyName={names.parent} />
        ) : (
          <p className="kp-meta">No messages yet.</p>
        )}
      </Card>

      <Card label="Reply">
        <SectionHeader
          title={current ? "Suggested reply" : "Reply"}
          note={current ? `Drafted ${when(current.createdAt)}` : undefined}
        />
        <form action={sendReplyAction} className="kp-form">
          {hidden}
          {current && <input type="hidden" name="draftId" value={current.id} />}
          <label className="kp-field">
            <span>{current ? "Edit it, then send" : `Write to ${names.parent}`}</span>
            <textarea
              name="body"
              className="kp-input kp-textarea"
              defaultValue={current?.draft ?? ""}
              maxLength={4000}
              required
            />
          </label>
          {current && /\[[^\]]+\]/.test(current.draft) && (
            <p className="kp-msg" data-tone="error">
              Fill in the parts in square brackets before you send.
            </p>
          )}
          <div className="kp-actions-row">
            <Cta type="submit">Send to {names.parent}</Cta>
            <span className="kp-meta">They see it in Messages. No email or text goes out.</span>
          </div>
        </form>
        {current && (
          <form action={discardDraftAction}>
            {hidden}
            <input type="hidden" name="draftId" value={current.id} />
            <button className="kp-textbtn" type="submit">
              Put this draft away
            </button>
          </form>
        )}
      </Card>

      {assistant && (
        <Card label="Ask the assistant">
          <SectionHeader title="Ask the assistant" />
          <form action={redraftAction} className="kp-form">
            {hidden}
            <label className="kp-field">
              <span>Tell it what to say</span>
              <input
                name="instruction"
                className="kp-input"
                maxLength={2000}
                placeholder="Say we can do Thursday at 6 instead, and the recording is in Sessions"
              />
            </label>
            <div className="kp-actions-row">
              <button className="kp-textbtn" type="submit">
                Write a new draft
              </button>
              <span className="kp-meta">It drafts only. You still press Send.</span>
            </div>
          </form>
        </Card>
      )}

      {drafts.length > 0 && (
        <Card label="Draft log">
          <details>
            <summary>
              <b>Draft log</b> <span className="kp-meta">every draft and who sent what</span>
            </summary>
            <ul className="kp-notes">
              {drafts.map((d) => (
                <li key={d.id}>
                  <div className="kp-note-head">
                    <b>
                      {d.status === "sent"
                        ? `Sent by ${d.sentBy ?? "a team member"}${d.sentBody !== d.draft ? ", edited" : ""}`
                        : d.status === "discarded"
                          ? "Put away"
                          : "Waiting"}
                    </b>
                    <span>
                      {when(d.createdAt)} · {d.model}
                      {d.instruction ? ` · asked: “${d.instruction}”` : ""}
                    </span>
                  </div>
                  <p className="kp-note-body">{d.status === "sent" ? d.sentBody : d.draft}</p>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}
    </WbPage>
  );
}
