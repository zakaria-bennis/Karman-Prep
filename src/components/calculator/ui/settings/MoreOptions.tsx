// SETTINGS-9 item 12, VIS-POPOVERS-MENUS-20: the More Options disclosure. Collapsed by default;
// it starts open while the viewport is locked or Braille Mode is on (SETTINGS-20). Open, it shows
// each axis's scale as a mini Linear | Logarithmic choice, the Lock Viewport switch (SETTINGS-20: no
// dragging, wheel, arrow-key panning or zoom and Home buttons) and Braille Mode (founder decision,
// 2026-10-26: moved here from the top of the popover). Each has a help button that says in plain
// words what it does (HelpTip). Karman's grapher has no logarithmic axes yet, so Logarithmic is
// shown unavailable and Linear stays chosen. Braille Mode records the chosen code and six-key
// input, but Karman has no Braille input yet (A11Y-15), so the rows still show print math; the
// note says so.

import { useId, useState, type JSX } from "react";
import type { BrailleMode } from "@/lib/calculator/core/api/types";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { SettingSegments, SettingSwitchRow } from "./controls";
import { HelpTip } from "./HelpTip";

const SCALES = [
  { value: "linear", label: "Linear" },
  { value: "logarithmic", label: "Logarithmic" },
] as const;

const CODES = [
  { value: "nemeth", label: "Nemeth" },
  { value: "ueb", label: "UEB" },
] as const;

export const SCALE_HELP =
  "How numbers are spaced along each axis. Linear spaces them evenly. Logarithmic, which is not available yet, would space 1, 10 and 100 evenly.";
export const LOCK_HELP =
  "Keeps the graph still: dragging, scrolling and the zoom buttons stop moving it, so a careless touch can't lose your view.";
export const BRAILLE_HELP =
  "For students who read math with a refreshable Braille display. Choose the Braille code your display uses.";
const LOG_UNAVAILABLE = "Logarithmic axes are not available yet";

/** A caret pointing right while closed and down while open (our own drawing). */
function CaretGlyph(): JSX.Element {
  return (
    <svg className="kc-more-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

export function MoreOptions(): JSX.Element {
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const id = useId();
  const braille = settings.brailleMode !== "none";
  const [open, setOpen] = useState(settings.lockViewport || braille);
  const scale = (axis: "x" | "y") => (
    <div className="kc-more-scale">
      <span aria-hidden="true">{axis.toUpperCase()}-axis</span>
      <SettingSegments
        name={`${id}-${axis}-scale`}
        label={`${axis.toUpperCase()}-axis scale`}
        theme="scale"
        options={SCALES}
        value="linear"
        onSelect={() => undefined}
        disabledValues={["logarithmic"]}
        title={LOG_UNAVAILABLE}
      />
    </div>
  );
  return (
    <div className="kc-settings-section kc-settings-more" data-open={open ? "true" : undefined}>
      <button
        type="button"
        className="kc-more-toggle"
        aria-expanded={open}
        aria-controls={open ? `${id}-more` : undefined}
        onClick={() => setOpen((was) => !was)}
      >
        <CaretGlyph />
        More Options
      </button>
      {open && (
        <div className="kc-more-body" id={`${id}-more`}>
          <div className="kc-more-group">
            <div className="kc-more-heading">
              <span>Axis scale</span>
              <HelpTip topic="Axis scale" text={SCALE_HELP} />
            </div>
            {scale("x")}
            {scale("y")}
          </div>
          <SettingSwitchRow
            label="Lock Viewport"
            checked={settings.lockViewport}
            onChange={(lockViewport) => engine.updateSettings({ lockViewport })}
            help={<HelpTip topic="Lock Viewport" text={LOCK_HELP} />}
          />
          <SettingSwitchRow
            label="Braille Mode"
            checked={braille}
            onChange={(on) => engine.updateSettings({ brailleMode: on ? "nemeth" : "none" })}
            help={<HelpTip topic="Braille Mode" text={BRAILLE_HELP} />}
          />
          {braille && (
            <div className="kc-settings-braille">
              <SettingSegments
                name={`${id}-braille`}
                label="Braille code"
                theme="small"
                options={CODES}
                value={settings.brailleMode as Exclude<BrailleMode, "none">}
                onSelect={(brailleMode) => engine.updateSettings({ brailleMode })}
              />
              <SettingSwitchRow
                label="Six Key Braille Input"
                size="small"
                checked={settings.sixKeyInput}
                onChange={(sixKeyInput) => engine.updateSettings({ sixKeyInput })}
              />
              <p className="kc-settings-note">
                Use a refreshable Braille display, or type Braille with a keyboard. Braille input is
                not available in this calculator yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
