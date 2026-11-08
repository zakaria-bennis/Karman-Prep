import { useState, type ReactNode } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { isMuted, setMuted } from "../sfx";

/*
 * The screen's two quiet controls and the one shimmer. Sound is off until the
 * student turns it on (a glass icon button; the icon is drawn here in the
 * design system's stroke, a candidate for its icon set). Replay restarts the
 * ending for the review. The shimmer is one sheen that sweeps the next step
 * (Shimmer Button, 21st.dev 38278), on no other control.
 */
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5Z" />
      {on ? (
        <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.5 7.5 0 0 1 0 10.8" />
      ) : (
        <path d="m15.5 9.5 5 5m0-5-5 5" />
      )}
    </svg>
  );
}

export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(!isMuted());
  return (
    <GlassButton
      size="icon"
      aria-pressed={on}
      className={className}
      icon={<SoundIcon on={on} />}
      onClick={() => {
        setMuted(on);
        setOn(!on);
      }}
    >
      {on ? "Sound on" : "Sound off"}
    </GlassButton>
  );
}

export function ReplayLink({ onReplay, className }: { onReplay(): void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onReplay}
      className={`inline-flex min-h-tap items-center px-1 text-dense font-semibold text-muted underline-offset-4 hover:text-text hover:underline ${className ?? ""}`}
    >
      Replay
    </button>
  );
}

export function Shimmer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`k-shimmer ${className ?? ""}`}>
      {children}
      <span className="d10-sheen" aria-hidden="true" />
    </span>
  );
}
