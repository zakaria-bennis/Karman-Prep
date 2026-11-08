import { useCallback, useId, useRef, type KeyboardEvent } from "react";
import { cn } from "../cn";
import { useTheme } from "../theme";
import { useLiquidGlass } from "./useLiquidGlass";

/*
 * GlassSegmented: ported from Segmented Control (21st.dev 23552, ddoemonn) for
 * its grid, thumb and keyboard model; the thumb is a clear glass control riding
 * on an opaque raised track (never glass on glass), and the thumb moves on the
 * quick spring instead of a motion value.
 */
export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface GlassSegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  /** Full width (phones under 480px); otherwise as wide as its options. */
  fill?: boolean;
}

export function GlassSegmented({
  options,
  value,
  onChange,
  label,
  className,
  fill,
}: GlassSegmentedProps) {
  const theme = useTheme();
  const thumbRef = useRef<HTMLSpanElement | null>(null);
  const glass = useLiquidGlass(thumbRef, { recipe: theme.glass, dark: theme.dark, refraction: 8 });
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const count = Math.max(1, options.length);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const seek = useCallback(
    (from: number, dir: number) => {
      let i = from;
      for (let k = 0; k < count; k++) {
        i = (i + dir + count) % count;
        if (!options[i]?.disabled) return i;
      }
      return from;
    },
    [count, options]
  );
  const go = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    buttons.current[i]?.focus();
    if (o.value !== value) onChange(o.value);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const map: Record<string, () => number> = {
      ArrowRight: () => seek(i, 1),
      ArrowDown: () => seek(i, 1),
      ArrowLeft: () => seek(i, -1),
      ArrowUp: () => seek(i, -1),
      Home: () => seek(count - 1, 1),
      End: () => seek(0, -1),
    };
    const f = map[e.key];
    if (!f) return;
    e.preventDefault();
    go(f());
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative select-none rounded-pill border border-line bg-raised p-[2px]",
        fill ? "flex w-full" : "inline-flex",
        className
      )}
    >
      <div
        className="relative grid min-h-[44px] w-full"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(44px, 1fr))` }}
      >
        <span
          ref={thumbRef}
          aria-hidden="true"
          data-recipe={glass.recipe}
          className="k-glass pointer-events-none absolute inset-y-0 left-0"
          style={{
            width: `${100 / count}%`,
            transform: `translateX(${index * 100}%)`,
            transition: "transform var(--k-spring-quick-ms) var(--k-spring-quick)",
          }}
        >
          {glass.layers}
        </span>
        {options.map((o, i) => (
          <button
            key={o.value}
            ref={(n) => {
              buttons.current[i] = n;
            }}
            id={`${id}-${o.value}`}
            type="button"
            role="radio"
            aria-checked={i === index}
            aria-disabled={o.disabled || undefined}
            tabIndex={i === index ? 0 : -1}
            onClick={() => !o.disabled && go(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative z-[1] min-h-[44px] rounded-pill px-3 text-[14px] font-semibold leading-none transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
              o.disabled
                ? "cursor-not-allowed text-muted/60"
                : i === index
                  ? "text-text"
                  : "cursor-pointer text-muted hover:text-text"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
