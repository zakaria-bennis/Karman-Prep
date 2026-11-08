import { useEffect, useRef, useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { useConfetti } from "@/design-system/components/Confetti";
import { useToast } from "@/design-system/components/Toast";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { LevelMark, BANDS } from "@/design-system/marks";
import { NOW, TODAY, fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useSelectedStudent, useTutorData } from "../data";
import { useHashParam } from "../nav";
import { ME, NEXT_CLASS, cohortById, studentsOf, tutorName, SENT_UPDATES } from "../mock";
import { LATEST, missesFor, classFocus } from "../mock-tests";
import { assignmentsFor } from "../mock-work";
import { markSent, useStore } from "../store";
import { DraftCard, GRACE_MS, type DraftState } from "../components/DraftCard";
import { buildClassDraft, buildDraft } from "../draft";
import { briefingItems } from "./Briefing";
import { Block, Columns, clock, dayDate } from "./common";

/**
 * The post-session update to parents: drafted from the briefing's covered
 * items, edited, sent with a five-second undo, and shown as the parent will
 * see it (skills first, rule 57). Peak-end: the sent stamp is the last thing
 * the tutor sees after a session, with a small pop at the card.
 */
export default function Update() {
  const data = useTutorData();
  const id = useHashParam("id");
  const cohort = id ? cohortById(id) : null;
  const selected = useSelectedStudent(data);
  const s = cohort ? null : selected;
  const { covered, sent } = useStore();
  const confetti = useConfetti();
  const toast = useToast();
  const card = useRef<HTMLDivElement>(null);
  const groups = s ? missesFor(s.id) : [];
  const items = s ? briefingItems(s, groups) : [];
  const done = s ? items.filter((i) => (covered[s.id] ?? []).includes(i.id)) : [];
  const next = s ? data.nextSession(s.id) : null;
  const hw = s ? assignmentsFor(s.id).filter((a) => a.due >= TODAY)[0] : undefined;
  const focus = cohort ? classFocus(cohort.id).slice(0, 3) : [];
  const classCovered = cohort
    ? focus.filter((f) => (covered[cohort.id] ?? []).includes(f.skill.id)).map((f) => f.skill.label)
    : [];
  const draft = cohort
    ? buildClassDraft({
        cohortName: cohort.name,
        tutor: tutorName(cohort.tutor),
        covered: classCovered.length ? classCovered : focus.map((f) => f.skill.label),
        classDate: NEXT_CLASS[cohort.id] ?? TODAY,
        nextDate: "2026-11-04",
      })
    : s
      ? buildDraft({
          s,
          covered: done.length ? done : items,
          latest: LATEST[s.id],
          sessionDate: next?.date ?? TODAY,
          next,
          hw,
        })
      : null;
  const [body, setBody] = useState(draft?.body ?? "");
  const [state, setState] = useState<DraftState>("review");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const to = cohort ? `${studentsOf(cohort.id).length} parents` : (s?.parent.name ?? "");
  const send = () => {
    setState("sending");
    timer.current = setTimeout(() => {
      setState("sent");
      if (s) markSent(s.id, s.parent.name, TODAY);
      if (card.current) confetti.fire("level", card.current);
    }, GRACE_MS);
  };
  const undo = () => {
    if (timer.current) clearTimeout(timer.current);
    setState("review");
  };
  const history = s
    ? [...(sent[s.id] ?? []), ...(data.hasSessions ? (SENT_UPDATES[s.id] ?? []) : [])]
    : [];
  const finding = !draft
    ? "Updates are drafted from a session's briefing."
    : cohort
      ? `Drafted from the class plan. ${to} see it in their Karman accounts and by email.`
      : `Drafted from the ${done.length ? `${done.length} items you covered` : `${items.length} items on the briefing`}. ${to} sees it in ${s!.parent.id === "dana" ? "her" : "their"} Karman account and by email.`;

  return (
    <TutorShell screen="update" title="Parent update" finding={finding}>
      {!draft ? (
        <Empty
          title="No session to write up"
          detail="Open a student's briefing first; the update is drafted from what you covered."
        />
      ) : (
        <Columns
          main={
            <>
              {data.loading ? (
                <Panel
                  as="article"
                  className="grid gap-3 p-4"
                  role="status"
                  aria-busy="true"
                  aria-label="Drafting the update"
                >
                  <Skeleton.Text lines={1} width="50%" size={16} />
                  <Skeleton.Text lines={1} width="30%" />
                  <Skeleton.Text lines={7} />
                </Panel>
              ) : data.error ? (
                <Panel as="article" className="p-4">
                  <ErrorBlock
                    what="the session's briefing"
                    lastGood="9:14 am"
                    onRetry={() =>
                      toast.push({
                        title: "Still can't load the briefing",
                        detail: "Last updated 9:14 am.",
                        kind: "error",
                      })
                    }
                  />
                </Panel>
              ) : null}
              <div ref={card} className={data.loading || data.error ? "hidden" : undefined}>
                <DraftCard
                  subject={draft.subject}
                  to={to}
                  body={body}
                  onBody={setBody}
                  state={state}
                  onSend={send}
                  onUndo={undo}
                  sentLabel={`Sent to ${to} at ${clock(NOW.getHours() + NOW.getMinutes() / 60)}. ${cohort ? "They" : to} will see it tonight.`}
                  footer={
                    <span className="text-dense text-muted">Edit anything before it goes.</span>
                  }
                />
              </div>
              {s && history.length ? (
                <Block
                  title="Sent updates"
                  padded={false}
                  loading={data.loading}
                  aside={`${history.length}`}
                >
                  <div className="px-4 pb-1">
                    <List>
                      {history.slice(0, 4).map((u, i) => (
                        <Row
                          key={`${u.date}-${i}`}
                          title={`To ${u.to}`}
                          sub={{ kind: "date", text: `Sent ${fmtDate(u.date)}` }}
                        />
                      ))}
                    </List>
                  </div>
                </Block>
              ) : null}
            </>
          }
          side={
            <Panel as="section" className="px-4 py-3">
              <h2 className="text-section">What {cohort ? "the parents" : to} will see</h2>
              {data.loading ? (
                <div
                  className="mt-2 grid gap-3 rounded-card border border-line bg-surface p-3"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading the preview"
                >
                  <Skeleton.Text lines={1} width="40%" />
                  <Skeleton.Text lines={5} />
                </div>
              ) : (
                <div className="mt-2 rounded-card border border-line bg-surface p-3">
                  <p className="text-dense text-muted">
                    Update from {cohort ? tutorName(cohort.tutor) : ME.name} ·{" "}
                    {dayDate(next?.date ?? TODAY)}
                  </p>
                  <p className="mt-2 text-body font-semibold">
                    {cohort ? "Skills the class worked on" : "Skills covered"}
                  </p>
                  <ul className="mt-1 grid gap-1.5">
                    {(cohort
                      ? focus.map((f) => ({
                          id: f.skill.id,
                          label: f.skill.label,
                          band: undefined as 0 | 1 | 2 | 3 | 4 | undefined,
                        }))
                      : (done.length ? done : items).filter((i) => i.band !== undefined)
                    ).map((i) => (
                      <li key={i.id} className="flex items-center gap-2 text-dense">
                        {i.band !== undefined ? <LevelMark level={i.band} size={20} /> : null}
                        <span className="min-w-0 flex-1 truncate">{i.label}</span>
                        {i.band !== undefined ? (
                          <span className="shrink-0 text-muted">{BANDS[i.band]}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-dense">
                    <span className="text-muted">Next session: </span>
                    {next
                      ? `${dayDate(next.date)}, ${clock(next.start)} ET`
                      : cohort
                        ? "Wednesday, 7:00 pm ET"
                        : "not booked yet"}
                  </p>
                  {hw ? (
                    <p className="text-dense">
                      <span className="text-muted">Homework: </span>
                      {hw.title}, due {fmtDate(hw.due)}
                    </p>
                  ) : null}
                  <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-dense text-text/90">
                    {body}
                  </p>
                </div>
              )}
            </Panel>
          }
        />
      )}
    </TutorShell>
  );
}
