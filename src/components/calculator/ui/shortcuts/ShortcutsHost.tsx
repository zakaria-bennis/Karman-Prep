// Installs this folder's shortcuts on the calculator root (help-keys.ts) and shows the Keyboard
// Shortcuts dialog. Mod+/ toggles the dialog; Mod+Alt+G opens or closes Graph settings through
// its own button, so focus and the popover's anchor are the button's; the single-modifier D
// switches degrees and radians and announces it, or, in complex mode, changes nothing and
// announces "Complex mode uses radians" (SETTINGS-32). The listener is in the capture phase, so a
// math field never types the key.

import { useEffect, useRef, useState, type JSX, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnnouncer } from "../a11y/announcer";
import { useEngine } from "../hooks/use-engine";
import { EDITOR_MESSAGES } from "../list/messages";
import { COMPLEX_USES_RADIANS } from "../settings/SettingsPopover";
import { currentPlatform, isMacPlatform, matchHelpKey } from "./help-keys";
import { ShortcutsDialog } from "./ShortcutsDialog";

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
        el.querySelector<HTMLButtonElement>('.kc-graph-controls [aria-haspopup="dialog"]')?.click();
      } else if (engine.settings.complex) announcer.announce(COMPLEX_USES_RADIANS);
      else {
        const mode = engine.settings.angleMode === "radians" ? "degrees" : "radians";
        engine.updateSettings({ angleMode: mode });
        announcer.announce(EDITOR_MESSAGES.angle(mode));
      }
    };
    el.addEventListener("keydown", onKeyDown, { capture: true });
    return () => el.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [rootRef, engine, announcer, mac]);

  if (!open || root === null) return null;
  return createPortal(<ShortcutsDialog mac={mac} onClose={() => setOpen(false)} />, root);
}
