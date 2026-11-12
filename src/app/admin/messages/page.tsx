// ============================================================
// /admin/messages — the team inbox (founder, 2026-11-12): every
// family that has written from the parent portal's Messages.
// With the assistant on, each family is sorted into Needs you /
// Handled / FYI with a short summary of what they're asking; the
// assistant only drafts. Off, it is a plain inbox by open count.
// ============================================================

import type { Metadata } from "next";
import { WbEmpty, WbPage, WbPill, WbStats } from "@/components/admin/workbench";
import { Card, Row, SectionHeader } from "@/components/portal";
import { STATE_LABEL, TRIAGE_STATES, type TriageState } from "@/lib/message-assistant/model";
import { isAssistantOn, loadTriage } from "@/lib/message-assistant/server";
import { KIND_LABEL } from "@/lib/parent/messages-model";
import { listFamilies } from "@/lib/parent/messages";

export const metadata: Metadata = { title: "Messages | Karman admin" };
export const dynamic = "force-dynamic";

const TONE: Record<TriageState, "warn" | "ok" | "info"> = {
  needs_you: "warn",
  handled: "ok",
  fyi: "info",
};

function ago(iso: string, now: Date): string {
  const mins = Math.round((now.getTime() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function preview(text: string): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > 140 ? `${one.slice(0, 137)}…` : one;
}

export default async function AdminMessagesPage() {
  const now = new Date();
  const assistant = isAssistantOn();
  const [families, triage] = await Promise.all([listFamilies(), assistant ? loadTriage() : null]);

  const withState = families.map((f) => {
    const t = triage?.get(`${f.parentUserId}:${f.studentUserId}`) ?? null;
    // A family that wrote after the last read waits on a person until the assistant reads it.
    const stale = !t || t.updatedAt < f.lastAt;
    const state: TriageState = stale ? (f.open > 0 ? "needs_you" : "handled") : t.state;
    return { ...f, state, summary: stale ? null : t.summary, asking: stale ? null : t.asking };
  });
  const open = families.reduce((n, f) => n + f.open, 0);
  const waiting = withState.filter((f) => f.state === "needs_you").length;

  const row = (f: (typeof withState)[number]) => (
    <Row
      key={`${f.parentUserId}:${f.studentUserId}`}
      href={`/admin/messages/${f.parentUserId}/${f.studentUserId}`}
      title={
        <>
          {f.parentName} <span className="kp-meta">for {f.studentName}</span>
        </>
      }
      sub={
        f.summary ? (
          <>
            {f.asking ? <b>{f.asking}. </b> : null}
            {f.summary}
          </>
        ) : (
          <>
            {f.lastFrom === "parent" ? "" : "You: "}
            {f.lastKind !== "message" ? `${KIND_LABEL[f.lastKind]}. ` : ""}
            {preview(f.lastBody)}
          </>
        )
      }
      right={
        <>
          {f.open > 0 && <WbPill tone="warn">{f.open} open</WbPill>} {ago(f.lastAt, now)}
        </>
      }
    />
  );

  return (
    <WbPage
      title="Messages"
      summary={
        assistant
          ? "Families write here from the parent portal. The assistant sorts each conversation and drafts a reply; nothing goes to a family until you press Send."
          : "Families write here from the parent portal. Nothing goes to a family until you press Send."
      }
    >
      <WbStats
        items={[
          { label: "Families", value: families.length },
          { label: "Need you", value: waiting },
          { label: "Open messages", value: open },
        ]}
      />
      {families.length === 0 ? (
        <WbEmpty title="No messages yet">
          When a parent writes from Messages, or asks to miss or move a session, it shows here.
        </WbEmpty>
      ) : (
        TRIAGE_STATES.map((state) => {
          const rows = withState.filter((f) => f.state === state);
          if (!rows.length) return null;
          return (
            <Card key={state} label={STATE_LABEL[state]}>
              <SectionHeader
                title={STATE_LABEL[state]}
                note={<WbPill tone={TONE[state]}>{rows.length}</WbPill>}
              />
              {rows.map(row)}
            </Card>
          );
        })
      )}
      {!assistant && (
        <p className="kp-meta">
          The message assistant is off. It turns on with MESSAGE_ASSISTANT=on and an Anthropic API
          key on the server.
        </p>
      )}
    </WbPage>
  );
}
