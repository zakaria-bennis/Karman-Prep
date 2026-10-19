// A later table column's colour and style tab (D-12, D-9): the icon toggles the column's points
// and shows an outline while they are hidden; a long-press, a right-click or Shift+F10 (or the
// ContextMenu key) opens the style menu with points, point style, Connect points, line style, the
// six palette colours and Delete column. Escape closes it as one KB-3 layer and returns focus to
// the icon; a press outside closes it. Every change is one undo step (D-20).

import { useContext, useEffect, useRef, useState, type CSSProperties, type JSX } from "react";
import type { StoredColumn } from "@/lib/calculator/core/api/document";
import type { LineStyle, PointStyle } from "@/lib/calculator/core/api/types";
import { resolveRowColor } from "@/lib/calculator/theme/roles";
import { NEW_ROW_GREEN, PICKER_SLOTS } from "@/lib/calculator/theme/desmos-palette";
import { PointStyleGlyph } from "../../icons";
import { EscapeContext } from "../focus/escape-stack";
import { useSkin } from "../hooks/skin";
import { useEngine } from "../hooks/use-engine";
import { useMenuTrigger, usePopupDismiss } from "./menu-trigger";

export interface ColumnStyleMenuProps {
  tableId: string;
  column: number;
  stored: StoredColumn;
  header: string; // the header as read, "y₁"
  onDeleted(): void; // focus moves on once the column is gone
  onAddRegression(): void; // D-3: a linear regression of this column, below the table
}

const POINT_STYLES: readonly [PointStyle, string][] = [
  ["filled", "Filled circle"],
  ["open", "Open circle"],
  ["cross", "Cross"],
];
const LINE_STYLES: readonly [LineStyle, string][] = [
  ["solid", "Solid"],
  ["dashed", "Dashed"],
  ["dotted", "Dotted"],
];

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
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  const pointStyle = stored.pointStyle ?? "filled";
  const lineStyle = stored.lineStyle ?? "solid";
  const radio = (name: string, label: string, checked: boolean, onChange: () => void) => (
    <label key={label} className="kc-style-option">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
  const group = `kc-style-${tableId}-${column}`;

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
      {open && (
        <div ref={panel} className="kc-style-menu" role="dialog" aria-label={`Style for ${header}`}>
          <label className="kc-style-option">
            <input
              ref={first}
              type="checkbox"
              checked={!stored.hidden}
              onChange={() => set({ hidden: !stored.hidden })}
            />
            <span>Show points</span>
          </label>
          <fieldset className="kc-style-group">
            <legend>Point style</legend>
            {POINT_STYLES.map(([style, label]) =>
              radio(`${group}-point`, label, pointStyle === style, () => set({ pointStyle: style }))
            )}
          </fieldset>
          <label className="kc-style-option">
            <input
              type="checkbox"
              checked={stored.lines === true}
              onChange={() => set({ lines: stored.lines !== true })}
            />
            <span>Connect points</span>
          </label>
          <fieldset className="kc-style-group">
            <legend>Line style</legend>
            {LINE_STYLES.map(([style, label]) =>
              radio(`${group}-line`, label, lineStyle === style, () => set({ lineStyle: style }))
            )}
          </fieldset>
          <fieldset className="kc-style-group kc-style-colours">
            <legend>Colour</legend>
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
              </label>
            ))}
          </fieldset>
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
