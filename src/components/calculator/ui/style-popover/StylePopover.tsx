// An expression row's style popover (STYLES-20 to STYLES-26, VIS-POPOVERS-MENUS-21 to -24): a
// region named "Options Menu", 220 px wide, to the right of the row's colour icon with an 8 px
// arrow on the icon's centre line. A curve shows "Lines" with its on/off switch ("Lines visible")
// and the Solid / Dashed / Dotted choice; a point shows "Points" ("Points visible") and the point
// shape; an inequality only its colours. With the switch off the row is hidden and the popover
// shows only that heading (STYLES-29). The opacity fields are named "Line Opacity:" for points
// too, as the reference names them (STYLES-24). Below them, the six colour tiles: a listbox "Standard" in the group "Color Picker", options named red to black, the
// chosen one ticked. Every change is one undo step and keeps the popover open. Escape (one KB-3
// layer) closes it back to the icon; a press outside it closes it.
//
// Opacity, line thickness and point size are drawn at fixed values here (1, 2.5 px and 8 px), so
// their fields show those values read-only, with the reference's icons and tooltips. Fill, labels
// and drag modes have no row fields or drawing yet, so their sections are not shown.

import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { RowView } from "@/lib/calculator/core/api/engine";
import type { ExpressionState, LineStyle, PointStyle } from "@/lib/calculator/core/api/types";
import { NEW_ROW_GREEN, PICKER_SLOTS } from "@/lib/calculator/theme/desmos-palette";
import { resolveRowColor } from "@/lib/calculator/theme/roles";
import { PointStyleGlyph } from "../../icons";
import { EscapeContext } from "../focus/escape-stack";
import { useSkin } from "../hooks/skin";
import { useEngine } from "../hooks/use-engine";
import { usePopupDismiss } from "../list/menu-trigger";
import { SettingSegments, SettingToggle } from "../settings/controls";

/** STYLES-24: the colour tiles' names, in PICKER_SLOTS order. */
export const SWATCH_NAMES = ["red", "blue", "green", "orange", "purple", "black"] as const;

/** A solid, dashed or dotted stroke across the button (our own drawing). */
function LineGlyph(props: { style: LineStyle }): JSX.Element {
  const dash = props.style === "dashed" ? "4.5 3" : props.style === "dotted" ? "0.1 4" : undefined;
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M2.5 17.5 17.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  );
}

const LINE_STYLES = (
  [
    ["solid", "Solid"],
    ["dashed", "Dashed"],
    ["dotted", "Dotted"],
  ] as const
).map(([value, label]) => ({ value, label, icon: <LineGlyph style={value} /> }));

const POINT_STYLES = (
  [
    ["filled", "Point"],
    ["open", "Open"],
    ["cross", "Cross"],
  ] as const
).map(([value, label]) => ({ value, label, icon: <PointStyleGlyph style={value} /> }));

/** A read-only iconed field (VIS-POPOVERS-MENUS-25): the value this calculator always draws. */
function FixedField(props: {
  icon: "opacity" | "thickness" | "size";
  name: string;
  tip: string;
  value: string;
}): JSX.Element {
  return (
    <div
      className="kc-style-field"
      title={`${props.tip}: fixed at ${props.value} in this calculator`}
    >
      <svg className="kc-style-field-icon" viewBox="0 0 13 16" aria-hidden="true" focusable="false">
        {props.icon === "opacity" ? (
          <>
            <rect x="0.5" y="3.5" width="8" height="8" rx="1.5" />
            <rect x="4.5" y="7.5" width="8" height="8" rx="1.5" />
          </>
        ) : props.icon === "thickness" ? (
          <path d="M0 5h13M0 9h13M0 13h13" />
        ) : (
          <circle cx="6.5" cy="9.5" r="5" />
        )}
      </svg>
      <input
        className="kc-style-field-input"
        type="text"
        readOnly
        aria-label={props.name}
        value={props.value}
      />
    </div>
  );
}

export type StyleKind = "line" | "point" | "region";

/** F-A1: whether a stored colour is this tile; the new-row green shows as the green tile. */
function isSwatch(color: string, slot: string): boolean {
  return color === slot || (slot === "c3" && color.toLowerCase() === NEW_ROW_GREEN);
}

const ARROW = 8; // VIS-3: the small arrow's depth, also the gap to the icon
const ARROW_AT = 19; // the arrow's centre below the popover's top
const EDGE = 2;

