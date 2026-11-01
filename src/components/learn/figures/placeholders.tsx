// ============================================================
// Same-size stand-ins for the engine views while the figure engine chunk
// loads (engine-loader.tsx), so a figure that mounts on the client does not
// make the page jump when it arrives. Server-rendered figures never show
// them: hydration keeps the server's HTML.
// ============================================================

import type { CSSProperties } from "react";
import type { Box } from "@/lib/figures/engine/plane";
import { cn } from "@/lib/utils";

/** One table row's height in the house table style (TableView's CELL), and the frame's rules. */
const ROW_REM = 2.75;

/** A drawn figure's box: its default box's aspect, at the width and height cap the view uses. */
export function DrawingPlaceholder({ box, className }: { box: Box; className?: string }) {
  const style: CSSProperties = { aspectRatio: `${box.width} / ${box.height}` };
  return <div aria-hidden data-figure-placeholder="" className={className} style={style} />;
}

/** A native table's frame, one row height per body row plus its heading and caption rows. */
export function TablePlaceholder({
  rows,
  className,
}: {
  /** Body rows plus heading, caption and note rows. */
  rows: number;
  className?: string;
}) {
  const style: CSSProperties = { minHeight: `${Math.max(1, rows) * ROW_REM}rem` };
  return (
    <div
      aria-hidden
      data-figure-placeholder=""
      className={cn(
        "my-4 w-full max-w-md rounded-lg border border-[color:var(--figure-ink-muted)]",
        className
      )}
      style={style}
    />
  );
}

/** The rows TablePlaceholder reserves for table data: body, heading, merged headings, caption, note. */
export function tableRows(table: {
  rows?: unknown;
  header?: unknown;
  header_row?: unknown;
  groups?: unknown;
  header_groups?: unknown;
  title?: unknown;
  caption?: unknown;
  note?: unknown;
  footer_note?: unknown;
}): number {
  const count = (v: unknown) => (Array.isArray(v) && v.length > 0 ? 1 : 0);
  return (
    (Array.isArray(table.rows) ? table.rows.length : 1) +
    count(table.header ?? table.header_row) +
    count(table.groups ?? table.header_groups) +
    (table.title || table.caption ? 1 : 0) +
    (table.note || table.footer_note ? 1 : 0)
  );
}
