import { useRef } from "react";
import { cn } from "@/design-system/cn";
import { useWidth } from "@/design-system/components/hooks";

/*
 * SeatLedger: the school's licence as the seats themselves, one square a
 * seat. Filled squares are seats taken by a student in a class, pale ones
 * seats taken by a student with no class yet, outlined ones free. Made for
 * Karman (no 21st.dev fit: the searches for a unit or waffle chart returned
 * 3D cube grids and loaders). The squares arrive in order on the first
 * paint, 6 ms apart, and sit still under reduced motion.
 */
export function SeatLedger({
  seats,
  inClass,
  unassigned,
  paused = false,
  className,
}: {
  seats: number;
  inClass: number;
  unassigned: number;
  paused?: boolean;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const width = useWidth(host);
  const cols = width && width < 420 ? 12 : 20;
  const used = inClass + unassigned;
  const free = Math.max(0, seats - used);
  const cells = Array.from({ length: seats }, (_, i) =>
    i < inClass ? "class" : i < used ? "none" : "free"
  );
  return (
    <div ref={host} className={cn("grid gap-3", className)}>
      <div
        role="img"
        aria-label={`${seats} seats: ${inClass} taken by students in a class, ${unassigned} by students with no class, ${free} free${paused ? ", all paused" : ""}`}
        className="grid max-w-[520px] gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((kind, i) => (
          <span
            key={i}
            className={cn(
              "k-arrive aspect-square rounded-[2px]",
              kind === "class" && (paused ? "bg-text/35" : "bg-accent"),
              kind === "none" && (paused ? "bg-text/20" : "bg-accent/35"),
              kind === "free" && "border border-text/25"
            )}
            style={{ animationDelay: `${i * 6}ms`, animationFillMode: "backwards" }}
          />
        ))}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-dense text-muted">
        <Swatch className={paused ? "bg-text/35" : "bg-accent"} label={`${inClass} in a class`} />
        <Swatch
          className={paused ? "bg-text/20" : "bg-accent/35"}
          label={`${unassigned} with no class`}
        />
        <Swatch className="border border-text/25" label={`${free} free`} />
      </p>
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={cn("inline-block h-3 w-3 rounded-[2px]", className)} />
      <span className="tabular">{label}</span>
    </span>
  );
}
