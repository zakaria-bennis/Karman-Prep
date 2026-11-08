import { useEffect, useRef } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useConfetti } from "@/design-system/components/Confetti";
import { useToast } from "@/design-system/components/Toast";
import { LevelMark, BANDS } from "@/design-system/marks";
import { TODAY, addDays, fmtDate } from "@/mock";
import { ME, notesFor, LAST_SESSION, type TutorStudent, hour } from "../mock";
import {
  IN_PROGRESS,
  LATEST,
  lateMisses,
  missCount,
  missesFor,
  refLabel,
  type MissGroup,
} from "../mock-tests";
import { assignmentsFor, doneCount } from "../mock-work";
import { useStore, toggleCovered } from "../store";
import { CheckItem, ChecklistHead } from "../components/Checklist";
import { Timeline } from "../components/Timeline";
import { Block, Columns, clock, dayDate } from "./common";
import { goScreen } from "../nav";
import type { TutorData } from "../data";

/**
 * The 1:1 briefing: every miss on the latest full-length grouped by skill,
 * each a checklist item the tutor ticks during the session, with the
 * student's level on that skill, the booking and the last sessions' notes.
 * Peak-end: ticking the last item turns the screen's action into the parent
 * update. Tesler: the list is built from the test, the tutor adds nothing.
 */
export interface BriefingItem {
  id: string;
  label: string;
  detail: string;
  band?: 0 | 1 | 2 | 3 | 4;
}

export function briefingItems(s: TutorStudent | null, groups: MissGroup[]): BriefingItem[] {
  if (!s || !groups.length) return [];
  const items: BriefingItem[] = groups.map((g) => ({
    id: g.skill.id,
    label: g.skill.label,
    detail: `${g.count} missed, ${BANDS[g.level.band]} ${g.level.now}: ${g.refs.map(refLabel).join(", ")}`,
    band: g.level.band,
  }));
  const late = lateMisses(groups);
  if (late >= 2)
    items.push({
      id: "pacing",
      label: "Pacing",
      detail: `${late} of ${missCount(groups)} misses were in the last five questions of a module`,
    });
  const hw = assignmentsFor(s.id).filter((a) => a.due >= TODAY)[0];
  items.push({
    id: "homework",
    label: "Set this week's homework",
    detail: hw ? `${hw.title}, due ${fmtDate(hw.due)}` : "Nothing assigned yet",
  });
  return items;
}

