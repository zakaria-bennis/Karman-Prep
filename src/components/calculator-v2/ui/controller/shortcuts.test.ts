// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import {
  installShellKeyboard,
  matchShortcut,
  type ShortcutAction,
  type ShortcutKey,
} from "./shortcuts";

/** A ShortcutKey with every flag false. */
function k(init: Partial<ShortcutKey>): ShortcutKey {
  return {
    code: "",
    key: "",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    ...init,
  };
}

/** Dispatches a cancelable, bubbling keydown on `el` and returns `defaultPrevented`. */
function press(el: Element, init: KeyboardEventInit): boolean {
  const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event.defaultPrevented;
}

let root: HTMLDivElement;
let inner: HTMLTextAreaElement;
let restore: () => void;

beforeEach(() => {
  restore = installDomStubs();
  root = document.body.appendChild(document.createElement("div"));
  inner = root.appendChild(document.createElement("textarea"));
});
afterEach(() => {
  root.remove();
  restore();
});

it("KB-7 shortcuts match event.code, accept Option-modified keys and ignore composition", () => {
  const cases: [Partial<ShortcutKey>, ShortcutAction | null][] = [
    [{ code: "KeyK", key: "˚", altKey: true }, "toggle-keypad"],
    [{ code: "KeyK", key: "k", ctrlKey: true }, "toggle-keypad"],
    [{ code: "KeyK", key: "k", metaKey: true }, null],
    [{ code: "KeyZ", key: "w", ctrlKey: true }, "undo"],
    [{ code: "KeyZ", key: "z", metaKey: true }, "undo"],
    [{ code: "KeyZ", key: "Z", metaKey: true, shiftKey: true }, "redo"],
    [{ code: "KeyY", key: "y", ctrlKey: true }, "redo"],
    [{ code: "KeyW", key: "z", ctrlKey: true }, null],
    [{ code: "Enter", key: "Enter", altKey: true }, "add-row-end"],
    [{ code: "KeyZ", key: "z", ctrlKey: true, isComposing: true }, null],
  ];
  for (const [init, action] of cases) expect(matchShortcut(k(init))).toBe(action);
});

it("KB-3 installShellKeyboard prevents a handled Escape without stopping it, and prevents and stops shortcuts", () => {
  const closes = [true, false];
  const actions: string[] = [];
  const heard: string[] = [];
  const ac = new AbortController();
  document.addEventListener("keydown", (e) => heard.push(e.key), { signal: ac.signal });
  const off = installShellKeyboard(root, {
    onShortcut: (a) => actions.push(a),
    onEscape: () => closes.shift()!,
  });
  expect([
    press(inner, { key: "Escape" }),
    press(inner, { key: "Escape" }),
    press(inner, { code: "KeyZ", key: "z", ctrlKey: true }),
  ]).toEqual([true, false, true]);
  expect(heard).toEqual(["Escape", "Escape"]);
  off();
  press(inner, { code: "KeyZ", key: "z", ctrlKey: true });
  expect([actions, heard.length]).toEqual([["undo"], 3]);
  ac.abort();
});

it("KB-7 undo, redo and add-row-end stay with a native text input; a math field's textarea, a radio and toggle-keypad still get them", () => {
  const actions: string[] = [];
  const off = installShellKeyboard(root, {
    onShortcut: (a) => actions.push(a),
    onEscape: () => false,
  });
  const input = root
    .appendChild(document.createElement("label"))
    .appendChild(Object.assign(document.createElement("input"), { type: "text" }));
  const radio = root.appendChild(Object.assign(document.createElement("input"), { type: "radio" }));
  const mq = root.appendChild(document.createElement("span"));
  mq.className = "mq-textarea";
  const mqTextarea = mq.appendChild(document.createElement("textarea"));
  expect([
    press(input, { code: "KeyZ", key: "z", ctrlKey: true }),
    press(input, { code: "KeyY", key: "y", ctrlKey: true }),
    press(input, { code: "KeyZ", key: "Z", metaKey: true, shiftKey: true }),
    press(input, { code: "Enter", key: "Enter", altKey: true }),
  ]).toEqual([false, false, false, false]);
  expect(actions).toEqual([]);
  expect([
    press(input, { code: "KeyK", key: "k", ctrlKey: true }),
    press(mqTextarea, { code: "KeyZ", key: "z", ctrlKey: true }),
    press(inner, { code: "KeyY", key: "y", ctrlKey: true }),
    press(radio, { code: "KeyZ", key: "z", ctrlKey: true }),
  ]).toEqual([true, true, true, true]);
  expect(actions).toEqual(["toggle-keypad", "undo", "redo", "undo"]);
  off();
});

it("POI-20 Alt or Option+T starts or stops the keyboard trace, matched on its code", () => {
  expect(matchShortcut(k({ code: "KeyT", key: "†", altKey: true }))).toBe("audio-trace");
  expect(matchShortcut(k({ code: "KeyT", key: "t", altKey: true, ctrlKey: true }))).toBeNull();
  expect(matchShortcut(k({ code: "KeyT", key: "t" }))).toBeNull();
});

it("POI-20 a key the running trace takes is prevented and stopped before shortcuts and Escape", () => {
  const taken: string[] = [];
  const off = installShellKeyboard(root, {
    onShortcut: () => undefined,
    onEscape: () => false,
    onKey: (e) => {
      if (e.key !== "PageDown" && e.key !== "Escape") return false;
      taken.push(e.key);
      return true;
    },
  });
  expect(press(inner, { key: "PageDown" })).toBe(true);
  expect(press(inner, { key: "Escape" })).toBe(true);
  expect(press(inner, { key: "a" })).toBe(false);
  expect(taken).toEqual(["PageDown", "Escape"]);
  off();
});
