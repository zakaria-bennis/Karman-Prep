import type React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/design-system/cn";

/*
 * RankBars: who leads, and by how much. Label, a bar from zero, the value,
 * the leading row in the accent and the rest in a neutral tint. Ported from
 * Rank Bars (21st.dev 29452, eugeneshilow): the three-column row, the zero
 * based scale, the hero row, the bars growing from the left on arrival. Its
 * categorical palette, per-row colours and viewport observer were left out:
 * one hue, and the bars grow when the block mounts, still under reduced
 * motion.
 */
export interface RankItem {
  id: string;
  label: string;
  value: number;
  valueLabel?: string;
  /** Only for a date or a state (rule 51). */
  sub?: string;
  highlight?: boolean;
  tone?: "accent" | "negative";
}

export function RankBars({
  items,
  max,
  className,
  onPress,
  labelWidth,
}: {
  items: RankItem[];
  max?: number;
  className?: string;
  onPress?(id: string): void;
  /** The label column, as a CSS length; 9rem by default. */
  labelWidth?: string;
}) {
  const reduce = useReducedMotion();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul
      className={cn("grid gap-2.5", className)}
      style={labelWidth ? ({ "--rank-label": labelWidth } as React.CSSProperties) : undefined}
    >
      {items.map((it, i) => {
        const w = Math.max(0, Math.min(100, (it.value / top) * 100));
        const Tag = onPress ? "button" : "div";
        return (
          <li key={it.id}>
            <Tag
              {...(onPress ? { type: "button", onClick: () => onPress(it.id) } : {})}
              className={cn(
                "grid w-full grid-cols-[minmax(0,var(--rank-label,9rem))_minmax(0,1fr)_4.5rem] items-center gap-3 text-left",
                onPress &&
                  "min-h-tap rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              )}
            >
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-dense",
                    it.highlight ? "font-semibold" : "font-medium"
                  )}
                  title={it.label}
                >
                  {it.label}
                </span>
                {it.sub ? (
                  <span className="block truncate text-small text-muted">{it.sub}</span>
                ) : null}
              </span>
              <span className="bg-text/8 h-3 overflow-hidden rounded-r-chip" aria-hidden="true">
                <motion.span
                  className={cn(
                    "block h-full origin-left rounded-r-chip",
                    it.tone === "negative"
                      ? "bg-negative"
                      : it.highlight
                        ? "bg-accent"
                        : "bg-text/30"
                  )}
                  style={{ width: `${w}%` }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span
                className={cn(
                  "tabular text-right text-dense",
                  it.highlight ? "font-semibold" : "text-muted"
                )}
              >
                {it.valueLabel ?? it.value}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
