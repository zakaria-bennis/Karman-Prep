// The Add item menu (S-2, S-10 to S-13; drawn as EL-42, EL-43): a menu button whose menu holds Add
// expression and Add table only (owner decision 3: no inference item; CB-1: no notes, folders or images). The
// menu-button keyboard pattern with Home and End (S-10), placement below the button on the desktop
// layout and to its right on the stacked one (S-11), insertion after the last active row (S-12)
// and an announcement of what was added (S-13). Escape closes it as one KB-3 layer.

import { useContext, useEffect, useRef, useState, type JSX, type KeyboardEvent } from "react";
import { AddGlyph, TableItemGlyph } from "../../icons/list";
import { useAnnouncer } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { FocusContext } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { insertExpressionItem, insertTableItem } from "./row-actions";
import { Tooltip, useTooltip } from "./Tooltip";

export interface AddItemMenuProps {
  layout: "desktop" | "stacked";
}

/** EL-43: "f(x)" in the math font, italic letters and upright brackets. */
function ExpressionItemGlyph(): JSX.Element {
  return (
    <span className="kc-add-menu-fx" aria-hidden="true">
      <i>f</i>(<i>x</i>)
    </span>
  );
}

// EL-43: the reference's lower-case labels; only the item types Karman supports.
const ITEMS = [
  { id: "expression", label: "Add expression", text: "expression", icon: ExpressionItemGlyph },
  { id: "table", label: "Add table", text: "table", icon: TableItemGlyph },
] as const;

export function AddItemMenu({ layout }: AddItemMenuProps): JSX.Element {
  const engine = useEngine();
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const escape = useContext(EscapeContext);
  const [open, setOpen] = useState(false);
  const tip = useTooltip(open);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  // S-10: the first item takes focus as the menu opens.
  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);
  // KB-3: Escape closes the menu and returns focus to Add item.
  useEffect(() => {
    if (!open || escape === null) return;
    return escape.push({ id: "add-item-menu", close: () => close(true) });
  }, [open, escape]);
  // S-10: a press outside closes the menu and still reaches its target.
  useEffect(() => {
    if (!open) return;
    const root = menu.current?.getRootNode() as Document | ShadowRoot | undefined;
    if (root === undefined) return;
    const onPress = (e: Event) => {
      const path = e.composedPath();
      if (path.includes(menu.current!) || path.includes(button.current!)) return;
      setOpen(false);
    };
    root.addEventListener("pointerdown", onPress, { capture: true });
    return () => root.removeEventListener("pointerdown", onPress, { capture: true });
  }, [open]);

  const activate = (id: (typeof ITEMS)[number]["id"]) => {
    setOpen(false);
    const anchor = engine.getSnapshot().activeRowId; // S-12: the last active row, else the end
    if (id === "expression") insertExpressionItem(engine, focus, announcer, anchor);
    else insertTableItem(engine, focus, announcer, anchor);
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };
  const onMenuKey = (e: KeyboardEvent, index: number) => {
    const last = ITEMS.length - 1;
    const move = (to: number) => {
      e.preventDefault();
      items.current[to]?.focus();
    };
    switch (e.key) {
      case "ArrowDown":
        return move(index === last ? 0 : index + 1);
      case "ArrowUp":
        return move(index === 0 ? last : index - 1);
      case "Home":
        return move(0);
      case "End":
        return move(last);
      case "Tab":
        e.preventDefault();
        return close(true);
      case "Enter":
      case " ":
        e.preventDefault();
        return activate(ITEMS[index].id);
    }
  };

  return (
    <div className="kc-add-item">
      <button
        type="button"
        ref={button}
        className="kc-list-tool"
        aria-label="Add item"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
        {...tip.handlers}
      >
        <AddGlyph />
        {tip.open && <Tooltip text="Add Item" />}
      </button>
      {open && (
        <div
          ref={menu}
          className="kc-add-menu"
          role="menu"
          aria-label="Add item"
          data-placement={layout === "stacked" ? "right" : "below"}
        >
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                ref={(el) => {
                  items.current[i] = el;
                }}
                className="kc-add-menu-item"
                aria-label={item.label}
                tabIndex={-1}
                onClick={() => activate(item.id)}
                onKeyDown={(e) => onMenuKey(e, i)}
              >
                <span className="kc-add-menu-icon">
                  <Icon />
                </span>
                <span aria-hidden="true">{item.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
