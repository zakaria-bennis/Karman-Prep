import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Icon } from "@/design-system/icons";
import { TokenCount, Streak, BoxIcon } from "@/design-system/marks";
import { TODAY, fmtDate, weakest } from "@/mock";
import { PLANS } from "@/plans/plans";
import { PlanLocked } from "./PlanSheet";
import { SetStrip } from "./SetStrip";
import { goTo, retry } from "./nav";
import { nextClassDate, CLASS_TIME, OFFICE_HOURS, SESSIONS } from "./mock-schedule";
import { hoursFor } from "./mock";
import type { StudentView } from "./view";

/*
 * The lead block: the next thing to do, decided by the system (Tesler), one
 * highlighted action (Von Restorff), the rest as rows with their due dates.
 * The Daily 10 card carries the set strip, the portal's own mark.
 */
const dueText = (d: string) => (d === TODAY ? "Due today" : `Due ${fmtDate(d)}`);
const weekday = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });

export function nextStep(v: StudentView) {
  if (v.firstDay || v.baseline === null)
    return {
      label: "Start the diagnostic",
      go: () => goTo("diagnostic"),
      why: "Start with the diagnostic. It sets your Karman predicted score and your skill levels.",
      dueId: null,
    };
  if (v.has("daily10") && !v.doneToday)
    return {
      label: "Start Your Daily 10",
      go: () => goTo("daily10"),
      why: "Your Daily 10 is ready. Ten questions, about ten minutes.",
      dueId: v.due.find((d) => d.kind === "daily10")?.id ?? null,
    };
  const test = v.due.find((d) => d.kind === "test");
  if (test && v.has("fullLength"))
    return {
      label: `Start ${test.title}`,
      go: () => goTo("test"),
      why: `${test.title} is ${dueText(test.due).toLowerCase()}. Two sections, about two and a half hours.`,
      dueId: test.id,
    };
  const weak = weakest(v.levels);
  if (weak)
    return {
      label: `Practise ${weak.label.toLowerCase()}`,
      go: () => goTo("practice", { skill: weak.id }),
      why: `Your weakest skill right now is ${weak.label.toLowerCase()}.`,
      dueId: null,
    };
  return {
    label: "Practise a skill",
    go: () => goTo("practice"),
    why: "Pick any of the 39 skills.",
    dueId: null,
  };
}

