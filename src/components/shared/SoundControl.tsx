"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundEnabled, setSoundEnabled, subscribeSoundPreference } from "@/lib/sound-preference";

export default function SoundControl() {
  const enabled = useSyncExternalStore(subscribeSoundPreference, soundEnabled, () => false);
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <div className="mt-4 border-t border-bronze/40 pt-3">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => setSoundEnabled(!enabled)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm text-ivory hover:bg-surface-raised"
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" aria-hidden="true" />
          Practice sounds
        </span>
        <span>{enabled ? "On" : "Off"}</span>
      </button>
      <p className="mt-1 text-xs leading-relaxed text-taupe">
        Off until you enable them. This setting applies to this page session.
      </p>
    </div>
  );
}
