import { useRef } from "react";
import { cn } from "@/design-system/cn";
import { Panel } from "@/design-system/glass/Panel";
import { useWidth } from "@/design-system/components/hooks";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Row, List } from "@/design-system/components/Row";
import { CountUp } from "@/design-system/components/CountUp";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Empty } from "@/design-system/components/Empty";
import { LevelMark } from "@/design-system/marks";
import { formatClock } from "@/design-system/components/Timer";
import { fmtDate, movedToday, SKILLS } from "@/mock";
import { cohortStanding, DIAGNOSTIC_DATE } from "./mock";
import { nextClassDate, CLASS_TIME } from "./mock-schedule";
import { BandStrip } from "./SkillLevels";
import { Trend, TrendSwitch, useTrendOption } from "./Trend";
import { TextLink } from "./Shell";
import { goTo } from "./nav";
import type { StudentView } from "./view";

/*
 * The stats the end screen leaves out, as type, not tiles: one panel divided
 * by hairlines, a label over each value. The predicted score is the one
 * answer figure at 36px and the only number that counts up.
 */
function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-dense text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-body font-semibold">{value}</dd>
      {detail ? <dd className="text-dense text-muted">{detail}</dd> : null}
    </div>
  );
}

export function TodaySetBlock({ v }: { v: StudentView }) {
  if (v.loading)
    return (
      <Panel className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-3">
        {["Pace", "Hardest right", "Slowest", "Changed", "Difficulty", "Reviewed"].map((l) => (
          <Skeleton.Kpi key={l} label={l} />
        ))}
      </Panel>
    );
  const s = v.set;
  return (
    <Panel as="section" aria-label="Today's set" className="overflow-hidden">
      <h2 className="px-4 pb-1 pt-3 text-section">Today's set</h2>
      {s ? (
        <dl className="grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-3 lg:[&>*:nth-child(3n+1)]:border-l-0 [&>*:nth-child(odd)]:border-l-0 lg:[&>*:nth-child(odd)]:border-l">
          <Stat
            label="Pace"
            value={`${s.pace} s a question`}
            detail={`${formatClock(s.seconds)} in all`}
          />
          <Stat label="Hardest question right" value={s.hardestRight ?? "None yet"} />
          <Stat
            label="Slowest question"
            value={formatClock(s.slowest.seconds)}
            detail={s.slowest.skill}
          />
          <Stat
            label="Changed answers"
            value={String(s.changed)}
            detail={s.changed ? `${s.changedToRight} to the right one` : undefined}
          />
          <Stat label="Set difficulty" value={s.difficulty} />
          <Stat
            label="Misses reviewed"
            value={s.reviewed.count ? `${s.reviewed.count} came back` : "None today"}
            detail={
              s.reviewed.count
                ? `from ${s.reviewed.from.map((d) => fmtDate(d)).join(" and ")}, ${s.reviewed.right} right`
                : undefined
            }
          />
        </dl>
      ) : (
        <div className="px-4 pb-4">
          <Empty
            title="No set finished today"
            detail="Pace, hardest question right, slowest question and changed answers show here after a set."
          />
        </div>
      )}
    </Panel>
  );
}

export function ScoreBlock({ v, full = false }: { v: StudentView; full?: boolean }) {
  const [option, setOption] = useTrendOption();
  const host = useRef<HTMLDivElement>(null);
  // Measured, not a viewport breakpoint: on the iPad the panel sits in a 360px column and stays stacked.
  const wide = useWidth(host) >= 560;
  if (v.loading)
    return (
      <Panel className="grid gap-4 p-4">
        <Skeleton.Kpi label="Karman predicted score if you tested today" lead />
        <Skeleton.Block height={180} />
      </Panel>
    );
  const score = (
    <div>
      <p className="text-dense text-muted">Karman predicted score if you tested today</p>
      {v.predicted !== null ? (
        <p className="tabular text-kpi-lg">
          <CountUp to={v.predicted} from={v.baseline ?? v.predicted - 100} />
        </p>
      ) : (
        <p className="text-kpi text-muted">No score yet</p>
      )}
      {v.predicted !== null && v.baseline !== null ? (
        <p className="text-dense text-positive">
          +{v.predicted - v.baseline} since the diagnostic on {fmtDate(DIAGNOSTIC_DATE)}
        </p>
      ) : (
        <div className="grid gap-1">
          <p className="text-dense text-muted">The diagnostic or a full-length test sets it.</p>
          <TextLink className="text-dense" onClick={() => goTo("diagnostic")}>
            Take the diagnostic
          </TextLink>
        </div>
      )}
    </div>
  );
  const days = (
    <div>
      <p className="text-dense text-muted">Days to the SAT</p>
      <p className="tabular text-kpi">{v.days}</p>
      <p className="text-dense text-muted">{fmtDate(v.satDate, "long")}</p>
    </div>
  );
  // In a wide panel the ladder keeps the left half; days to the SAT and the trend switch sit beside
  // it, so the panel has no empty right half on desktop.
  return (
    <Panel as="section" aria-label="Karman predicted score" className="grid gap-4 p-4 sm:p-5">
      {v.points.length ? (
        <div ref={host} className={cn("grid gap-4", wide && "grid-cols-2 gap-6")}>
          <div className="grid content-start gap-4">
            {score}
            <Trend
              option={option}
              points={v.points}
              predicted={v.predicted}
              target={v.target}
              satDate={v.satDate}
              compact={!full}
            />
          </div>
          <div
            className={cn(
              "grid content-start gap-4",
              wide ? "border-l border-line pl-6" : "border-t border-line pt-4"
            )}
          >
            {days}
            <div className="grid gap-1">
              <p className="text-dense text-muted">Score trend as</p>
              <TrendSwitch value={option} onChange={setOption} />
            </div>
            {full ? null : (
              <TextLink className="text-dense" onClick={() => goTo("progress")}>
                Progress
              </TextLink>
            )}
          </div>
        </div>
      ) : (
        <div ref={host} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          {score}
          <div className="sm:text-right">{days}</div>
        </div>
      )}
    </Panel>
  );
}

