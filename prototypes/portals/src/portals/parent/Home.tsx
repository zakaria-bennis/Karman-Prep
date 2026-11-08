import { useMemo } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { CountUp } from "@/design-system/components/CountUp";
import { Pill } from "@/design-system/components/Pill";
import { BANDS, band } from "@/design-system/marks/LevelMark";
import { usePlan } from "@/plans/PlanProvider";
import { BUNDLES, PLANS } from "@/plans/plans";
import { fmtDate } from "@/mock";
import { cn } from "@/design-system/cn";
import { Shell, useWide } from "./Shell";
import { ParentProvider, useParent, useBlock } from "./view";
import { LockedPanel } from "./LockedPanel";
import { Figures, type Figure } from "./Figures";
import { BandBar, SectionBars } from "./BandBar";
import { MovedList } from "./MovedList";
import { WeekStrip } from "./WeekStrip";
import { UpcomingList } from "./UpcomingList";
import { FirstDayList } from "./FirstDayList";
import {
  levelsOf,
  bandCounts,
  movedThisWeek,
  weekFor,
  firstDayList,
  isNew,
  dayAndDate,
  WEEK_LABELS,
  TODAY_INDEX,
} from "./mock";
import { updatesFor, questionsAnswered } from "./mock-updates";
import { upcomingFor } from "./mock-schedule";

/*
 * Progress: the parent’s one question is "Is my child getting better, and
 * what’s next?" The finding answers it under the title; the lead figure is
 * the week’s questions answered (rule 57); the biggest block is the skills
 * by level; then the week’s days and what comes next with its dates. One
 * action: read the latest update. On a plan without the parent bundle the
 * whole page stays readable under one lock line with one upgrade action.
 */
export const STAMP = "Saturday, 9:14 am";

export default function Home() {
  return (
    <ParentProvider lock="parent">
      <HomeScreen />
    </ParentProvider>
  );
}

