// The warning marker of a row, a table cell or a column header, and its tooltip (R-2, D-6, D-10;
// founder decision 2026-10-18 to match Desmos). The marker is a button that stands where the colour
// tab would; the message is a role="tooltip" element below it that opens at once on pointer hover
// and on keyboard focus, toggles on a tap, and closes on pointer leave, blur, Escape (one KB-3
// layer) and a press outside. The tooltip element always exists, hidden while closed, so the id the
// field's aria-describedby names resolves for assistive technology (A11Y-3).
//
// A row's `.kc-row-inner` clips overflow, so the tooltip is portalled into the calculator root
// (`.kc-app`) and placed with position: fixed from the marker's bounding box, centred below it with
// an arrow on the marker, flipped above only when there is no room below, and kept inside the root.

import {
  useCallback,
  useContext,
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

const GAP = 7; // marker to tooltip: the 5 px arrow plus 2 px
const EDGE = 4; // the least distance kept from the root's edges

export interface ErrorMarkerProps {
  id: string; // the tooltip's id, named by the field's aria-describedby
  message: string;
  variant: "row" | "cell";
}

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
  const [layer, setLayer] = useState<Element | null>(null);
  const markerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  /** The pointer type of the last press: a touch tap toggles, anything else opens by hover or focus. */
  const pressRef = useRef<string>("");

  useLayoutEffect(() => {
    const marker = markerRef.current!;
    setLayer(marker.closest(".kc-app") ?? marker.parentElement);
  }, []);

  const close = useCallback(() => setOpen(false), []);
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
    <div ref={tipRef} className="kc-error-tip" role="tooltip" id={id} hidden={!open}>
      {message}
    </div>
  );

  return (
    <>
      <button
        ref={markerRef}
        type="button"
        className={variant === "row" ? "kc-row-warning" : "kc-cell-warning"}
        aria-label="Error"
        aria-describedby={id}
        aria-expanded={open}
        onPointerDown={(e) => {
          pressRef.current = e.pointerType;
        }}
        onPointerEnter={(e) => {
          if (!touch(e)) setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (!touch(e)) setOpen(false);
        }}
        onFocus={() => {
          if (pressRef.current !== "touch") setOpen(true); // a tap's click toggles instead
        }}
        onBlur={() => {
          pressRef.current = "";
          setOpen(false);
        }}
        onClick={() => {
          if (pressRef.current === "touch") setOpen((was) => !was);
        }}
      >
        <WarningGlyph size={variant === "row" ? 22 : 16} />
      </button>
      {layer === null ? null : createPortal(tooltip, layer)}
    </>
  );
}
