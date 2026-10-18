// A later table column's colour and style tab (D-12, D-9): the icon toggles the column's points
// and shows an outline while they are hidden; a long-press, a right-click or Shift+F10 (or the
// ContextMenu key) opens the style menu with points, point style, Connect points, line style, the
// six palette colours and Delete column. Escape closes it as one KB-3 layer and returns focus to
// the icon; a press outside closes it. Every change is one undo step (D-20).

import { useContext, useEffect, useRef, useState, type CSSProperties, type JSX } from "react";
import type { StoredColumn } from "@/lib/calculator-v2/core/api/document";
import type { LineStyle, PointStyle } from "@/lib/calculator-v2/core/api/types";
import { resolveRowColor } from "@/lib/calculator-v2/theme/roles";
import { CURVE_SLOTS } from "@/lib/calculator-v2/theme/skins";
import { PointStyleGlyph } from "../../icons";
import { EscapeContext } from "../focus/escape-stack";
import { useSkin } from "../hooks/skin";
import { useEngine } from "../hooks/use-engine";

export interface ColumnStyleMenuProps {
  tableId: string;
  column: number;
  stored: StoredColumn;
  header: string; // the header as read, "y₁"
  onDeleted(): void; // focus moves on once the column is gone
}

const LONG_PRESS_MS = 500;
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressed = useRef(false); // a long-press opened the menu; its click does not toggle
  const color = resolveRowColor(stored.color, skin);
  const set = (style: Parameters<typeof engine.setColumnStyle>[2]) =>
    engine.setColumnStyle(tableId, column, style);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open || escape === null) return;
    return escape.push({ id: "column-style-menu", close: () => close(true) });
  }, [open, escape]);
  useEffect(() => {
    if (!open) return;
    const root = panel.current?.getRootNode() as Document | ShadowRoot | undefined;
    if (root === undefined) return;
    const onPress = (e: Event) => {
      const path = e.composedPath();
      if (!path.includes(panel.current!) && !path.includes(button.current!)) setOpen(false);
    };
    root.addEventListener("pointerdown", onPress, { capture: true });
    return () => root.removeEventListener("pointerdown", onPress, { capture: true });
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const cancelPress = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
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
          if (pressed.current) pressed.current = false;
          else set({ hidden: !stored.hidden });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onPointerDown={() => {
          pressed.current = false;
          cancelPress();
          timer.current = setTimeout(() => {
            timer.current = null;
            pressed.current = true;
            setOpen(true);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
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
            {CURVE_SLOTS.map((slot, i) => (
              <label
                key={slot}
                className="kc-style-swatch"
                style={{ "--kc-row-color": resolveRowColor(slot, skin).hex } as CSSProperties}
              >
                <input
                  type="radio"
                  name={`${group}-colour`}
                  aria-label={`Colour ${i + 1}`}
                  checked={stored.color === slot}
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
