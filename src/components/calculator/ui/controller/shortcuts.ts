// Shell keyboard shortcuts (KB-7) and the Escape hand-off (KB-3). Shortcuts match on
// `event.code`, so Option-modified keys on macOS (Option+T types "†") still work, and never fire
// while an IME is composing. The set and its modifiers are Desmos's, per platform (owner decision,
// 2026-10-21): undo is Cmd+Z on a Mac and Ctrl+Z elsewhere, redo Cmd+Shift+Z or Cmd+Y (Ctrl
// elsewhere), the keypad toggles on Ctrl+K on a Mac and Alt+K elsewhere, and Alt/Option+T starts the
// keyboard trace (POI-20). KB-7 also lists KeyC, which arrives with KB-11 (Phase 2).

import { currentPlatform, isMacPlatform } from "../shortcuts/help-keys";

export type ShortcutAction = "undo" | "redo" | "toggle-keypad" | "audio-trace";
export type ShortcutKey = Pick<
  KeyboardEvent,
  "code" | "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing"
>;
export interface ShellKeyboardHandlers {
  onShortcut(action: ShortcutAction): void;
  onEscape(): boolean; // true when a layer closed
  onKey?(event: KeyboardEvent): boolean; // POI-20: true when the running keyboard trace took the key
}

export function matchShortcut(event: ShortcutKey, mac: boolean): ShortcutAction | null {
  if (event.isComposing) return null;
  const { code, ctrlKey, metaKey, altKey, shiftKey } = event;
  // "Mod" is Cmd on a Mac and Ctrl elsewhere; the other of the two never counts as it.
  const mod = !altKey && (mac ? metaKey && !ctrlKey : ctrlKey && !metaKey);
  if (mod && code === "KeyZ") return shiftKey ? "redo" : "undo";
  if (mod && !shiftKey && code === "KeyY") return "redo";
  const single =
    !shiftKey && (mac ? ctrlKey && !metaKey && !altKey : altKey && !ctrlKey && !metaKey);
  if (single && code === "KeyK") return "toggle-keypad";
  if (altKey && !ctrlKey && !metaKey && code === "KeyT") return "audio-trace"; // POI-20
  return null;
}

/** Shortcuts a native text control keeps for itself (its own text undo and redo). */
const NATIVE_EDITING: ReadonlySet<ShortcutAction> = new Set(["undo", "redo"]);

/**
 * Whether the event's composed target is a native text field or select (a Graph settings field).
 * Textareas are left out: the shell's only textareas are math fields' (MathQuill's, or the fake
 * field in component tests), and those keep the shortcuts (Decision 4). Checkboxes and radios have
 * no text undo, so they keep them too.
 */
function inNativeTextControl(event: Event): boolean {
  const target = event.composedPath()[0];
  if (!(target instanceof Element)) return false;
  if (target.closest(".mq-textarea") !== null) return false;
  if (target.tagName === "SELECT") return true;
  return target.tagName === "INPUT" && !NON_TEXT_INPUTS.has((target as HTMLInputElement).type);
}

const NON_TEXT_INPUTS: ReadonlySet<string> = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
  "image",
]);

/**
 * One capture-phase `keydown` listener on `root`. A shortcut gets preventDefault() and
 * stopPropagation() (so MathQuill never sees it), then `onShortcut`. Undo and redo
 * are left alone in a native text input or select (a Graph settings text field), so its own
 * text undo works and no expression row behind the popover changes; toggle-keypad stays global. Escape is matched on the key
 * and gets preventDefault() only when `onEscape()` closed a layer; it is never stopped, so the
 * light-DOM frame closes the calculator only when `defaultPrevented` is false (KB-3's last layer).
 * `mac` picks the platform's modifiers (matchShortcut). Returns the function that removes the
 * listener.
 */
export function installShellKeyboard(
  root: HTMLElement,
  handlers: ShellKeyboardHandlers,
  mac = isMacPlatform(currentPlatform())
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.isComposing && handlers.onKey?.(event) === true) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "Escape" && !event.isComposing) {
      if (handlers.onEscape()) event.preventDefault();
      return;
    }
    const action = matchShortcut(event, mac);
    if (action === null) return;
    if (NATIVE_EDITING.has(action) && inNativeTextControl(event)) return;
    event.preventDefault();
    event.stopPropagation();
    handlers.onShortcut(action);
  };
  root.addEventListener("keydown", onKeyDown, { capture: true });
  return () => root.removeEventListener("keydown", onKeyDown, { capture: true });
}
