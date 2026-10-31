"use client";

import { cn } from "@/lib/utils";

export function ChoiceStep({
  icon,
  prompt,
  hint,
  options,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  prompt: string;
  hint?: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-ivory dark:text-ivory">
        {icon} {prompt}
      </h2>
      {hint && <p className="mt-2 text-sm text-taupe dark:text-taupe">{hint}</p>}
      <div className="mt-6 space-y-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all",
              value === o.id
                ? "border-info/40 bg-info/10 text-info dark:bg-info/20 dark:text-info-bright"
                : "border-bronze bg-surface text-ivory hover:border-info/40 dark:border-bronze dark:bg-surface-raised/40 dark:text-ivory"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
