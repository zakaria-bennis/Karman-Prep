import { useState } from "react";
import { TopBar } from "@/design-system/components/TopBar";
import { BottomBar } from "@/design-system/components/BottomBar";
import { IconRail, type RailItem } from "@/design-system/components/IconRail";
import { Welcome } from "@/design-system/components/Welcome";
import { KpiStrip } from "@/design-system/components/KPI";
import { Row, List } from "@/design-system/components/Row";
import { Locked } from "@/design-system/components/Locked";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Panel } from "@/design-system/glass/Panel";
import { TokenCount, Streak, LevelMark } from "@/design-system/marks";
import { Icon } from "@/design-system/icons";
import { useWidth } from "@/design-system/components/hooks";
import { useMockState } from "@/mock/state";
import {
  REWARDS,
  DUE,
  levelsFor,
  movedToday,
  weakest,
  daysUntil,
  fmtDate,
  SAT_MARCH,
} from "@/mock";
import { useRef } from "react";

/**
 * A sample screen built only from the design system, shown while a portal has
 * no registered screens. It is not a portal screen: the portal agents replace
 * it. It exists so the gallery's switches have something real to show.
 */
const NAV: RailItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "daily10", label: "Daily 10", icon: "daily10" },
  { id: "practice", label: "Practice", icon: "practice" },
  { id: "tests", label: "Tests", icon: "tests" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
];

export function SampleScreen() {
  const host = useRef<HTMLDivElement>(null);
  const width = useWidth(host);
  const desktop = width >= 768;
  const [nav, setNav] = useState("home");
  const { student, loading, error, empty, now } = useMockState();
  const rewards = REWARDS[student.id];
  const levels = levelsFor(student.id);
  const moved = movedToday(levels).slice(0, 3);
  const weak = weakest(levels);
  const due = DUE[student.id] ?? [];
  const days = daysUntil(student.satDate);

  const body = loading ? (
    <div className="grid gap-5">
      <Skeleton.Text lines={1} width="60%" />
      <div className="grid grid-cols-2 gap-4 rounded-panel border border-line bg-panel p-4 sm:grid-cols-4">
        <Skeleton.Kpi label="Days to the SAT" lead />
        <Skeleton.Kpi label="Predicted score" />
        <Skeleton.Kpi label="Questions answered" />
        <Skeleton.Kpi label="Streak" />
      </div>
      <Skeleton.Row sub />
      <Skeleton.Row sub />
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-5">
      <Welcome
        name={student.name}
        context={{
          hour: now.getHours(),
          weekday: now.getDay(),
          classDay: student.cohort ? [2, 4].includes(now.getDay()) : false,
          testSeason: days <= 14,
          seed: 3,
        }}
      />
      <KpiStrip
        items={[
          {
            label: "Days to the SAT",
            value: String(days),
            unit: fmtDate(student.satDate),
            lead: true,
          },
          {
            label: "Karman predicted score",
            value: student.predicted ? String(student.predicted) : "No score yet",
            delta:
              student.predicted && student.baseline
                ? {
                    text: `+${student.predicted - student.baseline} since the baseline`,
                    tone: "positive",
                  }
                : undefined,
          },
          { label: "Questions answered", value: student.predicted ? "1,284" : "0" },
          { label: "Days in a row", value: String(rewards?.streak ?? 0) },
        ]}
      />
      {error ? (
        <ErrorBlock what="today's practice" lastGood="9:14" onRetry={() => {}} />
      ) : empty || !due.length ? (
        <Empty
          title="Nothing due today"
          detail="Your Daily 10 opens at midnight. A short set now still counts."
          action={<GlassButton variant="primary">Start a short set</GlassButton>}
        />
      ) : (
        <Panel className="px-4 py-2">
          <h2 className="pb-1 pt-2 text-section">Due</h2>
          <List>
            {due.map((d) => (
              <Row
                key={d.id}
                title={d.title}
                sub={{
                  kind: "due",
                  text: d.due === "2026-10-31" ? "Due today" : `Due ${fmtDate(d.due)}`,
                }}
                leading={
                  <Icon
                    name={
                      d.kind === "test" ? "tests" : d.kind === "daily10" ? "daily10" : "practice"
                    }
                    size={20}
                  />
                }
                onPress={() => {}}
              />
            ))}
          </List>
        </Panel>
      )}
      {!error && !empty && due.length ? (
        <div className="flex flex-wrap items-center gap-4">
          <GlassButton variant="primary">Start Your Daily 10</GlassButton>
          {weak ? (
            <button type="button" className="min-h-tap text-body font-semibold text-accent">
              Practise {weak.label.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
      <Locked bundle="fullLength">
        <Panel className="p-4">
          <h2 className="text-section">Full-length tests</h2>
          <p className="mt-1 text-dense text-muted">
            Test 4 is due {fmtDate(SAT_MARCH === student.satDate ? "2026-10-31" : "2026-11-07")}.
            Timed, scored, with a Karman predicted score.
          </p>
        </Panel>
      </Locked>
      {moved.length ? (
        <Panel className="px-4 py-2">
          <h2 className="pb-1 pt-2 text-section">Skills that moved today</h2>
          <List>
            {moved.map((s) => (
              <Row
                key={s.id}
                title={s.label}
                sub={{
                  kind: "state",
                  text:
                    s.now > s.was
                      ? `Up ${s.now - s.was}`
                      : `Down ${s.was - s.now}, needs another look`,
                  tone: s.now > s.was ? "positive" : "negative",
                }}
                leading={<LevelMark level={s.band} size={20} />}
                trailing={`${s.now}`}
              />
            ))}
          </List>
        </Panel>
      ) : null}
      <div className="flex flex-wrap items-center gap-5 text-dense">
        {rewards ? <TokenCount value={rewards.tokens} /> : null}
        {rewards?.streak ? <Streak days={rewards.streak} /> : null}
      </div>
    </div>
  );

  return (
    <div ref={host} className="flex h-full w-full">
      {desktop ? (
        <IconRail
          items={NAV}
          bottom={[{ id: "settings", label: "Settings", icon: "settings" }]}
          active={nav}
          onSelect={setNav}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={desktop ? "Home" : "Home"}
          leading={desktop ? "none" : "menu"}
          action={
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-11 w-11 place-items-center text-text"
            >
              <Icon name="bell" size={24} />
            </button>
          }
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6">{body}</main>
        {desktop ? null : (
          <BottomBar
            items={NAV}
            active={nav}
            onSelect={setNav}
            className="absolute inset-x-0 bottom-0"
          />
        )}
      </div>
    </div>
  );
}
