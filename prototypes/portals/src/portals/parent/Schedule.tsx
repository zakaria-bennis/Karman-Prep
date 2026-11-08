import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { WeekCalendar, type EventKind } from "@/design-system/components/Calendar";
import { useToast } from "@/design-system/components/Toast";
import { usePlan } from "@/plans/PlanProvider";
import { BUNDLES, type BundleId } from "@/plans/plans";
import { EVENTS, WEEK_DATES, TODAY_INDEX, fmtDate, daysUntil } from "@/mock";
import { Shell, useWide } from "./Shell";
import { cn } from "@/design-system/cn";
import { ParentProvider, useParent, useBlock } from "./view";
import { LockedPanel } from "./LockedPanel";
import { UpcomingList, relative } from "./UpcomingList";
import { upcomingFor, lockedLiveBundle, LOCKED_SAMPLE } from "./mock-schedule";
import { isNew } from "./mock";
import { downloadIcs } from "./ics";
import { STAMP } from "./Home";

/*
 * Schedule: "When is the next thing, and when is the SAT?" Everything ahead
 * with its date, this week’s live classes, sessions and tests on the week
 * calendar, and at most one locked panel showing what the next plan adds.
 * One action: add the dates to the family calendar.
 */
const NEEDS: Record<EventKind, BundleId> = {
  class: "liveClasses",
  session: "oneToOne",
  workshop: "workshops",
  test: "fullLength",
};

export default function Schedule() {
  return (
    <ParentProvider lock="workshops">
      <ScheduleScreen />
    </ParentProvider>
  );
}

function ScheduleScreen() {
  const v = useParent();
  const { plan, has } = usePlan();
  const blk = useBlock();
  const toast = useToast();
  const wide = useWide();
  const items = upcomingFor(v.student, plan, v.state);
  const first = items.find((i) => i.kind !== "update" && i.kind !== "sat");
  const sat = items.find((i) => i.kind === "sat") ?? items[items.length - 1];
  const quiet = v.empty || isNew(v.student);
  const events = quiet ? [] : (EVENTS[v.student.id] ?? []).filter((e) => has(NEEDS[e.kind]));
  const lockBundle = lockedLiveBundle(plan);
  const finding = blk.loading ? (
    <Skeleton.Text lines={1} width="60%" />
  ) : (
    (first
      ? `${first.who ? `${first.title} with ${first.who}` : first.title} ${relative(first.date).toLowerCase()}${first.time ? `, ${first.time}` : ""}. `
      : "") + `The SAT is ${fmtDate(sat.date, "long")}, in ${daysUntil(sat.date)} days.`
  );
  const primary =
    blk.loading || blk.error
      ? null
      : {
          label: "Add to calendar",
          onClick: () => {
            const n = downloadIcs(items, `karman-${v.student.id}-schedule.ics`);
            toast.push({
              title: `${n} dates saved as a calendar file`,
              detail: "Open it to add them to your calendar.",
              kind: "success",
            });
          },
        };
  return (
    <Shell screen="schedule" title="Schedule" finding={finding} primary={primary}>
      <div className={cn("grid items-start gap-4", wide && "grid-cols-2")}>
        <div className="grid gap-4">
          <Panel as="section" className="px-4 py-3">
            <h2 className="pt-1 text-section">Coming up</h2>
            {blk.loading ? (
              <div className="mt-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton.Row key={i} sub />
                ))}
              </div>
            ) : blk.error ? (
              <ErrorBlock
                what="the schedule"
                lastGood={STAMP}
                onRetry={blk.retry}
                className="my-2"
              />
            ) : (
              <UpcomingList items={items} max={8} className="mt-1" />
            )}
          </Panel>
          {lockBundle ? (
            <LockedPanel bundle={lockBundle} onUpgrade={() => v.go("plan")}>
              <Panel as="section" className="px-4 py-3">
                <h2 className="pt-1 text-section">{BUNDLES[lockBundle].name}</h2>
                <UpcomingList items={LOCKED_SAMPLE[lockBundle] ?? []} className="mt-1" />
              </Panel>
            </LockedPanel>
          ) : null}
        </div>
        <div className="grid gap-4">
          {events.length && !blk.loading && !blk.error ? (
            <Panel as="section" className="p-4">
              <h2 className="text-section">This week</h2>
              <WeekCalendar
                className="mt-3"
                events={events}
                dates={WEEK_DATES}
                today={TODAY_INDEX}
                from={9}
                to={21}
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
