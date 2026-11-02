// The Add item menu (S-2, S-10 to S-13; drawn as EL-42, EL-43): a menu button whose menu holds Add
// expression, Add table and Add inference, the College Board version's three items (FN-59, founder
// request 2026-10-26; CB-1: no notes, folders or images). Add inference adds an empty row as Add
// expression does and opens the inference wizard beside it (inference/InferenceWizard.tsx). The
// menu-button keyboard pattern with Home and End (S-10), placement below the button on the desktop
// layout and to its right on the stacked one (S-11), insertion after the last active row (S-12)
// and an announcement of what was added (S-13). Escape closes it as one KB-3 layer.

import { useContext, useEffect, useRef, useState, type JSX, type KeyboardEvent } from "react";
import { AddGlyph } from "../../icons/list";
import { useAnnouncer } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { FocusContext } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { InferenceWizard } from "./inference/InferenceWizard";
import { insertExpressionItem, insertTableItem } from "./row-actions";
import { Tooltip, useTooltip } from "./Tooltip";

export interface AddItemMenuProps {
  layout: "desktop" | "stacked";
}

/** EL-43: "f(x)" in the math font, italic throughout as the reference's icon is (menus.css). */
function ExpressionItemGlyph(): JSX.Element {
  return (
    <span className="kc-add-menu-fx" aria-hidden="true">
      f(x)
    </span>
  );
}

/** VIS-28: a 26 px table, a filled header over three rows of two cells (our own drawing). */
function TableMenuGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        d="M0 0h26v26H0zM1 7v5.5h11.5V7zm12.5 0v5.5H25V7zM1 13.5V19h11.5v-5.5zm12.5 0V19H25v-5.5zM1 20v5h11.5v-5zm12.5 0v5H25v-5z"
      />
    </svg>
  );
}

/** True while DOM focus is on `el` (inside the calculator's shadow root or the document). */
function holdsFocus(el: Element | null | undefined): boolean {
  return el != null && (el.getRootNode() as Document | ShadowRoot).activeElement === el;
}

/** Focus with no focus ring (the `focusVisible` option, which TypeScript's DOM types lack). */
const QUIET_FOCUS = { preventScroll: true, focusVisible: false };

/** FN-59: a bell curve with its right tail filled (our own drawing). */
function InferenceMenuGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <path d="M1 21h24" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M1 20.5C6 20.5 8 6 13 6s7 14.5 12 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M18 14.6c2 3.6 4 5.9 7 5.9V21h-7z" />
    </svg>
  );
}

// EL-43: the reference's lower-case labels; only the item types Karman supports.
const ITEMS = [
  { id: "expression", label: "Add expression", text: "expression", icon: ExpressionItemGlyph },
  { id: "table", label: "Add table", text: "table", icon: TableMenuGlyph },
  { id: "inference", label: "Add inference object", text: "inference", icon: InferenceMenuGlyph },
] as const;

export function AddItemMenu({ layout }: AddItemMenuProps): JSX.Element {
  const engine = useEngine();
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const escape = useContext(EscapeContext);
  const [open, setOpen] = useState(false);
  const [wizardRow, setWizardRow] = useState<string | null>(null); // FN-59: the wizard's row
  const tip = useTooltip(open);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  /** Opened from the keyboard, the first item takes focus (S-10). A mouse open leaves focus in
   *  the row being edited; when Add item itself holds focus (nothing was being edited), focus
   *  moves to the first item with no ring, as the reference's menu does. */
  const byKey = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (byKey.current) items.current[0]?.focus();
    else if (holdsFocus(button.current)) {
      items.current[0]?.focus(QUIET_FOCUS);
    }
  }, [open]);
  // KB-3: Escape closes the menu and returns focus to Add item when the menu held it.
  useEffect(() => {
    if (!open || escape === null) return;
    return escape.push({
      id: "add-item-menu",
      close: () => close(byKey.current || items.current.some(holdsFocus)),
    });
  }, [open, escape]);
  // S-10: a press outside closes the menu and still reaches its target.
  useEffect(() => {
    if (!open) return;
    const root = menu.current?.getRootNode() as Document | ShadowRoot | undefined;
    if (root === undefined) return;
    const onPress = (e: Event) => {
      const path = e.composedPath();
      if (path.includes(menu.current!) || path.includes(button.current!)) return;
      // Focus in the closing menu returns to Add item so it stays in the calculator (KB-3).
      if (items.current.some(holdsFocus)) button.current?.focus(QUIET_FOCUS);
      setOpen(false);
    };
    root.addEventListener("pointerdown", onPress, { capture: true });
    return () => root.removeEventListener("pointerdown", onPress, { capture: true });
  }, [open]);

  const activate = (id: (typeof ITEMS)[number]["id"]) => {
    setOpen(false);
    const anchor = engine.getSnapshot().activeRowId; // S-12: the last active row, else the end
    if (id === "expression") insertExpressionItem(engine, focus, announcer, anchor);
    else if (id === "table") insertTableItem(engine, focus, announcer, anchor);
    else setWizardRow(insertExpressionItem(engine, focus, announcer, anchor));
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      byKey.current = true;
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
        // As the reference's toolbar buttons, a mouse press does not take focus from the row.
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          byKey.current = e.detail === 0;
          setOpen((o) => !o);
        }}
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
      {wizardRow !== null && (
        <InferenceWizard
          rowId={wizardRow}
          anchor={button.current}
          onClose={() => {
            setWizardRow(null);
            focus.focusRow(wizardRow, "end"); // the row stays, empty unless Create filled it
          }}
        />
      )}
    </div>
  );
}
