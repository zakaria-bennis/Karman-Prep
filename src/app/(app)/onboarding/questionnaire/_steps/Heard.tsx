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
  heardAboutKarman: string;
  setHeardAboutKarman: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>How did you hear about Karman?</Label>
      <div className="grid grid-cols-2 gap-2">
        {HEARD_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => props.setHeardAboutKarman(opt)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
              props.heardAboutKarman === opt
                ? "border-info/40 bg-info text-ivory"
                : "border-ivory/10 bg-surface/[0.03] text-ivory hover:border-ivory/30"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
