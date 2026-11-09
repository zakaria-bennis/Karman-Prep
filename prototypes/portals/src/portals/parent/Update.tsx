import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { Pill } from "@/design-system/components/Pill";
import { Row, List } from "@/design-system/components/Row";
import { useToast } from "@/design-system/components/Toast";
import { Icon } from "@/design-system/icons";
import { band } from "@/design-system/marks/LevelMark";
import { usePlan } from "@/plans/PlanProvider";
import { fmtDate, type SkillLevel } from "@/mock";
import { Shell, useWide } from "./Shell";
import { ParentProvider, useParent, useBlock } from "./view";
import { LockedPanel } from "./LockedPanel";
import { Figures } from "./Figures";
import { MovedList } from "./MovedList";
import { weekTitle, weekRange } from "./UpdateTimeline";
import { shortDay } from "./UpcomingList";
import { WRAP_ROWS } from "./rows";
import { downloadIcs } from "./ics";
import { updatesFor, NEXT_UPDATE, type Moved } from "./mock-updates";
import { dayAndDate, isNew } from "./mock";
import { STAMP } from "./Home";

/*
 * One weekly update: "What happened this week, and what’s next?" The skills
 * that moved as the biggest block, the practice done as figures, the test
 * score, the classes or sessions (a missed class only as a flag), then what
 * comes next with its dates, so the update ends on the next step.
 */
export default function Update() {
  return (
    <ParentProvider lock="parent">
      <UpdateScreen />
    </ParentProvider>
  );
}

const toLevel = (m: Moved): SkillLevel => ({
  id: m.id,
  label: m.label,
  domain: "",
  section: "Math",
  now: m.to,
  was: m.from,
  band: band(m.to),
});