export function SkillsBlock({ v }: { v: StudentView }) {
  if (v.loading)
    return (
      <Panel className="grid gap-3 p-4">
        <Skeleton.Block height={64} />
        <Skeleton.Row sub />
        <Skeleton.Row sub />
      </Panel>
    );
  const moved = movedToday(v.levels).slice(0, 3);
  return (
    <Panel as="section" aria-label="Skills" className="grid gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section">Skills by level</h2>
        <TextLink className="text-dense" onClick={() => goTo("progress")}>
          All {SKILLS.length}
        </TextLink>
      </div>
      <BandStrip levels={v.levels} />
      <ProgressBar
        value={v.started}
        max={SKILLS.length}
        label="Skills practised"
        endLabel={`${v.started} of ${SKILLS.length}`}
      />
      {moved.length ? (
        <List>
          {moved.map((s) => (
            <Row
              key={s.id}
              title={s.label}
              sub={{
                kind: "state",
                text: s.now > s.was ? `Up ${s.now - s.was} today` : `Down ${s.was - s.now} today`,
                tone: s.now > s.was ? "positive" : "negative",
              }}
              leading={<LevelMark level={s.band} size={20} />}
              onPress={() => goTo("practice", { skill: s.id })}
            />
          ))}
        </List>
      ) : (
        <p className="text-dense text-muted">No skill moved today.</p>
      )}
    </Panel>
  );
}

export function CohortBlock({ v }: { v: StudentView }) {
  if (!v.has("liveClasses")) return null;
  if (v.loading)
    return (
      <Panel className="grid grid-cols-2 gap-4 p-4">
        <Skeleton.Kpi label="Cohort average" />
        <Skeleton.Kpi label="Your rank" />
      </Panel>
    );
  const st = cohortStanding(v.predicted);
  return (
    <Panel as="section" aria-label="March cohort" className="grid gap-3 p-4">
      <h2 className="text-section">March cohort with David</h2>
      {st ? (
        <dl className="grid grid-cols-2 divide-x divide-line">
          <div className="pr-4">
            <dt className="text-dense text-muted">Cohort average</dt>
            <dd className="tabular text-kpi">{st.average.toLocaleString("en-US")}</dd>
          </div>
          <div className="pl-4">
            <dt className="text-dense text-muted">Your rank</dt>
            <dd className="tabular text-kpi">{st.label}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-dense text-muted">Your rank shows after the diagnostic.</p>
      )}
      <Row
        title="Next live class"
        sub={{ kind: "date", text: `${fmtDate(nextClassDate(), "long")}, ${CLASS_TIME}` }}
        onPress={() => goTo("classes")}
      />
    </Panel>
  );
}

export function BestsBlock({ v }: { v: StudentView }) {
  if (v.loading)
    return (
      <Panel className="grid gap-2 p-4">
        <Skeleton.Row sub />
        <Skeleton.Row sub />
      </Panel>
    );
  return (
    <Panel as="section" aria-label="Personal bests" className="p-4">
      <h2 className="pb-1 text-section">Personal bests</h2>
      {v.bests.length ? (
        <List>
          {v.bests.map((b) => (
            <Row
              key={b.label}
              title={b.label}
              sub={{ kind: "date", text: fmtDate(b.date) }}
              trailing={b.value}
            />
          ))}
        </List>
      ) : (
        <p className="pt-1 text-dense text-muted">Your first finished set sets the first best.</p>
      )}
    </Panel>
  );
}
