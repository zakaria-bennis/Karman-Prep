import { useEffect, useRef, type ReactNode } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { CountUp } from "@/design-system/components/CountUp";
import { useConfetti } from "@/design-system/components/Confetti";
import { Token } from "@/design-system/marks";
import { formatClock } from "@/design-system/components/Timer";
import { SetStrip } from "./SetStrip";
import { TextLink } from "./Shell";
import type { SetResult } from "./session";

/*
 * The last screen of a practice set, session or trial: the strip, the score
 * counting up, the tokens, one line about what comes next, and one action.
 * The Peak-End rule: every flow ends on this clear, proud note. The confetti
 * fires once at the figure and is off under reduced motion.
 */
export function SetDone({
  title,
  result,
  lines,
  primary,
  secondary,
  stats,
}: {
  title: string;
  result: SetResult;
  lines: string[];
  primary: { label: string; onClick(): void };
  secondary?: { label: string; onClick(): void };
  stats?: { label: string; value: string }[];
}) {
  const fig = useRef<HTMLParagraphElement>(null);
  const { fire } = useConfetti();
  useEffect(() => {
    const t = setTimeout(() => fig.current && fire("score", fig.current), 500);
    return () => clearTimeout(t);
  }, [fire]);
  const pct = result.total ? Math.round((result.right / result.total) * 100) : 0;
  return (
    <Panel
      as="section"
      aria-label={title}
      className="mx-auto grid max-w-[560px] gap-5 p-5 text-center"
    >
      <h2 className="text-section">{title}</h2>
      <SetStrip
        cells={result.answers.map((a) => (a.correct ? "right" : "wrong"))}
        className="justify-center"
        size={result.answers.length > 12 ? "sm" : "md"}
      />
      <p ref={fig} className="tabular text-kpi-lg">
        <CountUp to={result.right} />
        <span className="text-kpi font-normal text-muted"> of {result.total}</span>
      </p>
      <dl className="grid grid-cols-3 divide-x divide-line text-center">
        <Cell label="Right" value={`${pct}%`} />
        <Cell label="Time" value={formatClock(result.seconds)} />
        <Cell
          label="Tokens"
          value={
            <span className="inline-flex items-center gap-1 text-gold">
              <Token size={18} />
              <CountUp to={result.tokens} prefix="+" />
            </span>
          }
        />
        {stats?.map((s) => (
          <Cell key={s.label} label={s.label} value={s.value} />
        ))}
      </dl>
      {lines.map((l) => (
        <p key={l} className="text-body text-muted">
          {l}
        </p>
      ))}
      <div className="flex flex-col items-center gap-3">
        <GlassButton variant="primary" onClick={primary.onClick}>
          {primary.label}
        </GlassButton>
        {secondary ? <TextLink onClick={secondary.onClick}>{secondary.label}</TextLink> : null}
      </div>
    </Panel>
  );
}

function Cell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-2 py-1">
      <dt className="text-dense text-muted">{label}</dt>
      <dd className="tabular text-body font-semibold">{value}</dd>
    </div>
  );
}