/** Right of `icon`, its arrow on the icon's centre line, kept inside `layer` (position: fixed). */
function place(menu: HTMLElement, icon: HTMLElement, layer: Element): void {
  const i = icon.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const centre = i.top + i.height / 2;
  const left = Math.min(i.right + ARROW - 1, l.right - menu.offsetWidth - EDGE);
  const top = Math.max(l.top + EDGE, centre - ARROW_AT);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.maxHeight = `${Math.max(0, l.bottom - top - EDGE)}px`;
  const placed = menu.getBoundingClientRect(); // a transformed ancestor moves position: fixed
  if (
    placed.width > 0 &&
    (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5)
  ) {
    menu.style.left = `${2 * left - placed.left}px`;
    menu.style.top = `${2 * top - placed.top}px`;
  }
  menu.style.setProperty("--kc-arrow-at", `${centre - top}px`);
}

export interface StylePopoverProps {
  row: RowView;
  kind: StyleKind;
  anchor: RefObject<HTMLElement | null>;
  onClose(refocus: boolean): void;
}

export function StylePopover({ row, kind, anchor, onClose }: StylePopoverProps): JSX.Element {
  const engine = useEngine();
  const skin = useSkin();
  const escape = useContext(EscapeContext);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  usePopupDismiss(true, "style-popover", { popup: panel, trigger: anchor }, escape, onClose);
  const layer = anchor.current?.closest(".kc-app") ?? null;
  const stored = engine.getExpressions().find((e) => e.id === row.id);
  const set = (patch: Omit<ExpressionState, "id">) =>
    engine.setExpression({ id: row.id, ...patch });

  useLayoutEffect(() => {
    if (panel.current !== null && anchor.current !== null && layer !== null)
      place(panel.current, anchor.current, layer);
  });
  // STYLES-20: focus moves into the popover, to its first control.
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("input, [tabindex='0']")?.focus();
  }, []);

  const chosen = PICKER_SLOTS.findIndex((slot) => isSwatch(row.color, slot));
  const onSwatchKey = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + PICKER_SLOTS.length) % PICKER_SLOTS.length;
    set({ color: PICKER_SLOTS[next] });
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLElement>("[role='option']")
      [next]?.focus();
  };

  const section =
    kind === "region" ? null : (
      <div className="kc-style-section">
        <div className="kc-style-title">
          <span>{kind === "point" ? "Points" : "Lines"}</span>
          <SettingToggle
            name={kind === "point" ? "Points visible" : "Lines visible"}
            checked={!row.hidden}
            onChange={(shown) => set({ hidden: !shown })}
          />
        </div>
        {!row.hidden && (
          <div className="kc-style-content kc-style-options">
            <div className="kc-style-fields">
              <FixedField icon="opacity" name="Line Opacity:" tip="Opacity (0 to 1)" value="1" />
              {kind === "point" ? (
                <FixedField icon="size" name="Point Size:" tip="Point Size (px)" value="8" />
              ) : (
                <FixedField
                  icon="thickness"
                  name="Line Thickness (px)"
                  tip="Line Thickness (px)"
                  value="2.5"
                />
              )}
            </div>
            {kind === "point" ? (
              <SettingSegments<PointStyle>
                name={`${id}-point`}
                label="Style"
                theme="mini"
                options={POINT_STYLES}
                value={stored?.pointStyle ?? "filled"}
                onSelect={(pointStyle) => set({ pointStyle })}
              />
            ) : (
              <SettingSegments<LineStyle>
                name={`${id}-line`}
                label="Style"
                theme="mini"
                options={LINE_STYLES}
                value={stored?.lineStyle ?? "solid"}
                onSelect={(lineStyle) => set({ lineStyle })}
              />
            )}
          </div>
        )}
      </div>
    );

  const menu = (
    <div ref={panel} className="kc-style-popover" role="region" aria-label="Options Menu">
      <div className="kc-style-popover-body">
        {section}
        {/* STYLES-29: with its lines or points off, a curve or point shows only that heading. */}
        {(kind === "region" || !row.hidden) && (
          <div className="kc-style-section kc-style-colours" role="group" aria-label="Color Picker">
            <div className="kc-style-swatches" role="listbox" aria-label="Standard">
              {PICKER_SLOTS.map((slot, i) => (
                <div
                  key={slot}
                  className="kc-style-swatch"
                  role="option"
                  aria-label={SWATCH_NAMES[i]}
                  aria-selected={i === chosen}
                  tabIndex={i === Math.max(0, chosen) ? 0 : -1}
                  style={{ "--kc-row-color": resolveRowColor(slot, skin).hex } as CSSProperties}
                  onClick={() => set({ color: slot })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      set({ color: slot });
                    } else onSwatchKey(event, i);
                  }}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 8.4 6.4 11.8 13 4.6" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  // Without a calculator root (a bare test render) the popover stays inline.
  return layer === null ? menu : createPortal(menu, layer);
}
