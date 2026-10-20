// The settings popover (S-1; drawn to popovers-menus.md VIS-1 to VIS-20): a dialog named
// "Graph settings" to the left of its Settings control, top-aligned with it, with a 12 px arrow on
// the control's centre line. It lists the controls in the reference's order (SETTINGS-9): Display
// Size, Reverse contrast and Braille Mode (DisplaySection), Grid with the pressed Cartesian Grid and
// Polar Grid buttons, Arrows, the small Axis Numbers and Minor Gridlines, each axis (AxisSection),
// More Options (MoreOptions), Complex Mode (S-5) with its hint, and the Angle Settings choice
// (S-6, announced per A11Y-2; greyed while complex, SETTINGS-23). Visibility follows SETTINGS-14
// and -15: no grid type or Minor Gridlines with the grid off, no Minor Gridlines in polar. It
// appears and leaves at once (VIS-5). Escape (rank "popover", KB-3) or a pointerdown outside closes it.

import { useContext, useEffect, useId, useLayoutEffect, useRef, type JSX } from "react";
import type { AngleMode } from "@/lib/calculator/core/api/types";
import { useAnnouncer } from "../a11y/announcer";
import { EscapeContext, type EscapeStack } from "../focus/escape-stack";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { EDITOR_MESSAGES } from "../list/messages";
import { AxisSection } from "./AxisSection";
import {
  CartesianGlyph,
  GridTypeButton,
  PolarGlyph,
  SettingCheck,
  SettingSegments,
  SettingToggle,
} from "./controls";
import { DisplaySection } from "./DisplaySection";
import { MoreOptions } from "./MoreOptions";

export interface SettingsPopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose(): void;
}

const ARROW = 12; // VIS-2: the arrow's depth, also the gap between the popover and its anchor
const EDGE = 5; // the least distance kept from the offset parent's edges

/** SETTINGS-23: the Angle tooltip while complex mode is on. */
export const COMPLEX_USES_RADIANS = "Complex mode uses radians";

const ANGLES = [
  { value: "radians", label: "Radians" },
  { value: "degrees", label: "Degrees" },
] as const;

/**
 * VIS-4 placement against the offset parent's padding box: to the left of the anchor with its top
 * at the anchor's top and the arrow on the anchor's centre line. When there is no room on the left
 * it opens below the anchor with right edges aligned and the arrow pointing up. It is never moved
 * up: the rest of the parent's height bounds it, and its body scrolls. Without an anchor or offset
 * parent (jsdom has no layout) it sets no position.
 */
function placePopover(el: HTMLElement, anchor: HTMLElement | null): void {
  const parent = el.offsetParent;
  if (anchor === null || !(parent instanceof HTMLElement)) return;
  const a = anchor.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  const originX = p.left + parent.clientLeft;
  const originY = p.top + parent.clientTop;
  const width = el.offsetWidth;
  const leftOfAnchor = a.left - originX - ARROW - width;
  let top: number;
  let left: number;
  let arrow: number;
  if (leftOfAnchor >= EDGE) {
    el.dataset.side = "left";
    top = a.top - originY;
    left = leftOfAnchor;
    arrow = a.top + a.height / 2 - originY - top;
  } else {
    el.dataset.side = "below";
    top = a.bottom - originY + ARROW;
    left = Math.max(EDGE, Math.min(a.right - originX - width, parent.clientWidth - width - EDGE));
    arrow = a.left + a.width / 2 - originX - left;
  }
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.style.setProperty("--kc-arrow-at", `${arrow}px`);
  el.style.setProperty("--kc-settings-max-h", `${Math.max(0, parent.clientHeight - top - EDGE)}px`);
}

function useEscapeStack(): EscapeStack {
  const escape = useContext(EscapeContext);
  if (escape === null) throw new Error("SettingsPopover must be used inside EscapeContext");
  return escape;
}

