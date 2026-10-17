// The keypad (01-interfaces-integration.md section 11 and 09's Row DOM): a region named "Keypad"
// with a Hide keypad bar and the key groups of keypadLayout() for the page, width, pointer and
// Shift (the K-1 tray, the K-3 letters pages, the K-6 phone keypad), and a Show keypad control
// while closed. A closed keypad stays mounted, hidden from assistive technology and inert, so the
// AN-1 slide has something to move. The audio key is drawn but disabled (K-9). Key input comes in
// Task 9 and the Functions panel in Task 10.

import {
  ArrowBigUp,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CornerDownLeft,
  Delete,
  Keyboard,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type JSX,
} from "react";
import { EscapeContext, type EscapeStack } from "../focus/escape-stack";
import { keypadLayout, type KeyDef, type KeyIcon, type KeypadLayout } from "./keys";

export interface KeypadProps {
  containerWidth: number; // < 600 uses the K-6 phone keypad
  pointer: "fine" | "coarse";
  open: boolean;
  onOpenChange(open: boolean, by: "student" | "system"): void;
}

const KEY_ICONS: Record<KeyIcon, LucideIcon> = {
  ArrowLeft,
  ArrowRight,
  Delete,
  CornerDownLeft,
  ArrowBigUp,
  Volume2,
};

// The installed @types/react (18) has no `inert` prop; React 19 renders it as a boolean attribute.
const INERT: object = { inert: true };

/** Pushes an escape layer while `active`; Escape calls the latest `close`. */
function useEscapeLayer(
  escape: EscapeStack | null,
  id: string,
  active: boolean,
  close: () => void
): void {
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!active || escape === null) return;
    return escape.push({ id, close: () => closeRef.current() });
  }, [escape, id, active]);
}

/** The ARIA state each key with a behaviour of its own carries. */
function keyState(
  key: KeyDef,
  page: KeypadLayout["page"],
  shift: boolean,
  functionsPanelId: string
): ButtonHTMLAttributes<HTMLButtonElement> {
  switch (key.behaviour.type) {
    case "letters":
      return { "aria-pressed": page === "letters" };
    case "shift":
      return { "aria-pressed": shift };
    case "functions":
      return { "aria-expanded": false, "aria-controls": functionsPanelId };
    case "audio":
      return { "aria-disabled": true, title: key.name };
    default:
      return {};
  }
}

export function Keypad(props: KeypadProps): JSX.Element {
  const { containerWidth, pointer, open, onOpenChange } = props;
  const escape = useContext(EscapeContext);
  const [page, setPage] = useState<KeypadLayout["page"]>("main");
  const [shift, setShift] = useState(false);
  const functionsPanelId = useId();

  // Closing the keypad resets the page and Shift, so it always reopens on the main page.
  useEffect(() => {
    if (open) return;
    setPage("main");
    setShift(false);
  }, [open]);
  // KB-3: Escape closes the ABC page before the keypad (ESCAPE_RANK).
  useEscapeLayer(escape, "keypad", open, () => onOpenChange(false, "student"));
  useEscapeLayer(escape, "letters", open && page === "letters", () => setPage("main"));
  if (escape === null) throw new Error("Keypad must be used inside EscapeContext");

  const layout = keypadLayout(page, containerWidth, pointer, shift);
  const activate = (key: KeyDef) => {
    if (key.behaviour.type === "letters") setPage((p) => (p === "main" ? "letters" : "main"));
    else if (key.behaviour.type === "shift") setShift((on) => !on);
  };

  return (
    <>
      <section
        className="kc-keypad"
        role="region"
        aria-label="Keypad"
        aria-hidden={open ? undefined : true}
        {...(open ? {} : INERT)}
        data-open={String(open)}
        data-layout={layout.id}
        data-pointer={pointer}
        data-page={page}
      >
        <div className="kc-keypad-bar">
          <button
            type="button"
            aria-label="Hide keypad"
            onClick={() => onOpenChange(false, "student")}
          >
            <ChevronDown aria-hidden="true" focusable="false" size={20} />
          </button>
        </div>
        {layout.groups.map((group) => (
          <div
            key={group.id}
            role="group"
            data-group={group.id}
            style={{ "--kc-columns": group.columns } as CSSProperties}
          >
            {group.rows.flat().map((key) => {
              const Icon = key.icon === undefined ? null : KEY_ICONS[key.icon];
              return (
                <button
                  key={key.id}
                  type="button"
                  className="kc-key"
                  aria-label={key.name}
                  data-key={key.id}
                  data-tone={key.tone}
                  style={{ gridColumn: `span ${key.span}` }}
                  {...keyState(key, page, shift, functionsPanelId)}
                  onClick={() => activate(key)}
                >
                  {Icon === null ? (
                    key.label
                  ) : (
                    <Icon aria-hidden="true" focusable="false" size={20} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </section>
      {!open && (
        <button
          type="button"
          className="kc-show-keypad"
          aria-label="Show keypad"
          data-layout={layout.id}
          data-pointer={pointer}
          onClick={() => onOpenChange(true, "student")}
        >
          <Keyboard aria-hidden="true" focusable="false" size={20} />
        </button>
      )}
    </>
  );
}
