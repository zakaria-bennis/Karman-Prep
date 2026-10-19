// The settings popover (01-interfaces-integration.md section 11; 09 Task 11): a dialog named
// "Graph settings", anchored below its Settings control, listing the Phase 1 controls in S-1
// order: Grid, Cartesian or Polar grid, Arrows, Axis numbers, Minor gridlines, each axis
// (AxisSection), Complex mode (S-5) and Angle (S-6, announced per A11Y-2). Display size, Reverse
// contrast and More options are later phases (S-3, S-4, S-8); there is no Braille control
// (A11Y-15). Escape (rank "popover", KB-3) or a pointerdown outside closes it; while closing it
// stays mounted and inert for its CSS closing duration (09 Decisions, "Motion lifecycles read CSS").

import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type JSX } from "react";
import type { AngleMode } from "@/lib/calculator/core/api/types";
import { useAnnouncer } from "../a11y/announcer";
import { EscapeContext, type EscapeStack } from "../focus/escape-stack";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { EDITOR_MESSAGES } from "../list/messages";
import { MotionContext } from "../list/motion";
import { AxisSection, SettingCheck } from "./AxisSection";

export interface SettingsPopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose(): void;
}

type Phase = "closed" | "enter" | "open" | "closing";

/**
 * S-1 placement: directly below the anchor with right edges aligned, both measured against the
 * offset parent's padding box. When that would put the left edge outside the parent, `left: 0`
 * replaces `right`. It is never moved up: the rest of the parent's height bounds it, and it
 * scrolls. Without an anchor or offset parent (jsdom has no layout) it sets no position.
 */
function placePopover(el: HTMLElement, anchor: HTMLElement | null): void {
  const parent = el.offsetParent;
  if (anchor === null || !(parent instanceof HTMLElement)) return;
  const a = anchor.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  const left = p.left + parent.clientLeft;
  const top = a.bottom - (p.top + parent.clientTop);
  const right = left + parent.clientWidth - a.right;
  el.style.top = `${top}px`;
  if (parent.clientWidth - right - el.offsetWidth < 0) {
    el.style.left = "0px";
    el.style.right = "";
  } else {
    el.style.right = `${right}px`;
    el.style.left = "";
  }
  el.style.maxHeight = `${Math.max(0, parent.clientHeight - top)}px`;
}

function useEscapeStack(): EscapeStack {
  const escape = useContext(EscapeContext);
  if (escape === null) throw new Error("SettingsPopover must be used inside EscapeContext");
  return escape;
}

/** One radio option named by the <label> around it. */
function SettingChoice(props: {
  name: string;
  label: string;
  checked: boolean;
  onSelect(): void;
}): JSX.Element {
  return (
    <label className="kc-settings-check">
      <input type="radio" name={props.name} checked={props.checked} onChange={props.onSelect} />
      <span>{props.label}</span>
    </label>
  );
}

export function SettingsPopover(props: SettingsPopoverProps): JSX.Element | null {
  const { anchor, open } = props;
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const announcer = useAnnouncer();
  const escape = useEscapeStack();
  const motion = useContext(MotionContext);
  const radioName = useId();
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ anchor, onClose: props.onClose });

  // Mounts in "enter", opens after a style flush, closes through "closing"; an open while closing
  // goes straight back to "open" (React's state adjustment during render).
  const [phase, setPhase] = useState<Phase>(open ? "enter" : "closed");
  if (open && phase === "closed") setPhase("enter");
  else if (open && phase === "closing") setPhase("open");
  else if (!open && (phase === "enter" || phase === "open")) setPhase("closing");

  useLayoutEffect(() => {
    latest.current = { anchor, onClose: props.onClose };
  });

  useLayoutEffect(() => {
    if (ref.current !== null) placePopover(ref.current, anchor);
  });

  // AN-4 (Task 15): the enter state's styles are computed before "open" replaces them.
  useLayoutEffect(() => {
    const el = ref.current;
    if (phase !== "enter" || el === null) return;
    el.getBoundingClientRect(); // forces a style flush
    setPhase("open");
  }, [phase]);

  // The closing state's own duration; 0 (reduced motion, jsdom) unmounts before paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (phase !== "closing" || el === null) return;
    const ms = motion(el);
    if (ms <= 0) {
      setPhase("closed");
      return;
    }
    const timer = setTimeout(() => setPhase("closed"), ms);
    return () => clearTimeout(timer);
  }, [motion, phase]);

  useLayoutEffect(() => {
    if (!open) return;
    return escape.push({
      id: "popover",
      close() {
        latest.current.onClose();
        latest.current.anchor?.focus();
      },
    });
  }, [escape, open]);

  useEffect(() => {
    const el = ref.current;
    if (!open || el === null) return;
    const doc = el.ownerDocument;
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath();
      const current = latest.current;
      if (path.includes(el) || (current.anchor !== null && path.includes(current.anchor))) return;
      current.onClose();
    };
    doc.addEventListener("pointerdown", onPointerDown, true);
    return () => doc.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  if (phase === "closed") return null;

  const setAngle = (mode: AngleMode) => {
    engine.updateSettings({ angleMode: mode });
    announcer.announce(EDITOR_MESSAGES.angle(mode));
  };

  return (
    <div
      ref={ref}
      className="kc-settings"
      role="dialog"
      aria-label="Graph settings"
      data-state={phase}
      inert={phase === "closing"}
    >
      <SettingCheck
        label="Grid"
        checked={settings.showGrid}
        onChange={(showGrid) => engine.updateSettings({ showGrid })}
      />
      <div className="kc-settings-choice" role="radiogroup" aria-label="Grid type">
        <SettingChoice
          name={`${radioName}-grid`}
          label="Cartesian"
          checked={!settings.polarGrid}
          onSelect={() => engine.updateSettings({ polarGrid: false })}
        />
        <SettingChoice
          name={`${radioName}-grid`}
          label="Polar"
          checked={settings.polarGrid}
          onSelect={() => engine.updateSettings({ polarGrid: true })}
        />
      </div>
      <SettingCheck
        label="Arrows"
        checked={settings.arrows}
        onChange={(arrows) => engine.updateSettings({ arrows })}
      />
      <SettingCheck
        label="Axis numbers"
        checked={settings.axisNumbers}
        onChange={(axisNumbers) => engine.updateSettings({ axisNumbers })}
      />
      <SettingCheck
        label="Minor gridlines"
        checked={settings.minorGridlines}
        onChange={(minorGridlines) => engine.updateSettings({ minorGridlines })}
      />
      <AxisSection axis="x" />
      <AxisSection axis="y" />
      <SettingCheck
        label="Complex mode"
        checked={settings.complex}
        onChange={(complex) => engine.updateSettings({ complex })}
      />
      <div className="kc-settings-choice" role="radiogroup" aria-label="Angle">
        <SettingChoice
          name={`${radioName}-angle`}
          label="Radians"
          checked={settings.angleMode === "radians"}
          onSelect={() => setAngle("radians")}
        />
        <SettingChoice
          name={`${radioName}-angle`}
          label="Degrees"
          checked={settings.angleMode === "degrees"}
          onSelect={() => setAngle("degrees")}
        />
      </div>
    </div>
  );
}