export function SettingsPopover(props: SettingsPopoverProps): JSX.Element | null {
  const { anchor, open } = props;
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const announcer = useAnnouncer();
  const escape = useEscapeStack();
  const radioName = useId();
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ anchor, onClose: props.onClose });

  useLayoutEffect(() => {
    latest.current = { anchor, onClose: props.onClose };
  });

  useLayoutEffect(() => {
    if (ref.current !== null) placePopover(ref.current, anchor);
  });

  useLayoutEffect(() => {
    if (!open) return;
    return escape.push({
      id: "popover",
      close() {
        latest.current.onClose();
        latest.current.anchor?.focus();
      },
    });
  }, [escape, open]);

  // SETTINGS-32: opening moves focus to the chosen Display Size radio.
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLInputElement>(".kc-segment > input:checked")?.focus();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!open || el === null) return;
    const doc = el.ownerDocument;
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath();
      const current = latest.current;
      if (path.includes(el) || (current.anchor !== null && path.includes(current.anchor))) return;
      current.onClose();
    };
    doc.addEventListener("pointerdown", onPointerDown, true);
    return () => doc.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  if (!open) return null;

  const setAngle = (mode: AngleMode) => {
    engine.updateSettings({ angleMode: mode });
    announcer.announce(EDITOR_MESSAGES.angle(mode));
  };

  const grid = settings.showGrid;
  return (
    <div ref={ref} className="kc-settings" role="dialog" aria-label="Graph settings">
      <div className="kc-settings-body">
        <DisplaySection />
        <div className="kc-settings-section kc-settings-grid">
          <div className="kc-settings-grid-main">
            <SettingCheck
              label="Grid"
              checked={grid}
              onChange={(showGrid) => engine.updateSettings({ showGrid })}
            />
            {grid && (
              <div className="kc-grid-types">
                <GridTypeButton
                  label="Cartesian Grid"
                  pressed={!settings.polarGrid}
                  onPress={() => engine.updateSettings({ polarGrid: false })}
                >
                  <CartesianGlyph />
                </GridTypeButton>
                <GridTypeButton
                  label="Polar Grid"
                  pressed={settings.polarGrid}
                  onPress={() => engine.updateSettings({ polarGrid: true })}
                >
                  <PolarGlyph />
                </GridTypeButton>
              </div>
            )}
            <SettingCheck
              label="Arrows"
              checked={settings.arrows}
              onChange={(arrows) => engine.updateSettings({ arrows })}
            />
          </div>
          <div className="kc-settings-grid-side">
            <SettingCheck
              label="Axis Numbers"
              size="small"
              checked={settings.axisNumbers}
              onChange={(axisNumbers) => engine.updateSettings({ axisNumbers })}
            />
            {grid && !settings.polarGrid && (
              <SettingCheck
                label="Minor Gridlines"
                size="small"
                checked={settings.minorGridlines}
                onChange={(minorGridlines) => engine.updateSettings({ minorGridlines })}
              />
            )}
          </div>
        </div>
        <div className="kc-settings-section kc-settings-axes">
          <AxisSection axis="x" />
          <AxisSection axis="y" />
          <MoreOptions />
        </div>
        <div className="kc-settings-section">
          <div className="kc-settings-complex">
            <span aria-hidden="true">Complex Mode</span>
            <SettingToggle
              name="Complex Mode"
              checked={settings.complex}
              onChange={(complex) => engine.updateSettings({ complex })}
            />
          </div>
          {settings.complex && (
            <div className="kc-settings-complex-hint">
              <p>
                Hint: try writing <i>i</i>
                <sup>2</sup> or √−4.
              </p>
              <p>Note: complex values will be plotted as (real, imag)</p>
            </div>
          )}
        </div>
        <div className="kc-settings-section">
          <SettingSegments
            name={`${radioName}-angle`}
            label="Angle Settings"
            options={ANGLES}
            value={settings.angleMode}
            onSelect={setAngle}
            disabled={settings.complex}
            title={settings.complex ? COMPLEX_USES_RADIANS : undefined}
          />
        </div>
      </div>
    </div>
  );
}
