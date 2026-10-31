import { cn } from "../cn";
import { Icon } from "../icons";
import type { RailItem } from "./IconRail";

/** The phone's navigation: four or five destinations with short labels, 44px targets, safe area under it. */
export function BottomBar({
  items,
  active,
  onSelect,
  className,
}: {
  items: RailItem[];
  active: string;
  onSelect(id: string): void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "z-rail grid border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.slice(0, 5).map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(it.id)}
            className={cn(
              "relative grid min-h-[56px] place-items-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px] font-medium leading-none",
              on ? "text-text" : "text-muted"
            )}
          >
            <span
              className={cn(
                "grid h-7 w-12 place-items-center rounded-pill transition-colors ease-k",
                on && "bg-raised"
              )}
            >
              <Icon name={it.icon} size={24} />
            </span>
            <span className="truncate">{it.label}</span>
            {it.count ? (
              <span
                className="absolute left-1/2 top-1 ml-1 h-2 w-2 rounded-full bg-negative"
                aria-label={`${it.count} waiting`}
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