function UpdateScreen() {
  const v = useParent();
  const { plan, has } = usePlan();
  const blk = useBlock();
  const toast = useToast();
  const wide = useWide();
  const updates = updatesFor(v.student, plan, v.state);
  const wanted = v.query.get("week");
  const idx = Math.max(
    0,
    updates.findIndex((u) => u.id === wanted)
  );
  const u = updates[idx] ?? null;
  const older = updates[idx + 1];
  const newer = idx > 0 ? updates[idx - 1] : undefined;
  const nextOn = isNew(v.student) ? "2026-11-08" : NEXT_UPDATE;
  const moved = u ? [...u.up, ...u.down].map(toLevel) : [];
  const finding = blk.loading ? (
    <Skeleton.Text lines={1} width="60%" />
  ) : !u ? (
    `No update yet. The first arrives ${fmtDate(nextOn, "long")}.`
  ) : (
    `${v.student.name} answered ${u.questions} questions, ${u.up.length} ${u.up.length === 1 ? "skill" : "skills"} up` +
    (u.down.length ? `, ${u.down.length} down` : "") +
    (u.test ? `. ${u.test.name}: ${u.test.score.toLocaleString("en-US")}` : "") +
    `. Sent Sunday, ${fmtDate(u.sentOn)}.`
  );
  const primary =
    u && !blk.loading && !blk.error && has("parent")
      ? {
          label: "Add what’s next to the calendar",
          onClick: () => {
            const n = downloadIcs(u.next, `karman-${u.id}.ics`);
            toast.push({
              title: `${n} dates saved as a calendar file`,
              detail: "Open it to add them to your calendar.",
              kind: "success",
            });
          },
        }
      : null;
  const skeleton = (
    <div className="mt-2">
      <Skeleton.Row />
      <Skeleton.Row />
      <Skeleton.Row />
    </div>
  );
  const body = !u ? (
    <Panel className="p-4">
      <p className="text-body font-semibold">Nothing to read yet</p>
      <p className="text-dense text-muted">The first update lands {fmtDate(nextOn, "long")}.</p>
    </Panel>
  ) : (
    <div className="grid gap-4">
      {blk.error ? <ErrorBlock what="this update" lastGood={STAMP} onRetry={blk.retry} /> : null}
      <div className="grid items-start gap-4">
        <Panel as="section" className="px-4 pb-2 pt-4">
          <h2 className="text-section">Skills that moved</h2>
          {blk.loading ? (
            skeleton
          ) : moved.length ? (
            <MovedList items={moved} max={8} className="mt-1 [&>li:last-child]:border-b-0" />
          ) : (
            <p className="py-3 text-dense text-muted">Nothing moved this week.</p>
          )}
        </Panel>
        <div className="grid gap-4">
          <Panel as="section" className="p-4">
            <h2 className="text-section">Practice</h2>
            {blk.loading ? (
              skeleton
            ) : (
              <Figures
                className="mt-3"
                wide={wide}
                bare
                items={[
                  { label: "Questions", value: String(u.questions), lead: true },
                  { label: "Days practised", value: String(u.daysPractised), unit: "of 7" },
                  ...(u.daily10 !== null
                    ? [{ label: "Your Daily 10", value: String(u.daily10), unit: "of 7" }]
                    : []),
                ]}
              />
            )}
          </Panel>
          <Panel as="section" className="p-4">
            <h2 className="text-section">Test score</h2>
            {blk.loading ? (
              <Skeleton.Block width={96} height={28} className="mt-3" />
            ) : u.test ? (
              <p className="mt-2">
                <span className="tabular block text-kpi">
                  {u.test.score.toLocaleString("en-US")}
                </span>
                <span className="block text-dense text-muted">
                  {u.test.name}
                  {u.test.previous !== null
                    ? `, ${u.test.score - u.test.previous >= 0 ? "+" : ""}${u.test.score - u.test.previous} since the test before, ${u.test.previous.toLocaleString("en-US")}`
                    : ", the baseline"}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-dense text-muted">No full-length test this week.</p>
            )}
          </Panel>
          {u.classes ? (
            <Panel as="section" className="p-4">
              <h2 className="text-section">Live classes</h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-body">
                Live classes with David, Tuesday and Thursday.
                {u.classes.missedOn ? (
                  <Pill tone="notice">Missed {dayAndDate(u.classes.missedOn)}</Pill>
                ) : null}
              </p>
            </Panel>
          ) : null}
          {u.sessions ? (
            <Panel as="section" className="p-4">
              <h2 className="text-section">Sessions</h2>
              <p className="mt-2 text-body">
                {u.sessions.count
                  ? `${u.sessions.count} full-length review ${u.sessions.count === 1 ? "session" : "sessions"} with ${u.sessions.with}.`
                  : "No session this week."}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
      <Panel as="section" className="px-4 py-3">
        <h2 className="pt-1 text-section">What’s next</h2>
        {u.focus ? (
          <p className="pb-1 text-dense text-muted">Focus for the week: {u.focus}.</p>
        ) : null}
        <List>
          {u.next.map((n) => (
            <Row
              key={n.title + n.date}
              className={WRAP_ROWS}
              title={n.title}
              sub={
                n.due
                  ? { kind: "due", text: `Due ${shortDay(n.date)}` }
                  : { kind: "date", text: dayAndDate(n.date) }
              }
            />
          ))}
        </List>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 text-dense font-semibold">
        {older ? (
          <button
            type="button"
            onClick={() => v.go("update", { week: older.id })}
            className="inline-flex min-h-tap items-center gap-1 text-accent"
          >
            <Icon name="chevronLeft" size={20} />
            {weekRange(older)}
          </button>
        ) : (
          <span />
        )}
        {newer ? (
          <button
            type="button"
            onClick={() => v.go("update", { week: newer.id })}
            className="inline-flex min-h-tap items-center gap-1 text-accent"
          >
            {weekRange(newer)}
            <Icon name="chevronRight" size={20} />
          </button>
        ) : null}
      </div>
    </div>
  );
  return (
    <Shell
      screen="update"
      title={u ? weekTitle(u) : "Weekly update"}
      finding={finding}
      primary={primary}
      back={{ label: "All updates", to: "updates" }}
      narrow
    >
      {has("parent") ? (
        body
      ) : (
        <LockedPanel bundle="parent" onUpgrade={() => v.go("plan")}>
          {body}
        </LockedPanel>
      )}
    </Shell>
  );
}
