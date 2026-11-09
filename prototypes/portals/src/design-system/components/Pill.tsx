import type { ReactNode } from "react";
import { cn } from "../cn";

/** A pale tint with dark text of the same hue; inside rows and beside values only, never above a heading. */
export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "positive" | "negative" | "notice" | "accent";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-raised text-text",
    positive: "bg-positive-bg text-positive-ink",
    negative: "bg-negative-bg text-negative-ink",
    notice: "bg-notice-bg text-notice-ink",
    accent: "bg-accent/15 text-text",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 flex-none items-center whitespace-nowrap rounded-chip px-1.5 text-small font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
