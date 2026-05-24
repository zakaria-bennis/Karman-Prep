"use client";

// ============================================================
// DeviceFrame — viewport-constraining wrapper around the
// QuestionPreview render. Lets the admin see how a question
// looks at a phone / tablet / desktop width without resizing
// the actual browser.
//
// The frame is a centered fixed-width column with a subtle
// border + drop shadow that hints at a device chrome. The
// inner content is the unmodified QuestionPreview tree —
// CSS only, no layout swap, so the same component the
// student sees is the one we render here.
//
// "full" width skips the frame entirely (default behavior of
// the old preview page).
// ============================================================

import { cn } from "@/lib/utils";

export type DeviceWidth = "mobile" | "tablet" | "desktop" | "full";

const WIDTHS: Record<DeviceWidth, string> = {
  // Tailwind sets these as max-w with arbitrary px values. Numbers
  // match Playwright's mobile-chrome / mobile-safari profile
  // (375 = iPhone 14 width) and SAT prep's most common laptop pair
  // (1440 = MacBook Air baseline, 768 = iPad portrait).
  mobile: "max-w-[375px]",
  tablet: "max-w-[768px]",
  desktop: "max-w-[1440px]",
  full: "max-w-none",
};

export function DeviceFrame({
  width,
  children,
}: {
  width: DeviceWidth;
  children: React.ReactNode;
}) {
  if (width === "full") {
    // Skip the chrome entirely — the inner panel uses the full
    // available column width.
    return <div className="h-full">{children}</div>;
  }
  return (
    <div className="flex h-full w-full justify-center overflow-auto bg-slate-950/40 p-4">
      <div
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl shadow-black/40",
          WIDTHS[width]
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Segmented control used in the top toolbar. */
export function DeviceFrameToggle({
  value,
  onChange,
}: {
  value: DeviceWidth;
  onChange: (v: DeviceWidth) => void;
}) {
  const opts: Array<{ value: DeviceWidth; label: string; px: string }> = [
    { value: "mobile", label: "Mobile", px: "375" },
    { value: "tablet", label: "Tablet", px: "768" },
    { value: "desktop", label: "Desktop", px: "1440" },
    { value: "full", label: "Full", px: "—" },
  ];
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
              active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
            )}
            title={`${o.label} (${o.px}px)`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
