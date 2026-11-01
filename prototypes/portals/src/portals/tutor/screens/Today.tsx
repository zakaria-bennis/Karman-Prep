import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useToast } from "@/design-system/components/Toast";
import { Icon } from "@/design-system/icons";
import { TODAY, addDays, fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { goScreen } from "../nav";
import { PLANS } from "@/plans/plans";
import { Block, COLUMNS_MIN, Columns, ListHead, dayDate, score, shortDay } from "./common";
import { Initials } from "../components/Initials";
import { ASSIGNMENTS, coveredStudents, doneCount, isSlipping } from "../mock-work";
import { IN_PROGRESS, LATEST, missCount, missesFor } from "../mock-tests";
import { useStore } from "../store";
import { ME, hour } from "../mock";

/**
 * Today. The question: what is next, and am I ready for it? The biggest block
 * is the next session with its briefing in one line; the finding under the
 * title says what runs this morning. Hick: one next step, Open the briefing.
 */
export default function Today() {
  const data = useTutorData();
  const toast = useToast();
  const { entered } = useStore();
  const next = data.privates
    .map((s) => ({ s, b: data.nextSession(s.id) }))
    .filter((x) => x.b)
    .sort((a, b) => a.b!.date.localeCompare(b.b!.date))[0];
  const groups = next ? missesFor(next.s.id) : [];
  const latest = next ? LATEST[next.s.id] : null;
  const running = next ? IN_PROGRESS[next.s.id] : null;
  const waitingNow = data.queue.filter((r) => r.status === "waiting" && !entered[r.id]);
  const slipping =
    data.empty || data.firstDay ? [] : coveredStudents().filter((s) => isSlipping(s.id));
  const due =
    data.empty || data.firstDay
      ? []
      : ASSIGNMENTS.filter((a) => a.due >= TODAY).sort((a, b) => a.due.localeCompare(b.due));
  // Saturday, Sunday and Monday only, so the block's title is true of every row.
  const week = [
    ...data.weeks.this.events.filter((e) => e.day >= 5),
    ...data.weeks.next.events.filter((e) => e.day <= 0).map((e) => ({ ...e, day: e.day + 7 })),
  ].sort((a, b) => a.day - b.day || a.start - b.start);
  const dateOf = (day: number) => addDays(data.weeks.this.start, day);
  // Phone rows use the short weekday so the time is never cut off (rule 55).
  const label = (iso: string, phone: boolean) =>
    iso === TODAY
      ? "Today"
      : iso === addDays(TODAY, 1)
        ? "Tomorrow"
        : phone
          ? shortDay(iso)
          : dayDate(iso);
  const first = data.firstDay ? data.privates[0] : null;

  const finding = data.empty
    ? "Nothing is scheduled. Students are assigned when a family enrolls or a cohort opens."
    : data.firstDay
      ? `${first!.name} was assigned to you this morning. No session is booked yet and the diagnostic is due ${fmtDate(addDays(TODAY, 7))}.`
      : next
        ? `Two tests run this morning. ${next.s.name}'s briefing for ${dayDate(next.b!.date)} is ready: ${missCount(groups)} misses on test ${latest!.number}.`
        : "No session is booked.";
  const primary = data.empty ? null : data.firstDay ? (
    <GlassButton variant="primary" onClick={() => goScreen("student", { id: first!.id })}>
      Open {first!.name}
    </GlassButton>
  ) : next ? (
    <GlassButton variant="primary" onClick={() => goScreen("student", { id: next.s.id })}>
      Open the briefing
    </GlassButton>
  ) : null;

  const nextBlock = (
    <Block
      title="Next session"
      loading={data.loading}
      error={data.error}
      what="the next session"
      onRetry={() =>
        toast.push({
          title: "Still can't reach the schedule",
          detail: "Last updated 9:14 am.",
          kind: "error",
        })
      }
      fallback={
        <div className="grid gap-3 py-2">
          <Skeleton.Text lines={1} width="55%" size={20} />
          <Skeleton.Text lines={2} />
        </div>
      }
    >
      {next ? (
        <div className="grid gap-2 py-1">
          <div className="flex items-center gap-3">
            <Initials initial={next.s.initials} hue={next.s.hue} size={40} />
            <div className="min-w-0">
              <p className="text-body font-semibold">{next.s.name}</p>
              <p className="tabular text-dense text-muted">
                {dayDate(next.b!.date)}, {hour(next.b!.start)} to {hour(next.b!.end)} ET
              </p>
            </div>
          </div>
          <p className="text-body">
            <span className="tabular font-semibold">{missCount(groups)} misses</span> on test{" "}
            {latest!.number} ({latest!.total.toLocaleString("en-US")}), in {groups.length} skills.
            {running
              ? ` Test ${running.number} started at ${hour(running.start)}; the briefing refreshes when it is scored.`
              : ""}
          </p>
        </div>
      ) : first ? (
        <Empty
          title={`${first.name}, ${PLANS[first.plan].name}`}
          detail="No session booked. Students book their own next session from the hours you open."
        />
      ) : (
        <Empty
          title="No students yet"
          detail="Students are assigned when a family enrolls or a cohort opens. Open your hours so they can book."
          action={
            <GlassButton
              onClick={() => toast.push({ title: "Cal.com opens in a new tab in the app" })}
            >
              Open Cal.com
            </GlassButton>
          }
        />
      )}
    </Block>
  );
  const weekBlock = (phone: boolean) => (
    <Block title="This weekend and Monday" loading={data.loading} padded={false}>
      <div className="px-4 pb-1">
        {week.length ? (
          <List>
            {week.map((e) => (
              <Row
                key={e.id}
                title={e.title}
                sub={{
                  kind: "date",
                  text: `${label(dateOf(e.day), phone)}, ${hour(e.start)} to ${hour(e.end)}${e.who && e.who !== ME.name ? `, ${e.who}` : ""}`,
                }}
                onPress={() => goScreen("schedule")}
              />
            ))}
          </List>
        ) : (
          <p className="py-3 text-dense text-muted">Nothing scheduled.</p>
        )}
      </div>
    </Block>
  );
  const waitingBlock = (
    <Block title="Waiting on you" loading={data.loading} padded={false}>
      <div className="px-4 pb-1">
        <List>
          <Row
            title="Score reports"
            sub={
              waitingNow.length
                ? { kind: "state", text: `${waitingNow.length} waiting for a reader` }
                : { kind: "state", text: "None waiting" }
            }
            leading={<Icon name="upload" size={20} />}
            onPress={() => goScreen("queue")}
          />
          {due[0] ? (
            <Row
              title={due[0].title}
              sub={{
                kind: "due",
                text: `Due ${fmtDate(due[0].due)}, ${due[0].results.length > 1 ? `${doneCount(due[0])} of ${due[0].results.length} done` : doneCount(due[0]) ? "done" : "not started"}`,
              }}
              leading={<Icon name="book" size={20} />}
              onPress={() => goScreen("homework")}
            />
          ) : null}
          <Row
            title="Guarantee"
            sub={
              slipping.length
                ? {
                    kind: "state",
                    text: `${slipping.map((s) => s.name).join(" and ")} ${slipping.length === 1 ? "is" : "are"} slipping`,
                    tone: "negative",
                  }
                : {
                    kind: "state",
                    text:
                      data.empty || data.firstDay
                        ? "No covered students yet"
                        : "Everyone is on track",
                  }
            }
            leading={<Icon name={slipping.length ? "alert" : "check"} size={20} />}
            onPress={() => goScreen("guarantee")}
          />
        </List>
      </div>
    </Block>
  );
  const studentsBlock = (phone: boolean) => (
    <Block
      title="Students"
      loading={data.loading}
      padded={false}
      aside={
        data.students.length > data.privates.length ? (
          <button
            type="button"
            onClick={() => goScreen("students")}
            className="min-h-tap font-semibold text-accent"
          >
            View all {data.students.length}
          </button>
        ) : data.students.length ? (
          `${data.students.length}`
        ) : undefined
      }
    >
      <div className="px-4 pb-1">
        {data.privates.length ? (
          <List>
            <ListHead figure="Predicted" />
            {data.privates.map((s) => {
              const b = data.nextSession(s.id);
              return (
                <Row
                  key={s.id}
                  title={s.name}
                  sub={
                    b
                      ? {
                          kind: "date",
                          text: `${phone ? "" : "Session "}${label(b.date, phone)}, ${hour(b.start)}`,
                        }
                      : { kind: "state", text: "No session booked", tone: "negative" }
                  }
                  leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                  trailing={score(s.predicted)}
                  onPress={() => goScreen("student", { id: s.id })}
                />
              );
            })}
          </List>
        ) : (
          <p className="py-3 text-dense text-muted">No students assigned yet.</p>
        )}
      </div>
    </Block>
  );

  return (
    <TutorShell screen="today" title="Today" finding={finding} primary={primary}>
      {({ width, desktop, phone }) =>
        width >= COLUMNS_MIN ? (
          <Columns
            main={
              <>
                {nextBlock}
                {weekBlock(phone)}
              </>
            }
            side={
              <>
                {waitingBlock}
                {studentsBlock(phone)}
              </>
            }
          />
        ) : (
          // One column: the blocks with something to act on (the queue, the slipping flag) come before the week's list.
          <div className={desktop ? "grid gap-6" : "grid gap-5"}>
            {nextBlock}
            {waitingBlock}
            {weekBlock(phone)}
            {studentsBlock(phone)}
          </div>
        )
      }
    </TutorShell>
  );
}
