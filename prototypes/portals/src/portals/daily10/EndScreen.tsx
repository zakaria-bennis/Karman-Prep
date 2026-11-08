import { useEffect, useMemo, useRef, useState } from "react";
import { useMockState } from "@/mock/state";
import { usePlan, PlanProvider } from "@/plans/PlanProvider";
import { LADDER, has, type PlanId } from "@/plans/plans";
import { LockedFrame } from "./pieces/LockedFrame";
import { ResultsBar } from "./pieces/ResultsBar";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useWidth, useCoarsePointer } from "@/design-system/components/hooks";
import type { AccessoryId } from "@/design-system/marks/accessories";
import { CompanionMoment } from "./moments/CompanionMoment";
import { BoxFirst } from "./moments/BoxFirst";
import { Results } from "./moments/Results";
import { useFlights } from "./pieces/TokenPill";
import { toStudent } from "./nav";
import { daily10For, type Variant } from "./mock";
import { DEMO_LOG, isMuted, renderWav, unlock } from "./sfx";
import "./daily10.css";

/*
 * Box first, the approved ending (founder, 2026-10-30). After the last
 * question, in order: a new companion (when one was earned) gets its own moment
 * and leaves, then the box (when today's tokens reach one), then the results.
 * Everything else is collected for the dashboard, never shown here, and the
 * screen never shows a score estimate. The gallery's state switch picks the
 * student and the state; a route picks where to start; Replay restarts it.
 */
export type Start = "companion" | "box" | "prize" | "results";
type Phase = "companion" | "box" | "results";

export function EndScreen({
  start = "companion",
  variant = "full",
  hold = false,
}: {
  start?: Start;
  variant?: Variant;
  /** The standalone companion route stays on its moment. */
  hold?: boolean;
}) {
  const { state, student, loading, error, empty, locked } = useMockState();
  const plan = usePlan();
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root);
  const coarse = useCoarsePointer();
  const phone = width > 0 && width < 560;
  const narrow = width > 0 && width < 900;
  const touch = coarse || narrow;
  const { fly, layer } = useFlights(root);
  const [key, setKey] = useState(0);
  // still=1 on the query opens the results on their final frame (for the inspector and a reviewer)
  const stillQ = new URLSearchParams(location.hash.split("?")[1] ?? "").get("still") === "1";
  const data = useMemo(() => daily10For(student, variant, state), [student, variant, state]);

  const phases = useMemo<Phase[]>(() => {
    if (loading || error || empty || locked) return ["results"];
    const p: Phase[] = [];
    if (data.newCompanion) p.push("companion");
    if (data.boxes) p.push("box");
    p.push("results");
    return p;
  }, [data, loading, error, empty, locked]);
  const want: Phase = start === "prize" ? "box" : start;
  const initial = phases.includes(want)
    ? want
    : (phases[
        Math.max(
          0,
          phases.findIndex(
            (p) =>
              ["companion", "box", "results"].indexOf(p) >
              ["companion", "box", "results"].indexOf(want)
          )
        )
      ] ?? "results");
  const [phase, setPhase] = useState<Phase>(initial);
  const result = useRef<{ box: "opened" | "saved" | null; wear?: AccessoryId }>({
    box: null,
    wear: data.wearing,
  });

  useEffect(() => {
    // a hook for the sound check: an offline render of the nine moments, as WAV bytes
    (window as unknown as { __d10?: unknown }).__d10 = { renderWav, DEMO_LOG };
  }, []);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = () => {
      if (!isMuted()) unlock();
    };
    el.addEventListener("pointerdown", on, { passive: true });
    return () => el.removeEventListener("pointerdown", on);
  }, []);

  const replay = () => {
    result.current = { box: null, wear: data.wearing };
    setPhase(initial);
    setKey((k) => k + 1);
  };
  const after = (p: Phase) => phases[phases.indexOf(p) + 1] ?? "results";

  // a plan without Your Daily 10: the results stay readable behind one line and one action;
  // the top bar (streak, tokens, sound, Done) stays live outside the lock
  const lockedPlan: PlanId | null = locked
    ? (LADDER.find((p) => !has(p, "daily10")) ?? null)
    : plan.has("daily10")
      ? null
      : plan.plan;
  const lockedPill = useRef<HTMLDivElement>(null);

  let body: React.ReactNode;
  if (lockedPlan)
    body = (
      <PlanProvider plan={lockedPlan}>
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <ResultsBar
            streak={data.streak}
            balance={data.tokensAfter}
            pill={lockedPill}
            home={toStudent("home")}
            phone={phone}
            narrow={narrow}
          />
          <h1 className="sr-only">Your Daily 10 is done</h1>
          <LockedFrame
            bundle="daily10"
            className={`mx-auto max-w-[1000px] ${phone ? "mx-3 mt-4" : "mt-5"}`}
            onUpgrade={() => (location.hash = toStudent("settings"))}
          >
            <Results
              data={data}
              box={null}
              wear={data.wearing}
              mode="long-time"
              still
              embedded
              onReplay={replay}
              touch={touch}
              phone={phone}
              narrow={narrow}
            />
          </LockedFrame>
        </div>
      </PlanProvider>
    );
  else if (loading) body = <LoadingResults phone={phone} narrow={narrow} />;
  else if (phase === "companion")
    body = (
      <CompanionMoment
        data={data}
        hold={hold}
        onDone={() => setPhase(after("companion"))}
        onReplay={replay}
        touch={touch}
        phone={phone}
      />
    );
  else if (phase === "box")
    body = (
      <BoxFirst
        data={data}
        startAt={start === "prize" ? "prize" : "earn"}
        fly={fly}
        onDone={(r) => {
          result.current = r;
          setPhase("results");
        }}
        onReplay={replay}
        touch={touch}
        phone={phone}
      />
    );
  else
    body = (
      <Results
        data={data}
        box={result.current.box}
        wear={result.current.wear}
        mode={state}
        still={stillQ}
        fly={fly}
        onReplay={replay}
        touch={touch}
        phone={phone}
        narrow={narrow}
      />
    );

  return (
    <div
      ref={root}
      className="d10 relative h-full w-full overflow-hidden text-text"
      data-phase={phase}
    >
      <div key={key} className="absolute inset-0">
        {body}
      </div>
      {layer}
    </div>
  );
}

