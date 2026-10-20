// The settings popover's own controls, drawn to the reference calculator's measurements
// (popovers-menus.md VIS-11 to VIS-19): a checkbox with a square box and a blue tick, an on/off
// toggle, a segmented choice, the round grid-type buttons and their glyphs. Each wraps a native
// input, so roles, names, keyboard behaviour and the checked state stay the browser's own.

import type { JSX, ReactNode, Ref } from "react";

export interface SettingCheckProps {
  label: string;
  /** The accessible name when it differs from the visible label (e.g. "Show x-axis"). */
  name?: string;
  size?: "normal" | "small" | "axis";
  checked: boolean;
  onChange(checked: boolean): void;
}

/** VIS-11: our own tick, drawn past the box's top-right corner as the reference's is. */
function TickGlyph(): JSX.Element {
  return (
    <svg className="kc-check-tick" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3 10.8 9.2 16.2 18.8 4.8" />
    </svg>
  );
}

/** A checkbox named by the <label> around it (or by `name`). */
export function SettingCheck(props: SettingCheckProps): JSX.Element {
  return (
    <label className="kc-check" data-size={props.size ?? "normal"}>
      <span className="kc-check-box">
        <input
          type="checkbox"
          aria-label={props.name}
          checked={props.checked}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
        />
        <TickGlyph />
      </span>
      <span className="kc-check-text">{props.label}</span>
    </label>
  );
}

/** VIS-14: a 30 by 10 track with an 18 px knob that slides 12 px when on. */
export function SettingToggle(props: {
  name: string;
  checked: boolean;
  onChange(checked: boolean): void;
  inputRef?: Ref<HTMLInputElement>;
}): JSX.Element {
  return (
    <label className="kc-toggle">
      <input
        ref={props.inputRef}
        type="checkbox"
        aria-label={props.name}
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span className="kc-toggle-track" aria-hidden="true" />
      <span className="kc-toggle-knob" aria-hidden="true" />
    </label>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode; // VIS-13: the mini theme shows an icon, named by `label`
}

/**
 * VIS-12: a full-width row of joined radio buttons; the selected one is filled dark grey. VIS-13:
 * the "mini" theme shows icons, the selected one tinted blue.
 */
export function SettingSegments<T extends string>(props: {
  name: string; // the radio group's form name
  label: string; // the radiogroup's accessible name
  options: readonly SegmentOption<T>[];
  value: T;
  onSelect(value: T): void;
  theme?: "default" | "mini";
}): JSX.Element {
  const mini = props.theme === "mini";
  return (
    <div
      className="kc-segments"
      data-theme={mini ? "mini" : undefined}
      role="radiogroup"
      aria-label={props.label}
    >
      {props.options.map((option) => (
        <label key={option.value} className="kc-segment">
          <input
            type="radio"
            name={props.name}
            aria-label={mini ? option.label : undefined}
            checked={props.value === option.value}
            onChange={() => props.onSelect(option.value)}
          />
          {mini ? (
            <span className="kc-segment-icon" aria-hidden="true">
              {option.icon}
            </span>
          ) : (
            <span className="kc-segment-text">{option.label}</span>
          )}
        </label>
      ))}
    </div>
  );
}

/** VIS-18: one 28 px round grid-type button, a radio named `label` showing `glyph`. */
export function GridTypeButton(props: {
  name: string;
  label: string;
  checked: boolean;
  onSelect(): void;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="kc-grid-type">
      <input
        type="radio"
        name={props.name}
        aria-label={props.label}
        checked={props.checked}
        onChange={props.onSelect}
      />
      {props.children}
    </label>
  );
}

const R = 12; // the glyphs' radius inside their 26 px box

/** Five lines each way, 4.25 px apart, each cut at the circle's edge (our own drawing). */
const CARTESIAN_PATH = [-8.5, -4.25, 0, 4.25, 8.5]
  .map((d) => {
    const h = Math.sqrt(R * R - d * d).toFixed(2);
    return `M${13 + d} ${13}m0 -${h}v${2 * Number(h)}M13 ${13 + d}m-${h} 0h${2 * Number(h)}`;
  })
  .join("");

/** Twelve spokes, 30 degrees apart (our own drawing). */
const POLAR_SPOKES = Array.from({ length: 6 }, (_, i) => {
  const t = (i * Math.PI) / 6;
  const x = (R * Math.cos(t)).toFixed(2);
  const y = (R * Math.sin(t)).toFixed(2);
  return `M${(13 - Number(x)).toFixed(2)} ${(13 - Number(y)).toFixed(2)}L${(13 + Number(x)).toFixed(2)} ${(13 + Number(y)).toFixed(2)}`;
}).join("");

/** A square grid filling the round button. */
export function CartesianGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <g className="kc-grid-type-lines">
        <path d={CARTESIAN_PATH} />
      </g>
    </svg>
  );
}

/** Rings and spokes filling the round button. */
export function PolarGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <g className="kc-grid-type-lines">
        <circle cx="13" cy="13" r="1.5" />
        <circle cx="13" cy="13" r="4.25" />
        <circle cx="13" cy="13" r="8.5" />
        <path d={POLAR_SPOKES} />
      </g>
    </svg>
  );
}
