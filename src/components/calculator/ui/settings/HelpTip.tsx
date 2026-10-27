// A small help button beside a setting (founder decision, 2026-10-26: "?" and Lock Viewport had
// nothing explaining them). Its explanation shows on hover with a mouse, on keyboard focus and on a
// tap, so it works on touch screens; a second tap, Escape (its own Escape layer, so the settings
// popover stays open) or a press elsewhere hides it. Screen readers hear the explanation as the
// button's description whenever they reach it. The bubble opens below the button, or above it when
// the settings body has no room below, so its scroll area never cuts it off.

import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type JSX } from "react";
import { EscapeContext } from "../focus/escape-stack";

/** Our own drawing: a question mark in a ring. */
function HelpGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.75" />
      <path d="M6.1 6.2a2 2 0 1 1 2.75 1.85c-.55.23-.85.6-.85 1.2v.35" />
      <circle className="kc-help-dot" cx="8" cy="11.6" r=".9" />
    </svg>
  );
}

export function HelpTip(props: { topic: string; text: string }): JSX.Element {
  const id = useId();
  const escape = useContext(EscapeContext);
  // Pinned by a tap or a click; shown while hovered or focused.
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [above, setAbove] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  // When the pointer last pressed it: focus that a press brings is not keyboard focus, whatever
  // :focus-visible says (WebKit counts the calculator's scripted focus after a click as visible).
  const pressedAt = useRef(-Infinity);
  const open = pinned || hovered || focused;

  // Opens above when the scroll area below the button is too short for the bubble.
  useLayoutEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    const bubble = bubbleRef.current;
    const area = wrap?.closest(".kc-settings-body");
    if (!wrap || !bubble || !area) return;
    const a = area.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const need = bubble.offsetHeight + 8;
    setAbove(a.bottom - w.bottom < need && w.top - a.top > a.bottom - w.bottom);
    // Starts 60 px left of the button, kept 6 px inside the settings body on both sides.
    const x = Math.min(Math.max(w.left - 60, a.left + 6), a.right - bubble.offsetWidth - 6);
    bubble.style.left = `${Math.round(x - w.left)}px`;
  }, [open]);

  useEffect(() => {
    if (!open || escape === null) return;
    return escape.push({
      id: "help-tip",
      close() {
        setPinned(false);
        setHovered(false);
        setFocused(false);
      },
    });
  }, [open, escape]);

  // A press outside unpins it.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!pinned || !wrap) return;
    const doc = wrap.ownerDocument;
    const onDown = (event: PointerEvent) => {
      if (!event.composedPath().includes(wrap)) setPinned(false);
    };
    doc.addEventListener("pointerdown", onDown, true);
    return () => doc.removeEventListener("pointerdown", onDown, true);
  }, [pinned]);

  return (
    <span
      ref={wrapRef}
      className="kc-help"
      data-open={open ? "true" : undefined}
      data-side={above ? "above" : "below"}
      onPointerDown={() => (pressedAt.current = performance.now())}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
    >
      <button
        type="button"
        className="kc-help-button"
        aria-label={`About ${props.topic}`}
        aria-describedby={`${id}-tip`}
        aria-expanded={pinned}
        onClick={() => setPinned((was) => !was)}
        onFocus={(event) =>
          setFocused(
            performance.now() - pressedAt.current > 600 &&
              event.currentTarget.matches(":focus-visible")
          )
        }
        onBlur={() => {
          setFocused(false);
          // A press on the button itself can blur it on the way (WebKit); its click decides.
          if (performance.now() - pressedAt.current > 600) setPinned(false);
        }}
      >
        <HelpGlyph />
      </button>
      <span ref={bubbleRef} className="kc-help-bubble" id={`${id}-tip`} role="tooltip">
        {props.text}
      </span>
    </span>
  );
}
