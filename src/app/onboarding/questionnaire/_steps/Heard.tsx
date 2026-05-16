"use client";

import { cn } from "@/lib/utils";
import { Label } from "./shared";

const HEARD_OPTIONS = [
  "Friend or classmate",
  "Parent or family member",
  "Tutor or teacher",
  "School counselor",
  "Instagram",
  "TikTok",
  "Google search",
  "YouTube",
  "Reddit",
  "Other",
];

export function HeardStep(props: {
  heardAboutStrata: string;
  setHeardAboutStrata: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>How did you hear about Karman?</Label>
      <div className="grid grid-cols-2 gap-2">
        {HEARD_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => props.setHeardAboutStrata(opt)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
              props.heardAboutStrata === opt
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
