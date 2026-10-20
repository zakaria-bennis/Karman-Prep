// The settings popover (S-1; drawn to popovers-menus.md VIS-1 to VIS-17): a dialog named
// "Graph settings" to the left of its Settings control, top-aligned with it, with a 12 px arrow on
// the control's centre line. It lists the Phase 1 controls in the reference's order: Grid with the
// round Cartesian and Polar buttons, Arrows, the small Axis Numbers and Minor Gridlines, each axis
// (AxisSection), Complex Mode (S-5) and the Radians | Degrees choice (S-6, announced per A11Y-2).
// Display size, Reverse contrast and More Options are later phases (S-3, S-4, S-8); there is no
// Braille control (A11Y-15). It appears and leaves at once (VIS-5). Escape (rank "popover", KB-3)
// or a pointerdown outside closes it.

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

export interface SettingsPopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose(): void;
}

const ARROW = 12; // VIS-2: the arrow's depth, also the gap between the popover and its anchor
const EDGE = 5; // the least distance kept from the offset parent's edges

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

  return (
    <div ref={ref} className="kc-settings" role="dialog" aria-label="Graph settings">
      <div className="kc-settings-body">
        <div className="kc-settings-grid">
          <div className="kc-settings-grid-main">
            <SettingCheck
              label="Grid"
              checked={settings.showGrid}
              onChange={(showGrid) => engine.updateSettings({ showGrid })}
            />
            <div className="kc-grid-types" role="radiogroup" aria-label="Grid type">
              <GridTypeButton
                name={`${radioName}-grid`}
                label="Cartesian"
                checked={!settings.polarGrid}
                onSelect={() => engine.updateSettings({ polarGrid: false })}
              >
                <CartesianGlyph />
              </GridTypeButton>
              <GridTypeButton
                name={`${radioName}-grid`}
                label="Polar"
                checked={settings.polarGrid}
                onSelect={() => engine.updateSettings({ polarGrid: true })}
              >
                <PolarGlyph />
              </GridTypeButton>
            </div>
            <SettingCheck
              label="Arrows"
              checked={settings.arrows}
              onChange={(arrows) => engine.updateSettings({ arrows })}
            />
          </div>
          <div className="kc-settings-grid-side">
            <SettingCheck
              label="Axis Numbers"
              name="Axis numbers"
              size="small"
              checked={settings.axisNumbers}
              onChange={(axisNumbers) => engine.updateSettings({ axisNumbers })}
            />
            <SettingCheck
              label="Minor Gridlines"
              name="Minor gridlines"
              size="small"
              checked={settings.minorGridlines}
              onChange={(minorGridlines) => engine.updateSettings({ minorGridlines })}
            />
          </div>
        </div>
        <div className="kc-settings-section kc-settings-axes">
          <AxisSection axis="x" />
          <AxisSection axis="y" />
        </div>
        <div className="kc-settings-section kc-settings-complex">
          <span aria-hidden="true">Complex Mode</span>
          <SettingToggle
            name="Complex mode"
            checked={settings.complex}
            onChange={(complex) => engine.updateSettings({ complex })}
          />
        </div>
        <div className="kc-settings-section">
          <SettingSegments
            name={`${radioName}-angle`}
            label="Angle"
            options={ANGLES}
            value={settings.angleMode}
            onSelect={setAngle}
          />
        </div>
      </div>
    </div>
  );
}
