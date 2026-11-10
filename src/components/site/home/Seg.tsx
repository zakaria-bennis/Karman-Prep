"use client";

// A switch between a few choices, with one thumb that springs from the old choice to the new one (it
// overshoots a little and settles). Used for every left-to-right switch on the home page. As tabs it follows
// the tab pattern (arrow keys move, the chosen tab is the one in the tab order); otherwise the buttons are
// plain pressed buttons.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function Seg({
  labels,
  value,
  onChange,
  label,
  tabs,
  small = false,
}: {
  labels: string[];
  value: number;
  onChange: (i: number) => void;
  /** Names the group for screen readers. */
  label: string;
  /** For tabs: the id prefix shared with the panels (`${tabs}-t0` controls `${tabs}-p0`). */
  tabs?: string;
  small?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  useIsoLayout(() => {
    const el = host.current;
    if (!el) return;
    const place = () => {
      const b = el.querySelectorAll<HTMLButtonElement>("button")[value];
      if (b) setThumb({ x: b.offsetLeft, w: b.offsetWidth });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, labels.length]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (value + step + labels.length) % labels.length;
    onChange(next);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };

  return (
    <div
      ref={host}
      className={`seg ${small ? "small" : ""}`}
      role={tabs ? "tablist" : "group"}
      aria-label={label}
      onKeyDown={onKey}
    >
      <span
        className="seg-thumb"
        aria-hidden="true"
        style={thumb ? { transform: `translateX(${thumb.x}px)`, width: thumb.w } : { opacity: 0 }}
      />
      {labels.map((text, i) =>
        tabs ? (
          <button
            key={text}
            type="button"
            role="tab"
            id={`${tabs}-t${i}`}
            aria-selected={value === i}
            aria-controls={`${tabs}-p${i}`}
            tabIndex={value === i ? 0 : -1}
            data-on={value === i || undefined}
            onClick={() => onChange(i)}
          >
            {text}
          </button>
        ) : (
          <button
            key={text}
            type="button"
            aria-pressed={value === i}
            data-on={value === i || undefined}
            onClick={() => onChange(i)}
          >
            {text}
          </button>
        )
      )}
    </div>
  );
}
