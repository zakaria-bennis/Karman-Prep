"use client";

// TRIAL, not for the live site: five openings for the guarantee page, for the founder to choose from
// (2026-11-13). Each is the same calculator (a starting SAT score and a plan give the promise and what comes
// back on a miss) drawn as a different picture. A strip at the bottom of the screen switches between them.
// Numbers: offer.ts. The words are drafts for his approval. Styles: guarantee-options.css.
// When he picks one, the other four and this strip are deleted in the same change.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { GUARANTEE as G, PRO_PLAN as PRO } from "@/lib/marketing/offer";
import { Cheque, Climb } from "./GuaranteeOpenerArt";
import {
  MAX,
  MIN,
  PLANS,
  Signature,
  deal,
  usd,
  useRun,
  type Deal,
  type PlanId,
} from "./guarantee-opener-kit";

function Slider({
  value,
  set,
  min = MIN,
  max = MAX,
  label,
}: {
  value: number;
  set: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <label className="go-slide" style={{ "--p": (value - min) / (max - min) } as CSSProperties}>
      <span>
        {label} <b className="num">{value}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={10}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
      />
    </label>
  );
}

function Plans({ value, set }: { value: PlanId; set: (p: PlanId) => void }) {
  return (
    <div className="go-plans" role="radiogroup" aria-label="Plan">
      {PLANS.map((p) => (
        <button
          type="button"
          role="radio"
          aria-checked={p.id === value}
          key={p.id}
          onClick={() => set(p.id)}
        >
          {p.short}
        </button>
      ))}
    </div>
  );
}

/** What comes back on a miss, in one line. */
function Miss({ d }: { d: Deal }) {
  if (d.gain === null)
    return (
      <p className="go-miss">
        From {G.noGuaranteeFrom} there is less room to climb, so the promise is simple: the score
        goes up, or your student gets {G.highStartProMonths} months of {PRO.name} free.
      </p>
    );
  return d.cohort ? (
    <p className="go-miss">
      If we come close, you get <b>{usd(d.half)}</b> back. If we don&rsquo;t, you get{" "}
      <b>all {usd(d.price)}</b> back. Or take {d.orElse}. You choose. Either way, you&rsquo;re
      covered.
    </p>
  ) : (
    <p className="go-miss">
      If we miss, you get <b>{usd(d.half)}</b> back, or {d.orElse}. You choose. Either way,
      you&rsquo;re covered.
    </p>
  );
}

type Props = {
  d: Deal;
  start: number;
  setStart: (n: number) => void;
  plan: PlanId;
  setPlan: (p: PlanId) => void;
};

/* 1. The number: one huge figure, the score we owe you. */
function TheNumber({ d, start, setStart, plan, setPlan }: Props) {
  const shown = useRun(d.target ?? start);
  return (
    <div className="go-in go1">
      <h1>Your student&rsquo;s score goes up, or your money comes back.</h1>
      <p className="go1-num" aria-live="polite">
        {d.target === null ? (
          <b className="go1-up">Higher</b>
        ) : (
          <b className="num">{Math.round(shown / 10) * 10}</b>
        )}
        <span>{d.gain === null ? "than today. Guaranteed." : `+${d.gain} points, guaranteed`}</span>
      </p>
      <Slider value={start} set={setStart} label="Starting SAT score" />
      <Plans value={plan} set={setPlan} />
      <Miss d={d} />
    </div>
  );
}

/* 2. The cheque: the refund, already made out to the family. */
function TheCheque({ d, start, setStart, plan, setPlan }: Props) {
  return (
    <div className="go-in go2">
      <div className="go2-say">
        <h1>If we miss the score, this check is yours.</h1>
        <Slider value={start} set={setStart} label="Starting SAT score" />
        <Plans value={plan} set={setPlan} />
        <Miss d={d} />
      </div>
      <Cheque d={d} />
    </div>
  );
}

