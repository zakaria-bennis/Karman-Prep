"use client";

/* Shared behaviour for intros 4, 5 and 6: the screen size, and how a choice is pointed at and made. */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Subject } from "../registry";

/** The window's size in CSS pixels, settled 180 ms after a resize. [0, 0] before mount. */
export function useViewport(): [number, number] {
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const read = () => setSize([window.innerWidth, window.innerHeight]);
    read();
    let t = 0;
    const on = () => {
      clearTimeout(t);
      t = window.setTimeout(read, 180);
    };
    window.addEventListener("resize", on);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", on);
    };
  }, []);
  return size;
}

/**
 * Pointing, focus and touch for the two choices. A mouse or pen points; keyboard focus counts as
 * pointing; on a touch screen the first tap shows the choice's animation and the second chooses.
 */
export function useChoice(choose: (s: Subject) => void, locked: boolean) {
  const [active, setActive] = useState<Subject | null>(null);
  const kind = useRef("mouse");
  const pressing = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const props = (s: Subject) => ({
    onPointerDown: (e: PointerEvent) => {
      kind.current = e.pointerType;
      pressing.current = true;
    },
    onPointerCancel: () => {
      pressing.current = false;
    },
    onPointerEnter: (e: PointerEvent) => {
      kind.current = e.pointerType;
      if (e.pointerType !== "touch" && !locked) setActive(s);
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType !== "touch" && activeRef.current === s && !locked) setActive(null);
    },
    onFocus: () => {
      if (!pressing.current && !locked) setActive(s);
    },
    onBlur: () => {
      if (activeRef.current === s && !locked) setActive(null);
    },
    onClick: () => {
      const pressed = pressing.current;
      pressing.current = false;
      if (locked) return;
      if (pressed && kind.current === "touch" && activeRef.current !== s) {
        setActive(s);
        return;
      }
      setActive(s);
      choose(s);
    },
    "data-on": active === s || undefined,
  });

  return { active, props };
}
