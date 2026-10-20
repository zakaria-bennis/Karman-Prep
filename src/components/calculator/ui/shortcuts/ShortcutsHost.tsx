// Installs this folder's shortcuts on the calculator root (help-keys.ts) and shows the Keyboard
// Shortcuts dialog. Mod+/ toggles the dialog; Mod+Alt+G opens or closes Graph settings through
// its own button, so the popover's anchor is the button's, and closing it puts focus on the button;
// the single-modifier D switches degrees and radians and announces "Degrees" or "Radians", or, in
// complex mode, changes nothing and announces "Complex mode uses radians" (SETTINGS-32). The
// single-modifier =, - and 0 press the graph's Zoom in, Zoom out and Home buttons and announce
// "Graph zoom in", "Graph zoom out" or "Graph viewport default"; with that button absent (a locked
// view, Home at the default view) they do nothing and announce nothing. The listener is in the
// capture phase, so a math field never types the key.

import { useEffect, useRef, useState, type JSX, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnnouncer } from "../a11y/announcer";
import { useEngine } from "../hooks/use-engine";
import { GRAPH_CONTROL_LABELS } from "../graph/labels";
import { COMPLEX_USES_RADIANS } from "../settings/SettingsPopover";
import { currentPlatform, isMacPlatform, matchHelpKey } from "./help-keys";
import { ShortcutsDialog } from "./ShortcutsDialog";

/** SETTINGS-3, -32: the zoom shortcuts' buttons and announcements. */
const ZOOMS = {
  "zoom-in": [GRAPH_CONTROL_LABELS.zoomIn, "Graph zoom in"],
  "zoom-out": [GRAPH_CONTROL_LABELS.zoomOut, "Graph zoom out"],
  "zoom-default": [GRAPH_CONTROL_LABELS.home, "Graph viewport default"],
} as const;

export function ShortcutsHost(props: {
  rootRef: RefObject<HTMLElement | null>;
}): JSX.Element | null {
  const { rootRef } = props;
  const engine = useEngine();
  const announcer = useAnnouncer();
  const [open, setOpen] = useState(false);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const mac = useRef(isMacPlatform(currentPlatform())).current;

  useEffect(() => {
    const el = rootRef.current;
    setRoot(el);
    if (el === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = matchHelpKey(event, mac);
      if (action === null) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === "shortcuts-dialog") setOpen((was) => !was);
      else if (action === "toggle-settings") {
        const button = el.querySelector<HTMLButtonElement>(
          '.kc-graph-controls [aria-haspopup="dialog"]'
        );
        const wasOpen = button?.getAttribute("aria-expanded") === "true";
        button?.click();
        if (wasOpen) button?.focus();
      } else if (action === "toggle-degrees") {
        if (engine.settings.complex) announcer.announce(COMPLEX_USES_RADIANS);
        else {
          const mode = engine.settings.angleMode === "radians" ? "degrees" : "radians";
          engine.updateSettings({ angleMode: mode });
          announcer.announce(mode === "degrees" ? "Degrees" : "Radians");
        }
      } else {
        const [label, message] = ZOOMS[action];
        const button = el.querySelector<HTMLButtonElement>(
          `.kc-graph-controls button[aria-label="${label}"]`
        );
        if (button === null) return;
        button.click();
        announcer.announce(message);
      }
    };
    el.addEventListener("keydown", onKeyDown, { capture: true });
    return () => el.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [rootRef, engine, announcer, mac]);

  if (!open || root === null) return null;
  return createPortal(<ShortcutsDialog mac={mac} onClose={() => setOpen(false)} />, root);
}
