import { useId, useState, type KeyboardEvent } from "react";
import { CountUp } from "@/design-system/components/CountUp";
import { cn } from "@/design-system/cn";
import type { Allowance as AllowanceData } from "./mock-period";
import { useArrived } from "./arrive";

/*
 * Allowance: the plan’s question bank as one track, the questions used split
 * by section as segments that grow into place left to right, the rest of the
 * bank empty, and the legend as buttons: hover or focus previews a section,
 * a press pins it, arrows move between them, Escape unpins. Ported from Usage
 * Meter (21st.dev 35046, kuratlielia). Its odometer ticker became the design
 * system’s CountUp, its motion/react springs the ease-k fill every bar here
 * uses, and its amber "almost full", red "over limit" states and Lucide
 * alert icons were left out: a bank is never over, and a full one is said in
 * words. One hue, the accent at two strengths for the two sections.
 */
const MIX = [1, 0.55];

export function Allowance({
  data,
  label = "Questions",
  note,
  className,
}: {
  data: AllowanceData;
  label?: string;
  /** One line in words under the legend, for a full bank. */
  note?: string;
  className?: string;
}) {
  const arrived = useArrived();
  const titleId = useId();
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const items = [...data.parts, { id: "left", label: "Left", value: data.left }];
  const active = hover ?? pinned;
  const shown = items.find((i) => i.id === active) ?? null;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && pinned) {
      e.preventDefault();
      setPinned(null);
      return;
    }
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  };
  const dim = (id: string) => (active && active !== id ? "opacity-40" : "");
  return (
    <div role="group" aria-labelledby={titleId} className={cn("grid gap-2", className)}>
      <p className="flex items-baseline justify-between gap-3">
        <span id={titleId} className="text-dense font-medium">
          {label}
        </span>
        <span className="tabular text-dense text-muted">
          <span className="text-body font-medium text-text">
            <CountUp to={shown ? shown.value : data.used} />
          </span>{" "}
          {shown ? (shown.id === "left" ? "left" : `in ${shown.label}`) : `of ${fmt(data.bank)}`}
        </span>
      </p>
      <div
        role="img"
        aria-label={`${label}: ${fmt(data.used)} of ${fmt(data.bank)} used. ${data.parts.map((p) => `${p.label} ${fmt(p.value)}`).join(", ")}. ${fmt(data.left)} left.`}
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-[3px] bg-text/10"
      >
        {data.parts.map((p, i) =>
          p.value ? (
            <span
              key={p.id}
              className={cn(
                "block h-full origin-left transition-[transform,opacity] duration-700 ease-k",
                dim(p.id)
              )}
              style={{
                flex: `0 0 ${(p.value / data.bank) * 100}%`,
                transform: `scaleX(${arrived ? 1 : 0})`,
                transitionDelay: `${i * 70}ms`,
                background: `rgb(var(--k-accent) / ${MIX[i] ?? 0.3})`,
              }}
            />
          ) : null
        )}
      </div>
      <div
        role="group"
        aria-label={`${label} by section`}
        onKeyDown={onKey}
        className="flex flex-wrap gap-x-4 gap-y-1"
      >
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            aria-pressed={pinned === it.id}
            aria-label={`${it.label}, ${fmt(it.value)}`}
            onClick={() => setPinned((c) => (c === it.id ? null : it.id))}
            onFocus={() => setHover(it.id)}
            onBlur={() => setHover(null)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(it.id)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
            className={cn(
              "inline-flex min-h-tap items-center gap-1.5 rounded-control text-dense transition-opacity ease-k focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              dim(it.id)
            )}
          >
            <span
              aria-hidden="true"
              className={cn("h-2.5 w-4 rounded-[2px]", it.id === "left" && "bg-text/10")}
              style={
                it.id === "left"
                  ? undefined
                  : { background: `rgb(var(--k-accent) / ${MIX[i] ?? 0.3})` }
              }
            />
            <span className="text-muted">{it.label}</span>
            <span className="tabular font-medium">{fmt(it.value)}</span>
          </button>
        ))}
      </div>
      {note ? <p className="text-dense text-muted">{note}</p> : null}
    </div>
  );
}
