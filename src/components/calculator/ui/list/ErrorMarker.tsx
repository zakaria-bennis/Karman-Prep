// The warning marker of a row, a table cell, a column header or a table regression, and its tooltip (R-2, D-6, D-10;
// founder decision 2026-10-18 to match Desmos; popovers-menus.md VIS-32). The marker is a button
// that stands where the colour tab would; the message is a role="tooltip" element below it. A grey
// tooltip opens 500 ms after the pointer rests on the marker (fading in over 300 ms) and leaves
// 170 ms after it goes; keyboard focus opens it at once. A click pins it: it turns black, stays
// after the pointer leaves and its text can be selected; another click unpins it. A tap toggles
// it. Blur (unless pinned), Escape (one KB-3 layer) and a press outside close it. The tooltip element always exists, hidden while closed, so the id the
// field's aria-describedby names resolves for assistive technology (A11Y-3).
//
// A row's `.kc-row-inner` clips overflow, so the tooltip is portalled into the calculator root
// (`.kc-app`) and placed with position: fixed from the marker's bounding box, centred below it with
// an arrow on the marker, flipped above only when there is no room below, and kept inside the root.

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { WarningGlyph } from "../../icons";
import { EscapeContext } from "../focus/escape-stack";
import { usePopupDismiss } from "./menu-trigger";
import { TOOLTIP_DELAY_MS, TOOLTIP_HIDE_MS } from "./Tooltip";

const GAP = 7; // marker to tooltip: the 5 px arrow plus 2 px
const EDGE = 2; // the least distance kept from the root's edges (VIS-30)

export interface ErrorMarkerProps {
  id: string; // the tooltip's id, named by the field's aria-describedby
  message: string;
  /** Where it stands: a row's tab, a table cell, a column header or a table regression's header. */
  variant: "row" | "cell" | "header" | "regression";
}

/** Each place's marker class and glyph width, the reference's icon sizes (22 px, cells 14 px). */
const VARIANTS = {
  row: { className: "kc-row-warning", size: 22 },
  cell: { className: "kc-cell-warning", size: 14 },
  header: { className: "kc-cell-warning kc-header-warning", size: 22 },
  regression: { className: "kc-tr-warning", size: 22 },
} as const;

/** Places `tip` centred below `marker` (or above when it does not fit), inside `layer`. */
function place(tip: HTMLElement, marker: HTMLElement, layer: Element): void {
  const m = marker.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  const centre = m.left + m.width / 2;
  const left = Math.max(l.left + EDGE, Math.min(centre - width / 2, l.right - width - EDGE));
  let top = m.bottom + GAP;
  let side = "below";
  if (top + height > l.bottom - EDGE && m.top - GAP - height >= l.top + EDGE) {
    top = m.top - GAP - height;
    side = "above";
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  // A transformed ancestor would make position: fixed relative to it; measure and correct once.
  const placed = tip.getBoundingClientRect();
  if (
    placed.width > 0 &&
    (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5)
  ) {
    tip.style.left = `${left - (placed.left - left)}px`;
    tip.style.top = `${top - (placed.top - top)}px`;
  }
  tip.style.setProperty("--kc-tip-arrow", `${centre - left}px`);
  tip.dataset.side = side;
}

export function ErrorMarker({ id, message, variant }: ErrorMarkerProps): JSX.Element {
  const escape = useContext(EscapeContext);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layer, setLayer] = useState<Element | null>(null);
  const markerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  /** The pointer type of the last press: a touch tap toggles, anything else opens by hover or focus. */
  const pressRef = useRef<string>("");

  useLayoutEffect(() => {
    const marker = markerRef.current!;
    setLayer(marker.closest(".kc-app") ?? marker.parentElement);
  }, []);

  const clearTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const later = (ms: number, next: boolean) => {
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      setOpen(next);
    }, ms);
  };
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );

  const close = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
    setPinned(false);
  }, []);
  usePopupDismiss(
    open && layer !== null,
    "error-tooltip",
    { popup: tipRef, trigger: markerRef },
    escape,
    close
  );

  // Placement runs after every render while open, and again when the page scrolls or resizes.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const marker = markerRef.current;
    if (!open || tip === null || marker === null || layer === null) return;
    const update = () => place(tip, marker, layer);
    update();
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open, layer, message]);

  const touch = (e: PointerEvent) => e.pointerType === "touch";

  const tooltip = (
    <div
      ref={tipRef}
      className="kc-error-tip"
      role="tooltip"
      id={id}
      hidden={!open}
      data-pinned={pinned ? "true" : undefined}
    >
      {message}
    </div>
  );

  return (
    <>
      <button
        ref={markerRef}
        type="button"
        className={VARIANTS[variant].className}
        aria-label="Error"
        aria-describedby={id}
        aria-expanded={open}
        onPointerDown={(e) => {
          pressRef.current = e.pointerType;
        }}
        onPointerEnter={(e) => {
          if (!touch(e) && !open) later(TOOLTIP_DELAY_MS, true);
        }}
        onPointerLeave={(e) => {
          if (touch(e) || pinned) return;
          if (open) later(TOOLTIP_HIDE_MS, false);
          else clearTimer();
        }}
        onFocus={() => {
          // A tap's click toggles instead; a pointer press opens through the click below.
          if (pressRef.current === "") {
            clearTimer();
            setOpen(true);
          }
        }}
        onBlur={() => {
          pressRef.current = "";
          if (!pinned) close();
        }}
        onClick={() => {
          clearTimer();
          if (pressRef.current === "touch") return setOpen((was) => !was);
          if (pressRef.current === "") return setOpen(true); // keyboard activation
          setPinned((was) => !was);
          setOpen(true);
        }}
      >
        <WarningGlyph size={VARIANTS[variant].size} />
      </button>
      {layer === null ? null : createPortal(tooltip, layer)}
    </>
  );
}
