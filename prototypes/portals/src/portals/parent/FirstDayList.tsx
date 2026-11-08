import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/cn";
import type { FirstDayItem } from "./mock";

/*
 * FirstDayList: what will appear and when, for a student who signed up today.
 * Ported from Progress List (21st.dev 40127, sltowl): done, current and
 * pending states down one list; its icon package became the design system’s
 * check and two drawn circles, and the spinner became a still accent ring,
 * since nothing is loading. The second line is the date or the condition.
 */
export function FirstDayList({ items, className }: { items: FirstDayItem[]; className?: string }) {
  return (
    <ol className={cn("divide-y divide-line", className)}>
      {items.map((it) => (
        <li key={it.id} className="flex min-h-12 items-center gap-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center">
            {it.state === "done" ? (
              <Icon name="check" size={20} className="text-positive" label="Done" />
            ) : it.state === "current" ? (
              <span
                aria-label="Next"
                role="img"
                className="block h-4 w-4 rounded-full border-2 border-accent"
              />
            ) : (
              <span
                aria-label="To come"
                role="img"
                className="block h-4 w-4 rounded-full border border-border"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-body",
                it.state === "pending" ? "text-muted" : "font-medium text-text"
              )}
            >
              {it.title}
            </span>
            <span className="block truncate text-dense text-muted">{it.when}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
