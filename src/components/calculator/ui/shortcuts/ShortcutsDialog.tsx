// The Keyboard Shortcuts dialog (SETTINGS-33, VIS-POPOVERS-MENUS-33 to -35): a modal over the
// calculator with a 70% black backdrop, the title "Keyboard Shortcuts", a "Windows / ChromeOS
// Shortcuts" | "Mac Shortcuts" choice (this platform's first), and two columns of two-column
// tables, "Function" and the platform's "Shortcut", with each key in a cap. Escape (one KB-3
// layer), the Close Dialog button or a press on the backdrop closes it and focus goes back to where
// it was; Tab stays inside it while it is open.

import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { EscapeContext } from "../focus/escape-stack";
import { SettingSegments } from "../settings/controls";
import {
  SHORTCUT_SECTIONS,
  shortcutParts,
  type ShortcutRow,
  type ShortcutSection,
  type SymbolId,
} from "./shortcut-rows";

type Os = "win" | "mac";

const OS_OPTIONS = [
  { value: "win", label: "Windows / ChromeOS Shortcuts" },
  { value: "mac", label: "Mac Shortcuts" },
] as const;

const V = (name: string) => <i>{name}</i>;

/** The Common Symbols column's typeset forms (our own simple HTML layout). */
function Symbol({ id }: { id: SymbolId }): JSX.Element {
  switch (id) {
    case "power":
      return (
        <>
          {V("a")}
          <sup>{V("b")}</sup>
        </>
      );
    case "subscript":
      return (
        <>
          {V("a")}
          <sub>{V("b")}</sub>
        </>
      );
    case "le":
      return <>≤</>;
    case "ge":
      return <>≥</>;
    case "prime":
      return <>{V("a")}′</>;
    case "fraction":
      return (
        <span className="kc-sym-frac">
          <span>{V("a")}</span>
          <span>{V("b")}</span>
        </span>
      );
    case "sqrt":
      return <>√{V("a")}</>;
    case "cbrt":
      return (
        <>
          <sup className="kc-sym-index">3</sup>√{V("a")}
        </>
      );
    case "nthroot":
      return (
        <>
          <sup className="kc-sym-index">{V("n")}</sup>√{V("a")}
        </>
      );
    case "sum":
    case "int":
    case "prod":
      return (
        <span className="kc-sym-big" data-op={id}>
          <span className="kc-sym-limit">{V("b")}</span>
          <span className="kc-sym-op">{id === "sum" ? "∑" : id === "prod" ? "∏" : "∫"}</span>
          <span className="kc-sym-limit">
            {id === "int" ? (
              V("a")
            ) : (
              <>
                {V("n")}={V("a")}
              </>
            )}
          </span>
        </span>
      );
    case "pi":
      return <>π</>;
    case "theta":
      return <>θ</>;
  }
}

function Keys({ keys }: { keys: string }): JSX.Element {
  return (
    <>
      {shortcutParts(keys).map((part, i) =>
        "cap" in part ? (
          <kbd key={i} className="kc-key-cap">
            {part.cap}
          </kbd>
        ) : (
          <span key={i} className="kc-key-text" data-text={part.text}>
            {part.text}
          </span>
        )
      )}
    </>
  );
}

function Row({ row, os }: { row: ShortcutRow; os: Os }): JSX.Element {
  const { label } = row;
  return (
    <tr>
      <td>
        {typeof label === "string" ? (
          label
        ) : (
          <>
            <span className="kc-sym" aria-hidden="true">
              <Symbol id={label.symbol} />
            </span>
            <span className="kc-sr-only">{label.speech}</span>
          </>
        )}
      </td>
      <td>
        <Keys keys={os === "mac" ? row.mac : row.win} />
      </td>
    </tr>
  );
}

function Section({ section, os }: { section: ShortcutSection; os: Os }): JSX.Element {
  return (
    <section className="kc-shortcuts-section">
      <h2>{section.title}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Function</th>
            <th scope="col">{os === "mac" ? "Mac Shortcut" : "Windows / ChromeOS Shortcut"}</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, i) => (
            <Row key={i} row={row} os={os} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

const FOCUSABLE = "button, input, [tabindex]:not([tabindex='-1'])";

export interface ShortcutsDialogProps {
  mac: boolean;
  onClose(): void;
}

export function ShortcutsDialog({ mac, onClose }: ShortcutsDialogProps): JSX.Element {
  const [os, setOs] = useState<Os>(mac ? "mac" : "win");
  const escape = useContext(EscapeContext);
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const latest = useRef(onClose);
  useLayoutEffect(() => {
    latest.current = onClose;
  });

  // Focus moves into the dialog and returns to where it was when the dialog closes.
  useEffect(() => {
    const el = dialog.current!;
    const root = el.getRootNode() as Document | ShadowRoot;
    const before = root.activeElement as HTMLElement | null;
    el.querySelector<HTMLElement>(".kc-shortcuts-box")?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (escape === null) return;
    return escape.push({ id: "shortcuts-dialog", close: () => latest.current() });
  }, [escape]);

  // Tab and Shift+Tab wrap inside the dialog (it is modal).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const items = [...dialog.current!.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const root = dialog.current!.getRootNode() as Document | ShadowRoot;
    const at = items.indexOf(root.activeElement as HTMLElement);
    const next = event.shiftKey
      ? at <= 0
        ? items.length - 1
        : at - 1
      : at === items.length - 1
        ? 0
        : at + 1;
    event.preventDefault();
    items[next].focus();
  };

  return (
    <div
      className="kc-shortcuts-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        className="kc-shortcuts"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          className="kc-shortcuts-close"
          aria-label="Close Dialog"
          onClick={onClose}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3 3 13 13M13 3 3 13" />
          </svg>
        </button>
        <div className="kc-shortcuts-box" tabIndex={-1}>
          <div className="kc-shortcuts-head">
            <h1 id={`${id}-title`}>Keyboard Shortcuts</h1>
            <SettingSegments<Os>
              name={`${id}-os`}
              label="Operating System"
              options={OS_OPTIONS}
              value={os}
              onSelect={setOs}
            />
          </div>
          <div className="kc-shortcuts-columns">
            {([0, 1] as const).map((column) => (
              <div key={column} className="kc-shortcuts-column">
                {SHORTCUT_SECTIONS.filter((s) => s.column === column).map((section) => (
                  <Section key={section.title} section={section} os={os} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
