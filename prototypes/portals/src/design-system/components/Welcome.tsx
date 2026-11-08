import { useMemo } from "react";
import { cn } from "../cn";
import { pickWelcome, type WelcomeContext } from "@/mock/welcomes";

/*
 * Welcome: one line above the student dashboard, chosen by time of day, the
 * weekday, class days, test season, coming back and a tough set, never the
 * same line twice in a row (docs/design/portal-welcomes.md). The line takes
 * the place of a greeting header; it is a sentence, not a title.
 */
const KEY = "karman-welcome-last";

export function Welcome({
  name,
  context,
  className,
}: {
  name?: string;
  context: WelcomeContext;
  className?: string;
}) {
  const line = useMemo(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(KEY);
    } catch {
      /* storage can be off */
    }
    const picked = pickWelcome(context, last, Boolean(name));
    try {
      localStorage.setItem(KEY, picked.id);
    } catch {
      /* storage can be off */
    }
    return picked.text.replace("{name}", name ?? "");
  }, [context, name]);
  return <p className={cn("text-body text-muted", className)}>{line}</p>;
}
