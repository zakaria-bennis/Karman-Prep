// SETTINGS-9 item 12, VIS-POPOVERS-MENUS-20: the More Options disclosure. Collapsed by default;
// it starts open while the viewport is locked (SETTINGS-20). Open, it shows each axis's scale as a
// mini Linear | Logarithmic choice and the Lock Viewport checkbox (SETTINGS-20: no dragging,
// wheel, arrow-key panning or zoom and Home buttons). Karman's grapher has no logarithmic axes yet,
// so Logarithmic is shown unavailable and Linear stays chosen.

import { useId, useState, type JSX } from "react";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { SettingCheck, SettingSegments } from "./controls";

const SCALES = [
  { value: "linear", label: "Linear" },
  { value: "logarithmic", label: "Logarithmic" },
] as const;

const LOCK_HELP = "Lock Viewport stops dragging, scrolling and zooming the graph";
const LOG_UNAVAILABLE = "Logarithmic axes are not available yet";

/** A caret pointing right while closed and down while open (our own drawing). */
function CaretGlyph(): JSX.Element {
  return (
    <svg className="kc-more-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M1.5 3.5h9L6 9z" />
    </svg>
  );
}

export function MoreOptions(): JSX.Element {
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const id = useId();
  const [open, setOpen] = useState(settings.lockViewport);
  const scale = (axis: "x" | "y") => (
    <div className="kc-more-scale">
      <span aria-hidden="true">{axis.toUpperCase()}-Axis:</span>
      <SettingSegments
        name={`${id}-${axis}-scale`}
        label={`${axis.toUpperCase()}-Axis:`}
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
    <div className="kc-settings-more" data-open={open ? "true" : undefined}>
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
          {scale("x")}
          {scale("y")}
          <div className="kc-more-lock">
            <SettingCheck
              label="Lock Viewport"
              size="more"
              checked={settings.lockViewport}
              onChange={(lockViewport) => engine.updateSettings({ lockViewport })}
            />
            <span className="kc-more-help" role="img" aria-label={LOCK_HELP} title={LOCK_HELP}>
              ?
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
