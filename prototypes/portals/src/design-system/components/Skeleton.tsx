import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../cn";

/*
 * Skeleton: every section's loading state (rule 29). The final layout with
 * flat bars at real sizes, labels shown at once, no shimmer gradient, and no
 * layout shift when the data lands. The slots follow Skeleton (21st.dev 35156,
 * vijayksingh: Block, Text, Circle, Swap) and the shapes family (29863, ai2);
 * their pulse and sheen were dropped for a still placeholder.
 */
const BAR = "block rounded-[3px] bg-text/[0.08]";

function Block({
  width = "100%",
  height = 16,
  className,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  return <span aria-hidden="true" className={cn(BAR, className)} style={{ width, height }} />;
}

function Text({
  lines = 3,
  width = "100%",
  size = 15,
  className,
}: {
  lines?: number;
  width?: number | string;
  size?: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("grid gap-2", className)} style={{ width }}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className={BAR}
          style={{
            height: Math.round(size * 0.8),
            width: i === lines - 1 && lines > 1 ? "62%" : "100%",
          }}
        />
      ))}
    </span>
  );
}

function Circle({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 rounded-full bg-text/[0.08]", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** A list row where a Row will stand: a 20px title bar and a 12px state bar, on the row's pitch. */
function RowShape({ sub = false, className }: { sub?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex min-h-12 items-center gap-3 px-1", className)}>
      <span className="grid flex-1 gap-1.5">
        <Block width="58%" height={14} />
        {sub ? <Block width="34%" height={10} /> : null}
      </span>
      <Block width={20} height={20} />
    </span>
  );
}

/** A KPI where a figure will stand: the label at once, a 24px bar for the value. */
function Kpi({ label, lead = false }: { label: string; lead?: boolean }) {
  return (
    <span className="grid gap-1.5">
      <span className="text-dense text-muted">{label}</span>
      <Block width={lead ? 88 : 64} height={lead ? 36 : 24} />
    </span>
  );
}

/** Shapes while loading; the content in the same place when it arrives, so nothing below moves. */
function Swap({
  loading,
  fallback,
  children,
  label = "Loading",
}: {
  loading: boolean;
  fallback: ReactNode;
  children: ReactNode;
  label?: string;
}) {
  const shown = useRef(false);
  useEffect(() => {
    if (!loading) shown.current = true;
  }, [loading]);
  if (loading)
    return (
      <div role="status" aria-busy="true" aria-label={label}>
        {fallback}
      </div>
    );
  return <div className={shown.current ? undefined : "k-arrive"}>{children}</div>;
}

export const Skeleton = Object.assign(Block, { Block, Text, Circle, Row: RowShape, Kpi, Swap });