export function Briefing({ s, data }: { s: TutorStudent; data: TutorData }) {
  const { covered: all } = useStore();
  const confetti = useConfetti();
  const toast = useToast();
  const head = useRef<HTMLDivElement>(null);
  const groups = missesFor(s.id);
  const items = briefingItems(s, groups);
  const covered = all[s.id] ?? [];
  const done = items.filter((i) => covered.includes(i.id)).length;
  const complete = items.length > 0 && done === items.length;
  const was = useRef(complete);
  useEffect(() => {
    if (complete && !was.current && head.current) confetti.fire("level", head.current);
    was.current = complete;
  }, [complete, confetti]);
  const latest = LATEST[s.id];
  const running = IN_PROGRESS[s.id];
  const booking = data.nextSession(s.id);
  const notes = notesFor(s.id).slice(0, 3);
  const hw = assignmentsFor(s.id).filter((a) => a.due >= addDays(TODAY, -7));

  const session = (
    <Panel className="px-4 py-3">
      <h2 className="text-section">Next session</h2>
      {booking ? (
        <p className="tabular mt-1 text-body">
          {dayDate(booking.date)}, {hour(booking.start)} to {hour(booking.end)} ET
          <span className="text-muted"> · Zoom opens {clock(booking.start, -5)}</span>
        </p>
      ) : (
        <p className="mt-1 text-body text-negative">No session booked.</p>
      )}
      <p className="text-dense text-muted">
        {LAST_SESSION[s.id] && data.hasSessions
          ? `Last session ${fmtDate(LAST_SESSION[s.id])}.`
          : "No sessions yet."}
        {s.hoursTotal ? ` ${s.hoursTotal - (s.hoursUsed ?? 0)} of ${s.hoursTotal} hours left.` : ""}
      </p>
    </Panel>
  );

  const checklist = (
    <Block
      title={
        latest
          ? `Test ${latest.number}, ${fmtDate(latest.date)}: ${latest.total.toLocaleString("en-US")}`
          : "Latest full-length test"
      }
      loading={data.loading}
      error={data.error}
      what="the test's misses"
      onRetry={() =>
        toast.push({
          title: "Still can't load the test",
          detail: "Last updated 9:14 am.",
          kind: "error",
        })
      }
      fallback={
        <div className="grid gap-2 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton.Block width={24} height={24} />
              <Skeleton.Text lines={2} width="70%" />
            </div>
          ))}
        </div>
      }
    >
      {latest ? (
        <div ref={head} className="grid gap-1">
          <ChecklistHead
            title={`${missCount(groups)} misses in ${groups.length} skills`}
            done={done}
            total={items.length}
          />
          {running ? (
            <p className="text-dense text-muted">
              Test {running.number} started at {hour(running.start)} today; this list refreshes when
              it is scored.
            </p>
          ) : null}
          <div className="mt-1 divide-y divide-line">
            {items.map((it) => (
              <CheckItem
                key={it.id}
                id={it.id}
                checked={covered.includes(it.id)}
                onToggle={() => toggleCovered(s.id, it.id)}
                label={it.label}
                detail={it.detail}
                leading={
                  it.band !== undefined ? <LevelMark level={it.band} size={20} /> : undefined
                }
              />
            ))}
          </div>
        </div>
      ) : (
        <Empty
          title="No full-length test yet"
          detail={`The briefing fills in after ${s.name}'s first full-length test. The diagnostic is due ${fmtDate(addDays(TODAY, 7))}.`}
        />
      )}
    </Block>
  );

  return (
    <Columns
      main={
        <>
          {session}
          {checklist}
        </>
      }
      side={
        <>
          <Block
            title="Last sessions"
            loading={data.loading}
            aside={
              notes.length ? (
                <button
                  type="button"
                  onClick={() => goScreen("notes", { id: s.id })}
                  className="min-h-tap font-semibold text-accent"
                >
                  All notes
                </button>
              ) : undefined
            }
          >
            <Timeline
              entries={notes.map((n) => ({
                id: n.id,
                date: n.date,
                title: `Session ${n.session}`,
                text: n.text,
                initial: ME.initials,
                hue: ME.hue,
                mark: n.sent ? `Update sent to ${s.parent.name}` : undefined,
              }))}
              emptyText="No session notes yet. The first note is written after the first session."
            />
          </Block>
          <Block title="Homework" loading={data.loading} padded={false}>
            <div className="px-4 pb-1">
              {hw.length ? (
                <List>
                  {hw.map((a) => {
                    const r = a.results.find((x) => x.studentId === s.id)!;
                    return (
                      <Row
                        key={a.id}
                        title={a.title}
                        sub={{
                          kind: "due",
                          text: `Due ${fmtDate(a.due)}, ${r.done ? `${r.right} of ${a.questions} right` : r.answered ? `${r.answered} of ${a.questions} answered` : "not started"}`,
                          tone: !r.done && a.due < TODAY ? "negative" : "muted",
                        }}
                        trailing={
                          a.to.kind === "cohort"
                            ? `${doneCount(a)} of ${a.results.length}`
                            : undefined
                        }
                        onPress={() => goScreen("homework", { id: s.id })}
                      />
                    );
                  })}
                </List>
              ) : (
                <p className="py-3 text-dense text-muted">Nothing assigned this week.</p>
              )}
            </div>
          </Block>
        </>
      }
    />
  );
}
