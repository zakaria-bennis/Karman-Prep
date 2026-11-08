import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../cn";

/**
 * Panel (rule 50, second sentence): heavier and darker than a control. An
 * opaque tinted surface, 92 percent of the surface token over the canvas, a
 * 1px hairline edge from the border token, radius 12, no sheen, no shadow,
 * never glass. A glass control may sit on a panel; glass never sits on glass.
 */
export const Panel = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" | "aside" }
>(function Panel({ as: Tag = "div", className, ...rest }, ref) {
  return (
    <Tag
      ref={ref}
      className={cn("rounded-panel border border-line bg-panel", className)}
      {...rest}
    />
  );
});

/** A raised well inside a panel (a track, a key-value well): one more tone step, no edge. */
export function Well({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-raised", className)} {...rest} />;
}
