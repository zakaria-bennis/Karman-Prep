import type { ReactNode } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";

/** The 48px top bar: the screen name, a menu or back control, at most one action. */
export function TopBar({
  title,
  leading,
  onLeading,
  action,
  className,
  heading = "h1",
}: {
  title: string;
  leading?: "menu" | "back" | "none";
  onLeading?(): void;
  action?: ReactNode;
  className?: string;
  /** h1 on a real screen (the one per screen); p when the bar is shown as a sample inside another page. */ heading?:
    | "h1"
    | "h2"
    | "p";
}) {
  const Heading = heading;
  return (
    <header
      className={cn(
        "z-sticky flex h-12 shrink-0 items-center gap-1 border-b border-line bg-panel px-1",
        className
      )}
    >
      {leading && leading !== "none" ? (
        <button
          type="button"
          aria-label={leading === "menu" ? "Menu" : "Back"}
          onClick={onLeading}
          className="grid h-11 w-11 place-items-center rounded-card text-text"
        >
          <Icon name={leading} size={24} />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <Heading className="min-w-0 flex-1 truncate text-section">{title}</Heading>
      <div className="flex min-w-11 justify-end">{action}</div>
    </header>
  );
}
