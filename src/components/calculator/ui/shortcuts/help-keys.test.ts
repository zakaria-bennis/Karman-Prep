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

it("SETTINGS-32 the zoom keys: Alt (Windows) or Ctrl (Mac) with =, -, 0 or the numpad + and -; Shift+= does not zoom", () => {
  const cases: [string, string][] = [
    ["Equal", "zoom-in"],
    ["NumpadAdd", "zoom-in"],
    ["Minus", "zoom-out"],
    ["NumpadSubtract", "zoom-out"],
    ["Digit0", "zoom-default"],
  ];
  for (const [code, action] of cases) {
    expect(matchHelpKey(key(code, { altKey: true }), false)).toBe(action);
    expect(matchHelpKey(key(code, { ctrlKey: true }), true)).toBe(action);
    expect(matchHelpKey(key(code, { ctrlKey: true }), false)).toBeNull();
    expect(matchHelpKey(key(code, { metaKey: true }), true)).toBeNull();
    expect(matchHelpKey(key(code), false)).toBeNull();
  }
  expect(matchHelpKey(key("Equal", { altKey: true, shiftKey: true }), false)).toBeNull();
  expect(matchHelpKey(key("Equal", { ctrlKey: true, shiftKey: true }), true)).toBeNull();
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

it("R-5 Alt+Shift+A (Cmd+Shift+A on a Mac) switches the row between decimal and fraction", () => {
  expect(matchHelpKey(key("KeyA", { altKey: true, shiftKey: true }), false)).toBe(
    "toggle-fraction"
  );
  expect(matchHelpKey(key("KeyA", { metaKey: true, shiftKey: true }), true)).toBe(
    "toggle-fraction"
  );
  for (const [k, mac] of [
    [key("KeyA", { altKey: true }), false],
    [key("KeyA", { ctrlKey: true, shiftKey: true }), false],
    [key("KeyA", { altKey: true, shiftKey: true }), true],
    [key("KeyA", { metaKey: true }), true],
  ] as const)
    expect(matchHelpKey(k, mac)).toBeNull();
});