function HomeScreen() {
  const v = useParent();
  const { plan, has, upgradeFor } = usePlan();
  const blk = useBlock();
  const wide = useWide();
  const s = v.student;
  const levels = useMemo(() => levelsOf(s, v.state), [s, v.state]);
  const counts = bandCounts(levels);
  const moved = movedThisWeek(levels);
  const ups = moved.filter((m) => m.now > m.was);
  const downs = moved.length - ups.length;
  const promoted = ups.find((m) => band(m.was) !== m.band);
  const mastered = counts.find((c) => c.band === 4)?.count ?? 0;
  const week = weekFor(s, plan, v.state);
  const total = questionsAnswered(s, plan, v.state);
  const updates = updatesFor(s, plan, v.state);
  const upcoming = upcomingFor(s, plan, v.state).filter((i) => i.kind !== "update");
  const lockedOut = !has("parent");
  const gate = upgradeFor("parent");
  const gatePlan = gate ? PLANS[gate] : null;
  const testGate = upgradeFor("fullLength");
  const newToday = isNew(s);
  const missed = week.classes?.missedOn ?? null;
  const predicted = v.empty ? null : s.predicted;
  const baseline = v.empty ? null : s.baseline;

  const finding = blk.loading ? (
    <Skeleton.Text lines={1} width="70%" />
  ) : lockedOut && gatePlan ? (
    `${s.name} is on ${PLANS[plan].name}. ${BUNDLES.parent.name} come with ${gatePlan.name}, ${gatePlan.priceLabel}.`
  ) : newToday ? (
    `${s.name} joined today. Here is what will appear, and when.`
  ) : v.empty ? (
    `Nothing yet. ${s.name} hasn’t practised since joining on ${fmtDate(s.since, "long")}.`
  ) : blk.error ? (
    `This week couldn’t load. Showing ${STAMP}.`
  ) : (
    `${s.name} answered ${week.total} questions this week, ${ups.length} ${ups.length === 1 ? "skill" : "skills"} up.` +
    (promoted ? ` ${promoted.label} is now ${BANDS[promoted.band].toLowerCase()}.` : "") +
    (missed ? ` Missed the live class on ${dayAndDate(missed)}.` : "")
  );

  const primary =
    lockedOut && gatePlan
      ? { label: `See ${gatePlan.name}`, onClick: () => v.go("plan") }
      : !newToday && !v.empty && updates.length && !blk.loading
        ? { label: "Read the latest update", onClick: () => v.go("update") }
        : null;

  const bar = (w: number, h: number) => <Skeleton.Block width={w} height={h} />;
  const figures: Figure[] = [
    {
      label: "Questions this week",
      lead: true,
      value: blk.loading ? bar(88, 36) : <CountUp to={week.total} />,
      delta: blk.loading
        ? undefined
        : newToday
          ? { text: "Joined today", tone: "muted" }
          : { text: `${total.toLocaleString("en-US")} since ${fmtDate(s.since)}`, tone: "muted" },
    },
    {
      label: "Skills up this week",
      value: blk.loading ? bar(40, 24) : String(ups.length),
      delta: downs && !blk.loading ? { text: `${downs} down`, tone: "negative" } : undefined,
    },
    {
      label: "Mastered",
      value: blk.loading ? bar(40, 24) : String(mastered),
      unit: blk.loading ? undefined : "of 39",
    },
    {
      label: "Karman predicted score",
      value: blk.loading ? (
        bar(72, 24)
      ) : predicted ? (
        <CountUp from={baseline ?? 0} to={predicted} />
      ) : (
        "No score yet"
      ),
      unit: predicted && !blk.loading ? "if tested today" : undefined,
      delta: blk.loading
        ? undefined
        : predicted && baseline
          ? {
              text: `+${predicted - baseline} since the first test, ${baseline.toLocaleString("en-US")}`,
              tone: "positive",
            }
          : {
              text: has("fullLength")
                ? "After the first full-length test"
                : testGate
                  ? `Full-length tests are in ${PLANS[testGate].name}`
                  : "",
              tone: "muted",
            },
    },
  ];

  const stamp = blk.error ? <span className="font-normal text-muted">As of {STAMP}</span> : null;
  const skills = (
    <Panel as="section" className="flex flex-col p-4">
      <h2 className="text-section">Skills</h2>
      {blk.loading ? (
        <Skeleton.Text lines={2} className="mt-4" />
      ) : (
        <>
          <BandBar counts={counts} className="mt-3" />
          <SectionBars levels={levels} className="mt-5" />
        </>
      )}
      <h3 className="mt-5 flex items-baseline justify-between gap-3 text-dense font-semibold">
        Moved this week {stamp}
      </h3>
      {blk.loading ? (
        <div className="mt-1">
          <Skeleton.Row />
          <Skeleton.Row />
          <Skeleton.Row />
        </div>
      ) : moved.length ? (
        <MovedList items={moved} max={moved.length} />
      ) : (
        <p className="py-3 text-dense text-muted">
          {newToday ? "Levels appear after about 30 questions." : "Nothing moved this week."}
        </p>
      )}
      <div className="mt-auto flex justify-end pt-2">
        <button
          type="button"
          onClick={() => v.go("skills")}
          className="min-h-tap text-dense font-semibold text-accent hover:underline"
        >
          All 39 skills
        </button>
      </div>
    </Panel>
  );
  const thisWeek = (
    <Panel as="section" className="p-4">
      <h2 className="flex items-baseline justify-between gap-3 text-section">This week {stamp}</h2>
      {blk.loading ? (
        <Skeleton.Block height={118} className="mt-3" />
      ) : (
        <WeekStrip days={week.days} labels={WEEK_LABELS} today={TODAY_INDEX} className="mt-3" />
      )}
      {blk.loading ? null : (
        <p className="mt-3 text-dense text-muted">
          {week.practised} of 6 days so far
          {week.daily10 !== null ? `. Your Daily 10 on ${week.daily10} of them.` : "."}
        </p>
      )}
      {week.classes ? (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-dense">
          {week.classes.held
            ? "Live classes with David, Tuesday and Thursday."
            : "No live classes yet."}
          {missed ? <Pill tone="notice">Missed {dayAndDate(missed)}</Pill> : null}
        </p>
      ) : null}
    </Panel>
  );
  const coming = (
    <Panel as="section" className="flex flex-1 flex-col p-4">
      <h2 className="text-section">Coming up</h2>
      <UpcomingList
        className="mt-1 flex-1 content-start [&>div:last-child]:mt-auto"
        items={upcoming}
        max={wide ? 4 : 3}
        onPress={() => v.go("schedule")}
        viewAll={
          <button
            type="button"
            onClick={() => v.go("schedule")}
            className="min-h-tap font-semibold text-accent hover:underline"
          >
            Schedule
          </button>
        }
      />
    </Panel>
  );
  const body = (
    <div className="grid gap-4">
      {blk.error ? (
        <ErrorBlock what={`${s.name}’s week`} lastGood={STAMP} onRetry={blk.retry} />
      ) : (
        <Figures items={figures} wide={wide} />
      )}
      {newToday ? (
        <Panel as="section" className="p-4">
          <h2 className="text-section">What will appear, and when</h2>
          <FirstDayList items={firstDayList(s, plan)} className="mt-1" />
        </Panel>
      ) : null}
      <div className={cn("grid items-stretch gap-4", wide && "grid-cols-2")}>
        {skills}
        <div className="flex flex-col gap-4">
          {thisWeek}
          {coming}
        </div>
      </div>
    </div>
  );
  return (
    <Shell screen="home" title="Progress" finding={finding} primary={primary}>
      {lockedOut ? (
        <LockedPanel bundle="parent" onUpgrade={() => v.go("plan")}>
          {body}
        </LockedPanel>
      ) : (
        body
      )}
    </Shell>
  );
}
