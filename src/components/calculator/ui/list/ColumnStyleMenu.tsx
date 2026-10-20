// A later table column's colour and style tab (D-12, D-9): the icon toggles the column's points
// and shows an outline while they are hidden; a long-press, a right-click or Shift+F10 (or the
// ContextMenu key) opens the style menu with points, point style, Connect points, line style, the
// six palette colours and Delete column. The menu is drawn as the reference's column popover
// (popovers-menus.md VIS-3, VIS-13, VIS-14, VIS-22 to VIS-24, VIS-38): the shared popover box
// 220 px wide below the icon with an 8 px arrow, "Points" and "Lines" with toggles and icon
// segmented controls, and a row of six 30 px swatches. Escape closes it as one KB-3 layer and returns focus to
// the icon; a press outside closes it. Every change is one undo step (D-20).

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import { createPortal } from "react-dom";
import type { StoredColumn } from "@/lib/calculator/core/api/document";
import type { LineStyle, PointStyle } from "@/lib/calculator/core/api/types";
import { resolveRowColor } from "@/lib/calculator/theme/roles";
import { NEW_ROW_GREEN, PICKER_SLOTS } from "@/lib/calculator/theme/desmos-palette";
import { PointStyleGlyph } from "../../icons";
import { EscapeContext } from "../focus/escape-stack";
import { useSkin } from "../hooks/skin";
import { useEngine } from "../hooks/use-engine";
import { SettingSegments, SettingToggle } from "../settings/controls";
import { useMenuTrigger, usePopupDismiss } from "./menu-trigger";

export interface ColumnStyleMenuProps {
  tableId: string;
  column: number;
  stored: StoredColumn;
  header: string; // the header as read, "y₁"
  onDeleted(): void; // focus moves on once the column is gone
  onAddRegression(): void; // D-3: a linear regression of this column, below the table
}

const POINT_STYLES = (
  [
    ["filled", "Filled circle"],
    ["open", "Open circle"],
    ["cross", "Cross"],
  ] as const satisfies readonly (readonly [PointStyle, string])[]
).map(([value, label]) => ({ value, label, icon: <PointStyleGlyph style={value} /> }));

/** VIS-13: a solid, dashed or dotted stroke across the button (our own drawing). */
function LineStyleGlyph(props: { style: LineStyle }): JSX.Element {
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
  ] as const satisfies readonly (readonly [LineStyle, string])[]
).map(([value, label]) => ({ value, label, icon: <LineStyleGlyph style={value} /> }));

const ARROW_INSET = 10; // the arrow's left edge inside the menu (VIS-3)
const ARROW_HALF = 8;
const EDGE = 2; // the least distance kept from the calculator's edges

/**
 * Places the menu below `icon` with its arrow on the icon's centre line, overlapping the icon by
 * 5 px as the reference's does, kept inside `layer`. The table cells clip their overflow, so the
 * menu is portalled into the calculator root and placed with position: fixed.
 */
function placeMenu(menu: HTMLElement, icon: HTMLElement, layer: Element): void {
  const i = icon.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const centre = i.left + i.width / 2;
  const width = menu.offsetWidth;
  const left = Math.max(
    l.left + EDGE,
    Math.min(centre - ARROW_INSET - ARROW_HALF, l.right - width - EDGE)
  );
  const top = i.bottom + 3;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.maxHeight = `${Math.max(0, l.bottom - top - EDGE)}px`;
  // A transformed ancestor would make position: fixed relative to it; measure and correct once.
  const placed = menu.getBoundingClientRect();
  if (
    placed.width > 0 &&
    (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5)
  ) {
    menu.style.left = `${2 * left - placed.left}px`;
    menu.style.top = `${2 * top - placed.top}px`;
  }
  menu.style.setProperty("--kc-arrow-at", `${centre - left - ARROW_HALF}px`);
}

