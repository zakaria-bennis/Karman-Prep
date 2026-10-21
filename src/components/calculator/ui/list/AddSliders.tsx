// Adding sliders for a row's undefined names (R-6, SLIDERS-4, SLIDERS-8; owner decision,
// 2026-10-21): a small slider icon in the row's gutter, under the warning marker, with no words.
// Its name is "Add sliders" and, on a desktop pointer, so is its hover tooltip. A click, a tap,
// Enter, Space or ArrowDown opens a small menu listing "all" and then each name in order of first
// appearance (one name lists only itself), at most MAX_NAMES of them; "all" still adds every
// name. Picking an item adds `name=1` rows right below the row in one undo step. Escape, a press
// outside or Tab closes the menu; a keyboard pick returns to the row's math (SLIDERS-8), a click
// leaves focus where it was. The menu is portalled into the calculator root, since a row clips
// its overflow. Drawn with our own markup and CSS.

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { displayName } from "@/lib/calculator/core/analysis";
import type { Announcer } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { usePopupDismiss } from "./menu-trigger";
import { EDITOR_MESSAGES } from "./messages";
import { useRowTip } from "./RowTip";
import { AddSliderGlyph } from "./slider-glyphs";

export const ADD_SLIDERS_LABEL = "Add sliders";

/** SLIDERS-4: at most this many name items; "all" still adds every missing name. */
const MAX_NAMES = 4;
const EDGE = 2;

/** Desmos's degree sign is the name `\degree`: its item shows ° and is spoken "degrees". */
const DEGREE = "\\degree";
const spoken = (name: string) => (name === DEGREE ? "degrees" : displayName(name));

/**
 * R-7: defines each name as `name=1` in new rows right after `rowId`, as one undo step. A name a
 * row already defines meanwhile is skipped; past the row limit nothing is added.
 */
export function addSliders(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  names: readonly string[]
): void {
  const refused = engine.editRows((rows, ctx) => {
    const at = rows.findIndex((r) => r.id === rowId);
    if (at < 0 || names.length === 0) return null;
    const added = names.map((name) => ({
      id: ctx.nextId(),
      latex: `${name}=1`,
      color: ctx.nextColour(), // RT-2
      hidden: false,
    }));
    return [...rows.slice(0, at + 1), ...added, ...rows.slice(at + 1)];
  });
  if (refused === "row-limit") announcer?.announce(EDITOR_MESSAGES.rowLimit);
}

/** A name typeset as a list row shows it: an italic letter and an upright subscript. */
function NameText(props: { name: string }): JSX.Element {
  const shown = props.name === DEGREE ? "°" : displayName(props.name);
  const at = shown.indexOf("_");
  if (at < 0) return <>{shown}</>;
  return (
    <>
      {shown.slice(0, at)}
      <sub className="kc-letter-sub">{shown.slice(at + 1)}</sub>
    </>
  );
}

/** Places `menu` below `anchor`, left-aligned (above when it does not fit), inside `layer`. */
function place(menu: HTMLElement, anchor: HTMLElement, layer: Element): void {
  const a = anchor.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const left = Math.max(l.left + EDGE, Math.min(a.left, l.right - menu.offsetWidth - EDGE));
  let top = a.bottom + 4;
  if (top + menu.offsetHeight > l.bottom - EDGE && a.top - 4 - menu.offsetHeight >= l.top + EDGE)
    top = a.top - 4 - menu.offsetHeight;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  const placed = menu.getBoundingClientRect();
  if (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5) {
    menu.style.left = `${left - (placed.left - left)}px`;
    menu.style.top = `${top - (placed.top - top)}px`;
  }
}

function AddSlidersMenu(props: {
  names: readonly string[];
  anchor: RefObject<HTMLButtonElement | null>;
  focusFirst: boolean;
  onPick(names: readonly string[], keyboard: boolean): void;
  onClose(refocus: boolean): void;
}): JSX.Element | null {
  const { names, anchor } = props;
  const escape = useContext(EscapeContext);
  const menu = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<Element | null>(null);
  usePopupDismiss(layer !== null, "add-sliders", { popup: menu, trigger: anchor }, escape, (r) =>
    props.onClose(r)
  );
  useLayoutEffect(
    () => setLayer(anchor.current?.closest(".kc-app") ?? anchor.current?.parentElement ?? null),
    [anchor]
  );
  useLayoutEffect(() => {
    if (menu.current === null || anchor.current === null || layer === null) return;
    place(menu.current, anchor.current, layer);
  }, [anchor, layer, names]);
  const focusFirst = props.focusFirst;
  useEffect(() => {
    if (layer !== null && focusFirst) menu.current?.querySelector("button")?.focus();
  }, [layer, focusFirst]);

  const items: { key: string; names: readonly string[]; label: string; word: boolean }[] =
    names.length === 1
      ? [{ key: names[0], names, label: `Add slider for ${spoken(names[0])}`, word: false }]
      : [
          { key: "all", names, label: "Add sliders for all", word: true },
          ...names.slice(0, MAX_NAMES).map((name) => ({
            key: name,
            names: [name],
            label: `Add slider for ${spoken(name)}`,
            word: false,
          })),
        ];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(menu.current?.querySelectorAll("button") ?? [])];
    const at = buttons.indexOf(e.target as HTMLButtonElement);
    const move = (to: number) => {
      e.preventDefault();
      buttons[(to + buttons.length) % buttons.length]?.focus();
    };
    if (e.key === "ArrowDown") move(at + 1);
    else if (e.key === "ArrowUp") move(at - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(buttons.length - 1);
    else if (e.key === "Tab") {
      e.preventDefault();
      props.onClose(true);
    }
  };

  if (layer === null) return null;
  return createPortal(
    <div
      ref={menu}
      className="kc-add-sliders-menu"
      role="menu"
      aria-label={ADD_SLIDERS_LABEL}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className="kc-add-sliders-item"
          data-word={item.word ? "true" : undefined}
          aria-label={item.label}
          // A pointer pick leaves focus where it was (in the row's math, say).
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => props.onPick(item.names, e.detail === 0)}
        >
          {item.word ? "all" : <NameText name={item.key} />}
        </button>
      ))}
    </div>,
    layer
  );
}

export function AddSlidersButton(props: {
  names: readonly string[];
  onAdd(names: readonly string[], keyboard: boolean): void; // keyboard: Enter or Space, not a click
}): JSX.Element {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<{ keyboard: boolean } | null>(null);
  const tip = useRowTip(ADD_SLIDERS_LABEL, button, open !== null);
  return (
    <>
      <button
        ref={button}
        type="button"
        className="kc-add-sliders"
        aria-label={ADD_SLIDERS_LABEL}
        aria-haspopup="menu"
        aria-expanded={open !== null}
        {...tip.handlers}
        // The reference leaves focus where it was when a gutter control is clicked.
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          tip.hide();
          setOpen((was) => (was === null ? { keyboard: e.detail === 0 } : null));
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown") return;
          e.preventDefault();
          setOpen((was) => was ?? { keyboard: true });
        }}
      >
        <AddSliderGlyph />
      </button>
      {tip.tip}
      {open !== null && (
        <AddSlidersMenu
          names={props.names}
          anchor={button}
          focusFirst={open.keyboard}
          onPick={(names, keyboard) => {
            setOpen(null);
            props.onAdd(names, keyboard);
          }}
          onClose={(refocus) => {
            setOpen(null);
            if (refocus && open.keyboard) button.current?.focus();
          }}
        />
      )}
    </>
  );
}
