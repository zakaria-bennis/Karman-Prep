// The settings popover's first control (SETTINGS-11, founder decision 2026-10-26): the expression
// list's text size as a notched slider with exactly seven steps, a small A on the left and a large
// A on the right. It is a native range input (step 1), so it snaps to a notch while dragging and
// arrow keys, Page Up and Down, Home and End move it the platform's way; it applies as it moves.
// The default notch (3) is marked under the track. Each change of notch gives a tick you can see:
// the thumb pulses and the notch it lands on lights, as a haptic would, never on a drag that stays
// on one notch; reduced motion keeps the colour change and drops the pulse.

import { useEffect, useId, useRef, useState, type CSSProperties, type JSX } from "react";
import { DEFAULT_SETTINGS, DISPLAY_SIZES, type DisplaySize } from "@/lib/calculator/core/api/types";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";

const DEFAULT_SIZE = DEFAULT_SETTINGS.displaySize;
const LAST = DISPLAY_SIZES.length;

/** "Size 3 of 7, default", as a screen reader hears the slider's value. */
export function textSizeText(size: DisplaySize): string {
  return `Size ${size} of ${LAST}${size === DEFAULT_SIZE ? ", default" : ""}`;
}

export function TextSizeSlider(): JSX.Element {
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const id = useId();
  const size = settings.displaySize;
  // Bumped on every notch change; the key restarts the tick animation.
  const [tick, setTick] = useState(0);
  const last = useRef(size);
  useEffect(() => {
    if (last.current === size) return;
    last.current = size;
    setTick((n) => n + 1);
  }, [size]);

  const progress = (size - 1) / (LAST - 1);
  return (
    <div className="kc-size" style={{ "--kc-size-progress": progress } as CSSProperties}>
      <label className="kc-size-title" htmlFor={`${id}-range`}>
        Text Size
      </label>
      <div className="kc-size-row">
        <span className="kc-size-letter" data-end="small" aria-hidden="true">
          A
        </span>
        <div className="kc-size-control">
          <div className="kc-size-track" aria-hidden="true">
            <span className="kc-size-fill" />
            {DISPLAY_SIZES.map((notch) => (
              <span
                key={notch}
                className="kc-size-notch"
                style={{ "--kc-notch": (notch - 1) / (LAST - 1) } as CSSProperties}
                data-default={notch === DEFAULT_SIZE ? "true" : undefined}
                data-passed={notch <= size ? "true" : undefined}
                data-landed={notch === size && tick > 0 ? String(tick % 2) : undefined}
              />
            ))}
          </div>
          <input
            id={`${id}-range`}
            className="kc-size-range"
            type="range"
            min={1}
            max={LAST}
            step={1}
            value={size}
            aria-valuetext={textSizeText(size)}
            data-tick={tick > 0 ? String(tick % 2) : undefined}
            onChange={(event) =>
              engine.updateSettings({
                displaySize: Number(event.currentTarget.value) as DisplaySize,
              })
            }
          />
          <span
            className="kc-size-default"
            aria-hidden="true"
            style={{ "--kc-notch": (DEFAULT_SIZE - 1) / (LAST - 1) } as CSSProperties}
          >
            Default
          </span>
        </div>
        <span className="kc-size-letter" data-end="large" aria-hidden="true">
          A
        </span>
      </div>
    </div>
  );
}