export function NextUp({ v }: { v: StudentView }) {
  if (v.loading)
    return (
      <Panel className="grid gap-4 p-4">
        <Skeleton.Text lines={1} width="50%" />
        <Skeleton.Block height={14} width={160} />
        <Skeleton.Block height={44} width={200} className="rounded-pill" />
        <Skeleton.Row sub />
        <Skeleton.Row sub />
      </Panel>
    );
  if (v.error)
    return (
      <Panel className="p-4">
        <h2 className="pb-2 text-section">Next</h2>
        <ErrorBlock what="today's practice" lastGood="9:14" onRetry={retry} />
      </Panel>
    );
  const step = nextStep(v);
  const dailyLocked = !v.has("daily10");
  const others = v.due.filter((d) => d.kind !== "daily10" && d.id !== step.dueId);
  const nextClass = v.has("liveClasses") ? nextClassDate() : null;
  const privatePlan = v.has("oneToOne");
  const hours = hoursFor(v.plan);
  const workshops = v.has("workshops");
  const nothing =
    !v.firstDay && !others.length && !nextClass && !privatePlan && !workshops && v.doneToday;

  const daily = v.has("daily10") ? (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section">Your Daily 10</h2>
        <span className="tabular text-dense text-muted">
          {v.doneToday && v.set
            ? `${v.set.right} of ${v.set.total} today`
            : v.firstDay
              ? "After the diagnostic"
              : v.due.some((d) => d.kind === "daily10")
                ? "Due today"
                : "Ready"}
        </span>
      </div>
      <SetStrip
        cells={
          v.doneToday && v.set
            ? v.set.answers.map((ok) => (ok ? "right" : "wrong"))
            : Array(10).fill("todo")
        }
        label="Today's set"
      />
      {v.doneToday && v.set ? (
        <p className="text-dense text-muted">
          Done at 7:52 am. <TokenCount value={v.set.tokens} size={16} className="text-dense" />{" "}
          earned.
        </p>
      ) : null}
    </div>
  ) : (
    <PlanLocked bundle="daily10">
      <div className="grid gap-3 p-4">
        <SetStrip cells={Array(10).fill("todo")} />
        <p className="text-dense">
          Ten questions a day. Your misses come back after 2, 7 and 21 days.
        </p>
      </div>
    </PlanLocked>
  );

  return (
    <Panel as="section" aria-label="Next" className="grid gap-5 p-4 sm:p-5">
      <div className="grid gap-1">
        <p className="text-body font-semibold">{step.why}</p>
        <div className="pt-2">
          <GlassButton variant="primary" className="k-sheen" onClick={step.go}>
            {step.label}
          </GlassButton>
        </div>
      </div>
      {dailyLocked ? daily : <div className="border-t border-line pt-4">{daily}</div>}
      {v.firstDay ? (
        <p className="text-dense text-muted">
          After the diagnostic, Your Daily 10 opens every day
          {v.has("daily10") ? "" : ` on ${PLANS.platform.name}`}.
        </p>
      ) : nothing ? (
        <Empty
          title="Nothing else due today"
          detail="A short set now still counts toward your streak."
        />
      ) : (
        <List>
          {others.map((d) => (
            <Row
              key={d.id}
              title={d.title}
              sub={{
                kind: "due",
                text: dueText(d.due),
                tone: d.due === TODAY ? "negative" : "muted",
              }}
              leading={<Icon name={d.kind === "test" ? "tests" : "practice"} size={20} />}
              onPress={() => goTo(d.kind === "test" ? "test" : "practice")}
            />
          ))}
          {nextClass ? (
            <Row
              title="Live class with David"
              sub={{
                kind: "date",
                text: `${weekday(nextClass)} ${fmtDate(nextClass)}, ${CLASS_TIME}`,
              }}
              leading={<Icon name="classes" size={20} />}
              onPress={() => goTo("classes")}
            />
          ) : null}
          {privatePlan ? (
            <Row
              title={`Next session with ${v.tutor}`}
              sub={{
                kind: "state",
                text: `Not booked yet, ${SESSIONS.length} of ${hours} hours used`,
              }}
              leading={<Icon name="tutor" size={20} />}
              onPress={() => goTo("classes")}
            />
          ) : null}
          {workshops && !nextClass && !privatePlan ? (
            <Row
              title="Office hours"
              sub={{
                kind: "date",
                text: `${fmtDate(OFFICE_HOURS.next, "long")}, ${OFFICE_HOURS.time}`,
              }}
              leading={<Icon name="calendar" size={20} />}
              onPress={() => goTo("classes")}
            />
          ) : null}
        </List>
      )}
    </Panel>
  );
}

/** Tokens, the streak and a waiting box, one tap from Rewards. */
export function RewardsStrip({ v }: { v: StudentView }) {
  if (v.loading)
    return (
      <Panel className="px-3 py-1">
        <Skeleton.Row />
      </Panel>
    );
  const r = v.rewards;
  if (!r) return null;
  return (
    <Panel className="px-3 py-1">
      <Row
        onPress={() => goTo("rewards")}
        aria-label={`Rewards: ${r.tokens} tokens, ${r.streak} days in a row${r.boxes ? `, ${r.boxes} box waiting` : ""}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-dense">
            <TokenCount value={r.tokens} />
            {r.streak ? (
              <Streak days={r.streak} />
            ) : (
              <span className="font-medium text-muted">No streak yet</span>
            )}
            {r.boxes ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <BoxIcon size={22} /> {r.boxes} box waiting
              </span>
            ) : null}
          </span>
        }
      />
    </Panel>
  );
}