/* 3. The pledge: one sentence the parent fills in, and our answer, signed. */
function ThePledge({ d, start, setStart, plan, setPlan }: Props) {
  const bump = (by: number) => setStart(Math.max(MIN, Math.min(MAX, start + by)));
  return (
    <div className="go-in go3">
      <p className="go3-you">
        &ldquo;My student has a{" "}
        <span className="go3-chip">
          <button type="button" aria-label="Ten points lower" onClick={() => bump(-10)}>
            &minus;
          </button>
          <input
            aria-label="Starting SAT score"
            inputMode="numeric"
            value={start}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, "").slice(0, 4));
              if (n >= 400) setStart(Math.min(MAX, Math.round(n / 10) * 10));
            }}
          />
          <button type="button" aria-label="Ten points higher" onClick={() => bump(10)}>
            +
          </button>
        </span>{" "}
        and is joining{" "}
        <span className="go3-chip">
          <select
            aria-label="Plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanId)}
          >
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name === "The cohort" ? "the cohort" : p.name}
              </option>
            ))}
          </select>
        </span>
        .&rdquo;
      </p>
      <h1 aria-live="polite">
        {d.target === null ? (
          <>
            Then we guarantee the score goes up. If it doesn&rsquo;t, {G.highStartProMonths} months
            of {PRO.name} are free.
          </>
        ) : (
          <>
            Then we guarantee a <b className="num">{d.target}</b>. If we miss, up to{" "}
            <b className="num">{usd(d.most)}</b> comes back to you.
          </>
        )}
      </h1>
      <Signature />
    </div>
  );
}

/* 4. The climb: the promise as a mountain, with what comes back marked on the way up. */
function TheClimb({ d, start, setStart, plan, setPlan }: Props) {
  return (
    <div className="go-in go4">
      <h1>We guarantee the score. If we fall short, your money comes back.</h1>
      <Climb d={d} />
      <div className="go-row">
        <Slider value={start} set={setStart} label="Starting SAT score" />
        <Plans value={plan} set={setPlan} />
      </div>
    </div>
  );
}

/* 5. The falling price: drag the result, watch what you ended up paying. */
function ThePrice({ d, start, setStart, plan, setPlan }: Props) {
  const top =
    d.target === null ? Math.min(G.topScore, start + 60) : Math.min(G.topScore, d.target + 40);
  const hit = d.target ?? Math.min(G.topScore, start + 10);
  const [result, setResult] = useState(hit);
  useEffect(() => setResult(hit), [hit]);
  const got = result - start;
  const paid =
    d.gain === null
      ? d.price
      : got >= d.gain || result >= G.topScore
        ? d.price
        : d.cohort && got < d.gain / 2
          ? 0
          : d.half;
  const shown = useRun(paid, 420);
  const verdict =
    d.gain === null
      ? got > 0
        ? "The score went up. We kept our promise."
        : `No rise: ${G.highStartProMonths} months of ${PRO.name} free.`
      : paid === d.price
        ? `+${got} points. We reached the score. You pay in full.`
        : paid === 0
          ? `+${got} points. We fell well short. You get all of it back.`
          : `+${got} points. ${d.cohort ? "We came close" : "We missed the score"}. You get half back.`;
  return (
    <div className="go-in go5">
      <h1>You only pay in full if we reach the score.</h1>
      <p className="go5-paid" aria-live="polite" data-cut={paid < d.price ? "" : undefined}>
        <small>What it cost you</small>
        <b className="num">{usd(Math.round(shown * 100) / 100)}</b>
        <s className="num">{usd(d.price)}</s>
      </p>
      <p className="go5-say">{verdict}</p>
      <Slider value={result} set={setResult} min={start} max={top} label="Drag the SAT result" />
      <div className="go-row">
        <Slider value={start} set={setStart} label="Starting SAT score" />
        <Plans value={plan} set={setPlan} />
      </div>
    </div>
  );
}

const OPTIONS: [string, (p: Props) => ReactNode][] = [
  ["The number", TheNumber],
  ["The check", TheCheque],
  ["The pledge", ThePledge],
  ["The climb", TheClimb],
  ["The falling price", ThePrice],
];

export default function GuaranteeOpeners() {
  const [at, setAt] = useState(0);
  const [start, setStart] = useState(1180);
  const [plan, setPlan] = useState<PlanId>("cohort");
  useEffect(() => {
    const o = Number(new URLSearchParams(location.search).get("o"));
    if (o >= 1 && o <= OPTIONS.length) setAt(o - 1);
  }, []);
  const View = OPTIONS[at][1];
  return (
    <section className="pg-hero go" id="top" data-o={at + 1}>
      <div className="mist" aria-hidden="true" />
      <View d={deal(start, plan)} start={start} setStart={setStart} plan={plan} setPlan={setPlan} />
      <nav className="go-pick" aria-label="Trial openings">
        {OPTIONS.map(([name], i) => (
          <button type="button" key={name} aria-pressed={i === at} onClick={() => setAt(i)}>
            {i + 1}. {name}
          </button>
        ))}
      </nav>
    </section>
  );
}
