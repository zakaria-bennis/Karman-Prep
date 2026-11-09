import { useState } from "react";
import { Sparkline } from "@/design-system/components/Sparkline";
import { LineChart } from "@/design-system/components/LineChart";
import { Heatmap } from "@/design-system/components/Heatmap";
import { DataTable } from "@/design-system/components/DataTable";
import { WeekCalendar } from "@/design-system/components/Calendar";
import { IconRail, type RailItem } from "@/design-system/components/IconRail";
import { BottomBar } from "@/design-system/components/BottomBar";
import { TopBar } from "@/design-system/components/TopBar";
import { Wordmark } from "@/design-system/components/Wordmark";
import { DEVICES } from "@/design-system/components/DeviceFrame";
import { Panel } from "@/design-system/glass/Panel";
import { Icon } from "@/design-system/icons";
import { practiceDays, EVENTS, WEEK_DATES, TODAY_INDEX, STUDENTS, TODAY } from "@/mock";
import { Section, Sub } from "./System";

const NAV: RailItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "daily10", label: "Daily 10", icon: "daily10" },
  { id: "practice", label: "Practice", icon: "practice" },
  { id: "tests", label: "Tests", icon: "tests" },
  { id: "chat", label: "Chat", icon: "chat", count: 3 },
];
const SCORES = [1280, 1290, 1310, 1330, 1320, 1360, 1390];
const LABELS = ["Jun", "Jul", "Aug", "Sep", "Sep 26", "Oct 17", "Oct 31"];

export function SystemData() {
  const [nav, setNav] = useState("daily10");
  const rows = STUDENTS.map((s) => ({
    id: s.id,
    student: s.name,
    plan: s.plan,
    predicted: s.predicted,
    target: s.target,
    satDate: s.satDate,
  }));
  return (
    <Section
      id="data"
      title="Data and navigation"
      intro="Charts carry almost no chrome: one series, straight segments, three to five faint gridlines, the accent on the main data element. Tables are rules and alignment. Navigation is a slim icon rail on desktop and a bottom bar on phones."
    >
      <div className="grid gap-10">
        <Sub title="Score trend, three options">
          <Panel className="grid gap-5 p-4">
            <LineChart
              label="Karman predicted score"
              data={SCORES}
              labels={LABELS}
              today={6}
              target={{ value: 1500, label: "Target 1500" }}
              min={1200}
              max={1550}
            />
            <div className="grid gap-5 sm:grid-cols-[320px_minmax(0,1fr)] sm:items-start">
              <Sparkline
                label="Last seven tests"
                data={SCORES}
                labels={LABELS}
                width={320}
                height={56}
              />
              <Heatmap data={practiceDays("maya")} end={TODAY} weeks={16} label="Practice days" />
            </div>
            <DataTable
              caption="Full-length tests"
              rowKey="id"
              rows={SCORES.map((v, i) => ({
                id: String(i),
                test: `Test ${i + 1}`,
                date: LABELS[i],
                score: v,
                change: i ? v - SCORES[i - 1] : null,
              }))}
              columns={[
                { key: "test", label: "Test" },
                { key: "date", label: "Date" },
                { key: "score", label: "Score", numeric: true },
                {
                  key: "change",
                  label: "Change",
                  numeric: true,
                  render: (v) =>
                    v == null ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <span className={Number(v) < 0 ? "text-negative" : ""}>
                        {Number(v) > 0 ? "+" : ""}
                        {String(v)}
                      </span>
                    ),
                },
              ]}
            />
          </Panel>
        </Sub>
        <Sub title="Table, sortable">
          <Panel className="p-4">
            <DataTable
              caption="Students"
              rowKey="id"
              defaultSort={{ key: "predicted", dir: "desc" }}
              rows={rows}
              columns={[
                { key: "student", label: "Student" },
                { key: "plan", label: "Plan" },
                { key: "predicted", label: "Predicted score", numeric: true },
                { key: "target", label: "Target", numeric: true },
                { key: "satDate", label: "SAT date" },
              ]}
            />
          </Panel>
        </Sub>
        <Sub title="Week calendar">
          <Panel className="p-4">
            <WeekCalendar
              events={[...EVENTS.ava, ...EVENTS.maya.filter((e) => e.kind === "session")]}
              dates={WEEK_DATES}
              today={TODAY_INDEX}
              from={9}
              to={21}
            />
          </Panel>
        </Sub>
        <Sub title="Navigation: the rail on desktop, the bottom bar on phones">
          <Panel className="grid gap-4 p-4">
            <div className="flex h-[320px] overflow-hidden rounded-card border border-line">
              <IconRail
                items={NAV}
                bottom={[{ id: "settings", label: "Settings", icon: "settings" }]}
                active={nav}
                onSelect={setNav}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <TopBar
                  heading="p"
                  title="Your Daily 10"
                  leading="none"
                  action={
                    <button
                      type="button"
                      aria-label="Help"
                      className="grid h-11 w-11 place-items-center text-text"
                    >
                      <Icon name="help" size={24} />
                    </button>
                  }
                />
                <div className="p-4 text-dense text-muted">
                  Hover an icon for its name. The active pill slides on the settle spring. A count
                  sits only on a queue that needs action.
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-card border border-line">
              <TopBar heading="p" title="Home" leading="menu" />
              <div className="p-4 text-dense text-muted">
                The 48px top bar: the screen name, a menu or back control, at most one action.
              </div>
              <BottomBar items={NAV.slice(0, 5)} active={nav} onSelect={setNav} />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Wordmark />
              <ul className="text-dense text-muted">
                {Object.entries(DEVICES).map(([id, d]) => (
                  <li key={id}>
                    <span className="font-semibold text-text">{d.label}</span> {d.w} by {d.h}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </Sub>
      </div>
    </Section>
  );
}