export function ColumnStyleMenu(props: ColumnStyleMenuProps): JSX.Element {
  const { tableId, column, stored, header } = props;
  const engine = useEngine();
  const skin = useSkin();
  const escape = useContext(EscapeContext);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const color = resolveRowColor(stored.color, skin);
  const set = (style: Parameters<typeof engine.setColumnStyle>[2]) =>
    engine.setColumnStyle(tableId, column, style);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const { trigger, consumeClick } = useMenuTrigger(() => setOpen(true));
  usePopupDismiss(open, "column-style-menu", { popup: panel, trigger: button }, escape, close);
  const [layer, setLayer] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setLayer(button.current?.closest(".kc-app") ?? null);
  }, []);
  useLayoutEffect(() => {
    const menu = panel.current;
    if (open && menu !== null && button.current !== null && layer !== null) {
      placeMenu(menu, button.current, layer);
    }
  });
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  const pointStyle = stored.pointStyle ?? "filled";
  const lineStyle = stored.lineStyle ?? "solid";
  const group = `kc-style-${tableId}-${column}`;

  // Without a calculator root (a bare test render) the menu stays inline.
  const portal = (node: JSX.Element) => (layer === null ? node : createPortal(node, layer));

  return (
    <div className="kc-column-style">
      <button
        type="button"
        ref={button}
        className="kc-column-icon"
        aria-label={`Points for ${header}`}
        aria-pressed={!stored.hidden}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Shift+F10"
        style={{ "--kc-row-color": color.hex } as CSSProperties}
        onClick={() => {
          if (!consumeClick()) set({ hidden: !stored.hidden });
        }}
        {...trigger}
      >
        <PointStyleGlyph style={pointStyle} hidden={stored.hidden} />
      </button>
      {open &&
        portal(
          <div
            ref={panel}
            className="kc-style-menu"
            role="dialog"
            aria-label={`Style for ${header}`}
          >
            <div className="kc-style-body">
              <div className="kc-style-section">
                <div className="kc-style-title">
                  <span aria-hidden="true">Points</span>
                  <SettingToggle
                    name="Show points"
                    inputRef={first}
                    checked={!stored.hidden}
                    onChange={() => set({ hidden: !stored.hidden })}
                  />
                </div>
                <div className="kc-style-content">
                  <SettingSegments
                    name={`${group}-point`}
                    label="Point style"
                    theme="mini"
                    options={POINT_STYLES}
                    value={pointStyle}
                    onSelect={(style) => set({ pointStyle: style })}
                  />
                </div>
              </div>
              <div className="kc-style-section">
                <div className="kc-style-swatches" role="radiogroup" aria-label="Colour">
                  {PICKER_SLOTS.map((slot, i) => (
                    <label
                      key={slot}
                      className="kc-style-swatch"
                      style={{ "--kc-row-color": resolveRowColor(slot, skin).hex } as CSSProperties}
                    >
                      <input
                        type="radio"
                        name={`${group}-colour`}
                        aria-label={`Colour ${i + 1}`}
                        checked={isSwatch(stored.color, slot)}
                        onChange={() => set({ color: slot })}
                      />
                      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M3 8.4 6.4 11.8 13 4.6" />
                      </svg>
                    </label>
                  ))}
                </div>
              </div>
              <div className="kc-style-section">
                <div className="kc-style-title">
                  <span aria-hidden="true">Lines</span>
                  <SettingToggle
                    name="Connect points"
                    checked={stored.lines === true}
                    onChange={() => set({ lines: stored.lines !== true })}
                  />
                </div>
                <div className="kc-style-content">
                  <SettingSegments
                    name={`${group}-line`}
                    label="Line style"
                    theme="mini"
                    options={LINE_STYLES}
                    value={lineStyle}
                    onSelect={(style) => set({ lineStyle: style })}
                  />
                </div>
              </div>
              <div className="kc-style-section kc-style-actions">
                <button
                  type="button"
                  className="kc-style-action"
                  onClick={() => {
                    setOpen(false);
                    props.onAddRegression();
                  }}
                >
                  Add regression
                </button>
                <button
                  type="button"
                  className="kc-style-action"
                  onClick={() => {
                    setOpen(false);
                    engine.deleteTableColumn(tableId, column);
                    props.onDeleted();
                  }}
                >
                  Delete column
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

/**
 * F-A1: whether a stored colour is this swatch. Desmos's new-row green (#388c46, which the new-row
 * cycle stores as a hex) shows as the green swatch (c3), so a column always has one swatch checked.
 */
function isSwatch(color: string, slot: string): boolean {
  return color === slot || (slot === "c3" && color.toLowerCase() === NEW_ROW_GREEN);
}