/** Loading: the final layout with flat bars at real sizes, nothing moves when the data lands. */
function LoadingResults({ phone, narrow }: { phone: boolean; narrow: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
      role="status"
      aria-busy="true"
      aria-label="Loading your results"
    >
      <div
        className={`flex items-center gap-2 ${phone ? "px-[18px] pt-[54px]" : "px-7 pt-[18px]"}`}
      >
        <Skeleton.Block width={44} height={44} className="rounded-pill" />
        <Skeleton.Block width={132} height={34} className="rounded-pill" />
        <Skeleton.Block width={84} height={34} className="rounded-pill" />
      </div>
      <div
        className={`mx-auto grid w-full ${phone ? "gap-6 px-[18px] pt-4" : "gap-x-14 gap-y-[34px] px-10 pt-4"}`}
        style={{
          maxWidth: narrow ? 640 : 1000,
          gridTemplateColumns: narrow ? "minmax(0,1fr)" : "1fr 1fr",
        }}
      >
        <div className="grid justify-items-center gap-3" style={{ gridColumn: "1 / -1" }}>
          <Skeleton.Circle size={phone ? 58 : 72} />
          <Skeleton.Block width={200} height={19} />
          <Skeleton.Circle size={phone ? 138 : 176} />
          <Skeleton.Block width={260} height={16} />
          <Skeleton.Block width="100%" height={44} className="max-w-[620px]" />
        </div>
        <div className="grid content-start gap-3">
          <Skeleton.Block width={90} height={12} />
          <Skeleton.Block height={58} className="rounded-pill" />
          <Skeleton.Block height={54} className="rounded-panel" />
        </div>
        <div className="grid content-start gap-4">
          <Skeleton.Block width={110} height={12} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2">
              <Skeleton.Block width="62%" height={14} />
              <Skeleton.Block height={6} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
