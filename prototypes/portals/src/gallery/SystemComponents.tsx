import { useState } from "react";
import { Skeleton } from "@/design-system/components/Skeleton";
import { CountUp } from "@/design-system/components/CountUp";
import { useConfetti } from "@/design-system/components/Confetti";
import { Sheet } from "@/design-system/components/Sheet";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { Tabs } from "@/design-system/components/Tabs";
import { Row, List } from "@/design-system/components/Row";
import { Pill } from "@/design-system/components/Pill";
import { KpiStrip } from "@/design-system/components/KPI";
import { Locked } from "@/design-system/components/Locked";
import { useToast } from "@/design-system/components/Toast";
import { Timer } from "@/design-system/components/Timer";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Panel } from "@/design-system/glass/Panel";
import { Icon } from "@/design-system/icons";
import { usePlan } from "@/plans/PlanProvider";
import { PLANS } from "@/plans/plans";
import { Section, Sub } from "./System";

export function SystemComponents() {
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState("moved");
  const [count, setCount] = useState(0);
  const confetti = useConfetti();
  const toast = useToast();
  const { plan } = usePlan();
  return (
    <Section
      id="components"
      title="Components"
      intro={`Every state the portals need, on the ${PLANS[plan].name} plan. Loading is a skeleton of the final layout; empty keeps the frame; error stays inside the block; locked stays readable.`}
    >
      <div className="grid gap-10">
        <Sub title="Skeleton, loading">
          <Panel className="grid gap-4 p-4">
            <Skeleton.Swap
              loading
              fallback={
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton.Kpi label="Days to the SAT" lead />
                  <Skeleton.Kpi label="Predicted score" />
                </div>
              }
            >
              never shown
            </Skeleton.Swap>
            <Skeleton.Row sub />
            <Skeleton.Row />
            <div className="flex items-center gap-3">
              <Skeleton.Circle size={32} />
              <Skeleton.Text lines={2} />
            </div>
          </Panel>
        </Sub>
        <Sub title="KPI strip: type, not tiles">
          <KpiStrip
            items={[
              { label: "Days to the SAT", value: "126", unit: "Mar 6", lead: true },
              {
                label: "Karman predicted score",
                value: "1,390",
                delta: { text: "+110 since the baseline", tone: "positive" },
              },
              { label: "Questions answered", value: "1,284" },
              { label: "Days in a row", value: "7" },
            ]}
          />
        </Sub>
        <Sub title="Empty and error">
          <div className="grid gap-3">
            <Empty
              title="No tests taken yet"
              detail="The first full-length test gives you a Karman predicted score."
              action={
                <button type="button" className="min-h-tap text-dense font-semibold text-accent">
                  Take the first test
                </button>
              }
            />
            <ErrorBlock
              what="the skill list"
              lastGood="9:14"
              onRetry={() => toast.push({ title: "Trying again", kind: "status" })}
            />
          </div>
        </Sub>
        <Sub title="Locked, on this plan">
          <Locked bundle="oneToOne">
            <Panel className="p-4">
              <h4 className="text-section">Full-length review session</h4>
              <p className="mt-1 text-dense text-muted">
                Every mistake on test 4, with your tutor. Due Tuesday, November 3.
              </p>
            </Panel>
          </Locked>
        </Sub>
        <Sub title="Rows, pills and tabs">
          <Panel className="px-4 py-2">
            <Tabs
              label="Skills"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "moved", label: "Moved today", count: 7 },
                { id: "all", label: "All skills", count: 39 },
              ]}
              className="mb-1"
            />
            <List
              total="7 moved today"
              viewAll={
                <button
                  type="button"
                  className="-mr-2 min-h-tap min-w-tap px-2 font-semibold text-accent"
                >
                  See all
                </button>
              }
            >
              <Row
                title="Nonlinear functions"
                sub={{ kind: "state", text: "Up 6, now Proficient", tone: "positive" }}
                leading={<Icon name="practice" size={20} />}
                trailing="63"
                onPress={() => {}}
              />
              <Row
                title="Right triangles and trigonometry"
                sub={{ kind: "state", text: "Down 5, needs another look", tone: "negative" }}
                leading={<Icon name="practice" size={20} />}
                trailing="33"
                onPress={() => {}}
              />
              <Row
                title="Full-length test 4"
                sub={{ kind: "due", text: "Due today, 9:00 am" }}
                leading={<Icon name="tests" size={20} />}
                trailing={<Pill tone="notice">Timed</Pill>}
                onPress={() => {}}
              />
              <Row
                title="Words in Context"
                leading={<Icon name="book" size={20} />}
                trailing={<Pill tone="positive">Mastered</Pill>}
              />
              <Row
                title="Class missed on Thursday"
                leading={<Icon name="calendar" size={20} />}
                trailing={<Pill tone="negative">Missed</Pill>}
              />
            </List>
          </Panel>
        </Sub>
        <Sub title="Progress, count up, confetti, toasts">
          <Panel className="grid gap-5 p-4">
            <ProgressBar
              label="Questions this week"
              value={303}
              max={2000}
              startLabel="0"
              endLabel="2,000 on the school seat"
            />
            <div className="flex flex-wrap items-center gap-4">
              <span className="tabular text-kpi">
                <CountUp key={count} to={1390} from={1280} duration={900} />
              </span>
              <button
                type="button"
                onClick={() => setCount((n) => n + 1)}
                className="min-h-tap min-w-tap text-dense font-semibold text-accent"
              >
                Count again
              </button>
              <button
                type="button"
                onClick={(e) => confetti.fire("score", e.currentTarget)}
                className="min-h-tap text-dense font-semibold text-accent"
              >
                Confetti
              </button>
              <button
                type="button"
                onClick={(e) => confetti.fire("tokens", e.currentTarget)}
                className="min-h-tap min-w-tap text-dense font-semibold text-accent"
              >
                Coins
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  toast.push({
                    title: "Test 4 saved",
                    detail: "Your Karman predicted score updates in a minute.",
                    kind: "success",
                  })
                }
                className="min-h-tap text-dense font-semibold text-accent"
              >
                Success toast
              </button>
              <button
                type="button"
                onClick={() =>
                  toast.push({
                    title: "Couldn't save the photo",
                    detail: "Check the connection and try again.",
                    kind: "error",
                    action: { label: "Try again", onClick() {} },
                  })
                }
                className="min-h-tap text-dense font-semibold text-accent"
              >
                Error toast
              </button>
              <button
                type="button"
                onClick={() => {
                  for (let i = 1; i <= 5; i++)
                    toast.push({
                      title: `Note ${i} from David`,
                      detail: "Posted in the cohort chat.",
                    });
                }}
                className="min-h-tap text-dense font-semibold text-accent"
              >
                Five at once
              </button>
            </div>
          </Panel>
        </Sub>
        <Sub title="Sheet and timer">
          <Panel className="relative grid gap-4 overflow-hidden p-4">
            <div className="flex flex-wrap items-center gap-4">
              <GlassButton variant="primary" onClick={() => setSheet(true)}>
                Open the sheet
              </GlassButton>
              <Timer seconds={11 * 60 + 42} running={false} />
            </div>
            <p className="text-dense text-muted">
              Bottom sheet on a phone, side sheet on desktop, over this panel. Drag it to dismiss;
              it springs back below 40 percent. The timer hides its face.
            </p>
            <List>
              <Row title="Nonlinear functions" trailing="63" />
              <Row title="Percentages" trailing="77" />
              <Row title="Circles" trailing="30" />
            </List>
            <Sheet open={sheet} onClose={() => setSheet(false)} title="All skills">
              <List>
                <Row title="Linear equations in one variable" trailing="84" />
                <Row title="Linear functions" trailing="74" />
                <Row title="Percentages" trailing="77" />
                <Row title="Circles" trailing="30" />
              </List>
            </Sheet>
          </Panel>
        </Sub>
      </div>
    </Section>
  );
}
