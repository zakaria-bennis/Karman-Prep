"use client";
import { useState } from "react";
import {
  CalculatorScope,
  CalculatorTrigger,
  useCalculator,
} from "@/components/calculator/CalculatorScope";
/** Compatibility entrypoint for isolated Math cards. All calculator code runs locally. */
export default function ExternalCalculatorLink({
  subject,
  className,
}: {
  subject?: string | null;
  className?: string;
}) {
  const scope = useCalculator();
  const [open, setOpen] = useState(false);
  if (subject !== "math") return null;
  return (
    <span className={className}>
      {scope ? (
        <CalculatorTrigger />
      ) : (
        <CalculatorScope enabled open={open} onOpenChange={setOpen}>
          <CalculatorTrigger />
        </CalculatorScope>
      )}
    </span>
  );
}
