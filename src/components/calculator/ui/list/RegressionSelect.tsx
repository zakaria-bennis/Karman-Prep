// The table regression's dropdowns (RT-29, REG-MODELS-1, -5): a button showing the current choice
// with a caret, opening a list of options (role "option", aria-selected) attached under it, the
// model list with its footer "Make a custom regression model in a new line using ~." Arrow keys
// move, Enter or a click picks, Escape (one KB-3 layer) or a press outside closes and returns focus
// to the button.

import { useContext, useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import { EscapeContext } from "../focus/escape-stack";
import { usePopupDismiss } from "./menu-trigger";

export interface SelectOption<T> {
  value: T;
  label: string; // the accessible name
  content?: ReactNode; // drawn instead of the label (the "for" picker's typeset headers)
}

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
  useEffect(() => {
    if (open) list.current?.querySelectorAll<HTMLElement>("[role=option]")[active]?.focus();
  }, [open, active]);
  const show = () => {
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
          role="listbox"
          aria-label={props.buttonLabel ?? "Options"}
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
