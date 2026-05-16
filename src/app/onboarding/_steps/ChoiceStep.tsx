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
      <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
        {icon} {prompt}
      </h2>
      {hint && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-6 space-y-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all",
              value === o.id
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
