import { Calculator, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const OFFICIAL_SAT_CALCULATOR = "https://www.desmos.com/testing/collegeboard/graphing";

/** A normal link leaves the current quiz, inputs and timer in their existing tab. */
export default function ExternalCalculatorLink({
  subject,
  className,
}: {
  subject?: string | null;
  className?: string;
}) {
  if (subject !== "math") return null;
  return (
    <a
      href={OFFICIAL_SAT_CALCULATOR}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open official SAT calculator in a new tab"
      title="Open official SAT calculator in a new tab"
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-taupe px-3 py-1 text-sm font-semibold text-ivory hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info",
        className
      )}
    >
      <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span>Calculator</span>
        <span className="text-[10px] font-normal">New tab</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only"> — official SAT calculator, opens in a new tab</span>
    </a>
  );
}
