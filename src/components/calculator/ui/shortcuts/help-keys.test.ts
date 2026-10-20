import { expect, it } from "vitest";
import { isMacPlatform, matchHelpKey, type HelpKey } from "./help-keys";

const key = (code: string, mods: Partial<HelpKey> = {}): HelpKey => ({
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  ...mods,
});

it("SETTINGS-31, -32, -33 Windows: Ctrl+/ opens the dialog, Ctrl+Alt+G the settings, Alt+D the angle", () => {
  expect(matchHelpKey(key("Slash", { ctrlKey: true }), false)).toBe("shortcuts-dialog");
  expect(matchHelpKey(key("KeyG", { ctrlKey: true, altKey: true }), false)).toBe("toggle-settings");
  expect(matchHelpKey(key("KeyD", { altKey: true }), false)).toBe("toggle-degrees");
  for (const k of [
    key("Slash", { metaKey: true }),
    key("Slash"),
    key("KeyG", { ctrlKey: true }),
    key("KeyD", { ctrlKey: true }),
    key("KeyD", { altKey: true, shiftKey: true }),
    key("Slash", { ctrlKey: true, isComposing: true }),
  ])
    expect(matchHelpKey(k, false)).toBeNull();
});

it("SETTINGS-31 Mac: Cmd+/ opens the dialog, Ctrl+Cmd+G the settings, Ctrl+D the angle", () => {
  expect(matchHelpKey(key("Slash", { metaKey: true }), true)).toBe("shortcuts-dialog");
  expect(matchHelpKey(key("KeyG", { ctrlKey: true, metaKey: true }), true)).toBe("toggle-settings");
  expect(matchHelpKey(key("KeyD", { ctrlKey: true }), true)).toBe("toggle-degrees");
  expect(matchHelpKey(key("Slash", { ctrlKey: true }), true)).toBeNull();
  expect(matchHelpKey(key("KeyD", { altKey: true }), true)).toBeNull();
});

it("SETTINGS-31 the platform is Mac for Mac, iPhone and iPad platform strings", () => {
  expect(["MacIntel", "iPhone", "iPad", "Win32", "Linux x86_64"].map(isMacPlatform)).toEqual([
    true,
    true,
    true,
    false,
    false,
  ]);
});
