"use client";
import { useId, useState } from "react";
import {
  CalculatorScope,
  CalculatorTrigger,
  useCalculator,
} from "@/components/calculator/CalculatorScope";
/** Compatibility entrypoint for isolated Math cards. All calculator code runs locally. */
export default function ExternalCalculatorLink({
  subject,
  className,
  questionKey,
}: {
  subject?: string | null;
  className?: string;
  questionKey?: string;
}) {
  const scope = useCalculator();
  const [open, setOpen] = useState(false);
  const fallbackKey = useId();
  if (subject !== "math") return null;
  return (
    <span className={className}>
      {scope ? (
        <CalculatorTrigger />
      ) : (
        <CalculatorScope
          enabled
          open={open}
          onOpenChange={setOpen}
          questionKey={questionKey ?? fallbackKey}
        >
          <CalculatorTrigger />
        </CalculatorScope>
      )}
    </span>
  );
}
