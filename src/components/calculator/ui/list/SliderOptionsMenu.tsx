// A slider's options popover (SLIDERS-33, SLIDERS-34): "Animation Mode" with the four loop modes as
// icon radios, and "Speed" with Animate Slower, the readout and Animate Faster. It opens to the
// right of the Play button with an arrow pointing at it, portalled into the calculator root (the
// row clips its overflow). Escape closes it as one KB-3 layer and returns focus to the opener; a
// press outside closes it. Opening it never starts playback.

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { changeSpeed, setLoopMode } from "@/lib/calculator/core/api/sliders";
import {
  LOOP_MODE_LABELS,
  LOOP_MODES,
  nextPeriod,
  speedText,
  type SliderSettings,
} from "@/lib/calculator/sliders/model";
import { useAnnouncer } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { useEngine } from "../hooks/use-engine";
import { SettingSegments } from "../settings/controls";
import { usePopupDismiss } from "./menu-trigger";
import { LoopModeGlyph, SpeedGlyph } from "./slider-glyphs";

const MODES = LOOP_MODES.map((value) => ({
  value,
  label: LOOP_MODE_LABELS[value],
  icon: <LoopModeGlyph mode={value} />,
}));

/** The popover's left edge sits this far right of the play button; its arrow 10 px from its top. */
const GAP = 11;
const LIFT = 3.5;

function place(menu: HTMLElement, anchor: HTMLElement): void {
  const a = anchor.getBoundingClientRect();
  const left = a.right + GAP,
    top = a.top - LIFT;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  // A transformed ancestor would make position: fixed relative to it; measure and correct once.
  const placed = menu.getBoundingClientRect();
  if (
    placed.width > 0 &&
    (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5)
  ) {
    menu.style.left = `${2 * left - placed.left}px`;
    menu.style.top = `${2 * top - placed.top}px`;
  }
}

export function SliderOptionsMenu(props: {
  rowId: string;
  name: string; // display name, for the dialog's label
  settings: SliderSettings;
  anchor: RefObject<HTMLElement | null>; // the play button the popover points at
  opener: RefObject<HTMLElement | null>; // focus returns here on Escape
  onClose(refocus: boolean): void;
}): JSX.Element {
  const { rowId, settings } = props;
  const engine = useEngine();
  const announcer = useAnnouncer();
  const escape = useContext(EscapeContext);
  const panel = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<Element | null>(null);
  usePopupDismiss(true, "slider-menu", { popup: panel, trigger: props.opener }, escape, (refocus) =>
    props.onClose(refocus)
  );
  useLayoutEffect(() => {
    setLayer(props.anchor.current?.closest(".kc-app") ?? null);
  }, [props.anchor]);
  useLayoutEffect(() => {
    if (panel.current !== null && props.anchor.current !== null)
      place(panel.current, props.anchor.current);
  });
  useEffect(() => {
    panel.current
      ?.querySelector<HTMLInputElement>("input:checked")
      ?.focus({ focusVisible: false } as FocusOptions);
  }, [layer]);

  const period = settings.animationPeriod;
  const slower = nextPeriod(period, -1) !== null,
    faster = nextPeriod(period, 1) !== null;
  const speed = (direction: 1 | -1) => {
    const next = changeSpeed(engine, rowId, direction);
    if (next !== null) announcer.announce(`Animating at ${speedText(next)}`);
  };
  const speedButton = (direction: 1 | -1, enabled: boolean) => (
    <span
      role="button"
      className="kc-slider-speed-button"
      aria-label={direction > 0 ? "Animate Faster" : "Animate Slower"}
      aria-disabled={!enabled}
      tabIndex={enabled ? 0 : -1}
      onClick={() => enabled && speed(direction)}
      onKeyDown={(e) => {
        if (enabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          speed(direction);
        }
      }}
    >
      <SpeedGlyph faster={direction > 0} />
    </span>
  );

  const menu = (
    <div
      ref={panel}
      className="kc-slider-menu"
      role="dialog"
      aria-label={`Animation options for ${props.name}`}
    >
      <div className="kc-slider-menu-body">
        <div role="group" aria-label="Animation Mode">
          <div role="heading" aria-level={2} className="kc-slider-menu-title">
            Animation Mode
          </div>
          <SettingSegments
            name={`kc-slider-mode-${rowId}`}
            label="Animation Mode"
            theme="mini"
            options={MODES}
            value={settings.loopMode}
            onSelect={(mode) => setLoopMode(engine, rowId, mode)}
          />
        </div>
        <div role="group" aria-label="Speed" className="kc-slider-speed">
          <div role="heading" aria-level={2} className="kc-slider-menu-title">
            Speed
          </div>
          <div className="kc-slider-speed-row">
            {speedButton(-1, slower)}
            <span className="kc-slider-speed-text">{speedText(period)}</span>
            {speedButton(1, faster)}
          </div>
        </div>
      </div>
    </div>
  );
  return layer === null ? menu : createPortal(menu, layer);
}
