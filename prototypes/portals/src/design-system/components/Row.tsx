import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";

/**
 * A row says what it is. A second line appears only when it carries a date,
 * a due time or a state the person needs (rule 51), so `sub` is typed that way.
 */
export interface RowProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  sub?: { kind: "date" | "due" | "state"; text: string; tone?: "muted" | "negative" | "positive" };
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?(): void;
  href?: string;
  /** Marks the current item in a list that drives a detail view. */
  selected?: boolean;
}

export function Row({
  title,
  sub,
  leading,
  trailing,
  onPress,
  href,
  selected,
  className,
  ...rest
}: RowProps) {
  const interactive = Boolean(onPress || href);
  const Tag: "a" | "button" | "div" = href ? "a" : onPress ? "button" : "div";
  const tone =
    sub?.tone === "negative"
      ? "text-negative"
      : sub?.tone === "positive"
        ? "text-positive"
        : "text-muted";
  return (
    <Tag
      {...(Tag === "button" ? { type: "button" } : {})}
      {...(href ? { href } : {})}
      onClick={onPress}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 px-1 py-2 text-left",
        interactive &&
          "cursor-pointer rounded-card transition-colors hover:bg-raised/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
        selected && "bg-raised",
        className
      )}
      {...(rest as object)}
    >
      {leading ? (
        <span className="flex w-6 shrink-0 justify-center text-muted [&>svg]:block">{leading}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{title}</span>
        {sub ? (
          <span className={cn("mt-0.5 block truncate text-dense", tone)}>{sub.text}</span>
        ) : null}
      </span>
      {trailing ? <span className="tabular shrink-0 text-dense text-muted">{trailing}</span> : null}
      {interactive ? <Icon name="chevronRight" size={20} className="shrink-0 text-muted" /> : null}
    </Tag>
  );
}

/** Rows separated by 1px rules; the list says its total when it is capped. */
export function List({
  children,
  className,
  total,
  viewAll,
}: {
  children: ReactNode;
  className?: string;
  total?: string;
  viewAll?: ReactNode;
}) {
  return (
    <div className={cn("grid", className)}>
      <div className="divide-y divide-line">{children}</div>
      {total || viewAll ? (
        <div className="flex items-center justify-between pt-2 text-dense text-muted">
          <span>{total}</span>
          {viewAll}
        </div>
      ) : null}
    </div>
  );
}
