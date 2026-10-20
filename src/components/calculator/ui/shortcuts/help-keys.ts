// The keyboard shortcuts this folder owns (SETTINGS-31 to SETTINGS-33): open the Keyboard
// Shortcuts dialog, open or close Graph settings, switch between degrees and radians, and zoom in,
// zoom out or restore the default viewport (= or numpad +, - or numpad -, 0). The
// modifiers follow the platform as the reference's do: "Mod" is Ctrl on Windows and ChromeOS and
// Cmd on a Mac, "Mod+Alt" is Ctrl+Alt or Ctrl+Cmd, and the single-modifier group is Alt or Ctrl.
// Keys match on `event.code`, so Option- or Alt-modified letters still match.

export type HelpAction =
  | "shortcuts-dialog"
  | "toggle-settings"
  | "toggle-degrees"
  | "zoom-in"
  | "zoom-out"
  | "zoom-default";
export type HelpKey = Pick<
  KeyboardEvent,
  "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing"
>;

/** SETTINGS-31: Mac modifiers for Mac, iPhone and iPad platform strings. */
export function isMacPlatform(platform: string): boolean {
  return /^(Mac|iPhone|iPad|iPod)/.test(platform);
}

/** The platform string of this browser, or "" where there is none (node). */
export function currentPlatform(): string {
  return typeof navigator === "undefined" ? "" : navigator.platform;
}

export function matchHelpKey(event: HelpKey, mac: boolean): HelpAction | null {
  if (event.isComposing) return null;
  const { code, ctrlKey, metaKey, altKey, shiftKey } = event;
  const mod = mac ? metaKey && !ctrlKey : ctrlKey && !metaKey;
  const modAlt = mac ? ctrlKey && metaKey && !altKey : ctrlKey && altKey && !metaKey;
  const single = mac ? ctrlKey && !metaKey && !altKey : altKey && !ctrlKey && !metaKey;
  if (code === "Slash" && mod && !altKey && !shiftKey) return "shortcuts-dialog";
  if (code === "KeyG" && modAlt && !shiftKey) return "toggle-settings";
  if (code === "KeyD" && single && !shiftKey) return "toggle-degrees";
  // SETTINGS-32: Shift+= ("+" on the main keyboard) does not zoom in the reference.
  if (single && !shiftKey && (code === "Equal" || code === "NumpadAdd")) return "zoom-in";
  if (single && !shiftKey && (code === "Minus" || code === "NumpadSubtract")) return "zoom-out";
  if (single && !shiftKey && (code === "Digit0" || code === "Numpad0")) return "zoom-default";
  return null;
}
