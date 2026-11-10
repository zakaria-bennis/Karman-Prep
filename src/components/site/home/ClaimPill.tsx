"use client";

// The number in the headline: a solid shape that slams down once the words have formed, with its lettering
// cut out of it so the painting shows through (painted.css, .claim-pill). It can be pressed: the flock of
// birds in the sky gathers back into that number (Flock.tsx listens for "karman:flock"), and its landing
// startles them ("karman:slam").
import type { ReactNode } from "react";

export default function ClaimPill({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="claim-pill"
      aria-label={label}
      onClick={() => document.dispatchEvent(new CustomEvent("karman:flock"))}
      onAnimationEnd={(e) => {
        if (e.animationName === "pill-slam") document.dispatchEvent(new CustomEvent("karman:slam"));
      }}
    >
      {children}
    </button>
  );
}
