// The table regression's dropdowns (RT-29, REG-MODELS-1, -5): a button showing the current choice
// with a caret, opening a list of options (role "option", aria-selected) attached under it, the
// model list with its footer "Make a custom regression model in a new line using ~." Arrow keys
// move, Enter or a click picks, Escape (one KB-3 layer) or a press outside closes and returns focus
// to the button. A list with no room under the button (a phone's short screen) opens above it when
// there is more room there, and either way it scrolls within the room it has.

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from "react";
import { EscapeContext } from "../focus/escape-stack";
import { usePopupDismiss } from "./menu-trigger";

export interface SelectOption<T> {
  value: T;
  label: string; // the accessible name
  content?: ReactNode; // drawn instead of the label (the "for" picker's typeset headers)
}

/** The gap a list keeps from the viewport's top or bottom edge. */
const EDGE = 4;

export function RegressionSelect<T extends string | number>(props: {
  id: string;
  className: string;
  value: T;
  options: readonly SelectOption<T>[];
  onPick(value: T): void;
  footer?: ReactNode;
  buttonLabel?: string;
}): JSX.Element {
  const escape = useContext(EscapeContext);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // The list is fixed to the viewport under (or over) the button, so the list item cannot clip it.
  const [place, setPlace] = useState<CSSProperties | null>(null);
  const [above, setAbove] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = props.options.find((o) => o.value === props.value) ?? props.options[0];
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  usePopupDismiss(
    open,
    `regression-select-${props.id}`,
    { popup: list, trigger: button },
    escape,
    close
  );
  useLayoutEffect(() => {
    const el = list.current;
    const rect = button.current?.getBoundingClientRect();
    if (!open || el === null || rect === undefined) return;
    const viewHeight = el.ownerDocument.defaultView?.innerHeight ?? rect.bottom + el.scrollHeight;
    const roomBelow = viewHeight - rect.bottom - EDGE;
    const roomAbove = rect.top - EDGE;
    const flip = el.scrollHeight > roomBelow && roomAbove > roomBelow;
    setAbove(flip);
    setPlace((p) => ({
      ...p,
      top: flip ? undefined : rect.bottom,
      bottom: flip ? viewHeight - rect.top : undefined,
      maxHeight: Math.max(0, flip ? roomAbove : roomBelow),
    }));
  }, [open]);
  useEffect(() => {
    if (open) list.current?.querySelectorAll<HTMLElement>("[role=option]")[active]?.focus();
  }, [open, active]);
  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (rect !== undefined) setPlace({ top: rect.bottom, left: rect.left, width: rect.width });
    setAbove(false);
    setActive(Math.max(0, props.options.indexOf(current)));
    setOpen(true);
  };
  const pick = (value: T) => {
    setOpen(false);
    button.current?.focus();
    if (value !== props.value) props.onPick(value);
  };
  return (
    <div className={`kc-tr-select ${props.className}`} data-open={open ? "true" : undefined}>
      <button
        ref={button}
        type="button"
        className="kc-tr-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={props.buttonLabel ?? current?.label}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className="kc-tr-select-label">{current?.content ?? current?.label}</span>
        <span className="kc-tr-caret" aria-label="Show Options" role="img" />
      </button>
      {open && (
        <div
          ref={list}
          className="kc-tr-select-list"
          data-side={above ? "above" : undefined}
          role="listbox"
          aria-label={props.buttonLabel ?? "Options"}
          style={place ?? undefined}
          onKeyDown={(e) => {
            const n = props.options.length;
            if (e.key === "ArrowDown") setActive((a) => (a + 1) % n);
            else if (e.key === "ArrowUp") setActive((a) => (a - 1 + n) % n);
            else if (e.key === "Home") setActive(0);
            else if (e.key === "End") setActive(n - 1);
            else if (e.key === "Enter" || e.key === " ") pick(props.options[active].value);
            else if (e.key === "Tab") close(false);
            else return;
            if (e.key !== "Tab") e.preventDefault();
          }}
        >
          {props.options.map((o, k) => (
            <div
              key={String(o.value)}
              role="option"
              tabIndex={-1}
              aria-selected={o.value === props.value}
              aria-label={o.label}
              className="kc-tr-option"
              data-selected={o.value === props.value ? "true" : undefined}
              onPointerEnter={() => setActive(k)}
              onClick={() => pick(o.value)}
            >
              {o.content ?? o.label}
            </div>
          ))}
          {props.footer !== undefined && <div className="kc-tr-select-footer">{props.footer}</div>}
        </div>
      )}
    </div>
  );
}
