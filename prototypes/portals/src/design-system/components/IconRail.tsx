import { cn } from "../cn";
import { Icon, type IconName } from "../icons";

/*
 * IconRail: the desktop navigation (rule 52), a slim rail 64px wide with 24px
 * icons on 44px targets, the K mark at the top, a tooltip and an accessible
 * name on every icon. The active item is a raised pill that slides on the
 * settle spring (the shared active background of Animated Sidebar, 21st.dev
 * 29334, starc007; its labelled sidebar, submenus and motion library were not
 * ported). Utilities sit at the bottom.
 */
export interface RailItem {
  id: string;
  label: string;
  icon: IconName;
  /** A count only on a queue that needs action. */
  count?: number;
}

export interface IconRailProps {
  items: RailItem[];
  bottom?: RailItem[];
  active: string;
  onSelect(id: string): void;
  className?: string;
}

const PITCH = 52;

function RailButton({
  item,
  on,
  onSelect,
}: {
  item: RailItem;
  on: boolean;
  onSelect(id: string): void;
}) {
  return (
    <button
      type="button"
      aria-label={item.label}
      aria-current={on ? "page" : undefined}
      onClick={() => onSelect(item.id)}
      data-tip={item.label}
      className={cn(
        "k-tip relative grid h-11 w-11 place-items-center rounded-card transition-colors ease-k",
        on ? "text-text" : "text-muted hover:text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      )}
    >
      <Icon name={item.icon} size={24} />
      {item.count ? (
        <span
          className="absolute right-1 top-1 min-w-[18px] rounded-pill bg-negative px-1 text-center text-[11px] font-semibold leading-[18px] text-white"
          aria-label={`${item.count} waiting`}
        >
          {item.count}
        </span>
      ) : null}
    </button>
  );
}

export function IconRail({ items, bottom = [], active, onSelect, className }: IconRailProps) {
  const index = items.findIndex((i) => i.id === active);
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "relative z-rail flex h-full w-16 shrink-0 flex-col items-center border-r border-line bg-panel py-3",
        className
      )}
    >
      <a
        href="#/"
        aria-label="Karman home"
        className="mb-3 grid h-11 w-11 min-w-11 shrink-0 place-items-center rounded-card text-text"
      >
        <Icon name="mark" size={24} />
      </a>
      <div className="relative grid gap-2" style={{ gridAutoRows: PITCH - 8 }}>
        {index >= 0 ? (
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 h-11 w-11 rounded-card bg-raised"
            style={{
              transform: `translateY(${index * PITCH}px)`,
              transition: "transform var(--k-spring-settle-ms) var(--k-spring-settle)",
            }}
          />
        ) : null}
        {items.map((it) => (
          <RailButton key={it.id} item={it} on={it.id === active} onSelect={onSelect} />
        ))}
      </div>
      <div className="mt-auto grid gap-2">
        {bottom.map((it) => (
          <RailButton key={it.id} item={it} on={it.id === active} onSelect={onSelect} />
        ))}
      </div>
    </nav>
  );
}
