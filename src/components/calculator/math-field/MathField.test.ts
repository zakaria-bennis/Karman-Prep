// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createMathField, type MathField, type MathFieldOptions } from "./MathField";

const mounted: MathField[] = [];
afterEach(() => mounted.splice(0).forEach((f) => f.destroy()));
function mount(overrides: Partial<MathFieldOptions> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const options: MathFieldOptions = {
    ariaLabel: "Expression 1",
    maxLength: 2048,
    onEdit: vi.fn(),
    onEnter: vi.fn(),
    onArrowOut: vi.fn(),
    onDeleteOutOf: vi.fn(),
    onFocus: vi.fn(),
    onBlur: vi.fn(),
    onRefused: vi.fn(),
    ...overrides,
  };
  const field = createMathField(host, options);
  mounted.push(field);
  const textarea = field.element.querySelector("textarea")!;
  return { host, field, options, textarea };
}

it("createMathField: typedText and keystroke edit the field and onEdit fires once per change", () => {
  const { field, options } = mount();
  field.typedText("y=x^2");
  field.keystroke("Right");
  field.typedText("+3/4");
  expect(field.latex()).toBe("y=x^{2}+\\frac{3}{4}");
  expect(options.onEdit).toHaveBeenCalledTimes(2);
  expect(options.onEdit).toHaveBeenLastCalledWith("y=x^{2}+\\frac{3}{4}");
});
it("createMathField: latex(value) loads silently; write, cmd and run edit at the caret", () => {
  const { field, options } = mount();
  field.latex("x+1");
  expect(options.onEdit).not.toHaveBeenCalled();
  field.write("\\frac{1}{2}");
  expect(field.latex()).toBe("x+1\\frac{1}{2}");
  field.latex("");
  field.cmd("\\sqrt");
  field.typedText("x");
  expect(field.latex()).toBe("\\sqrt{x}");
  field.latex("");
  field.run([
    { op: "write", arg: "\\sin\\left(\\right)" },
    { op: "keystroke", arg: "Left" },
  ]);
  expect(options.onEdit).toHaveBeenLastCalledWith("\\sin\\left(\\right)");
  field.typedText("t");
  expect(field.latex()).toBe("\\sin\\left(t\\right)");
  field.latex("\\displaystyle\\tfrac{1}{2}");
  expect(field.latex()).toBe("\\frac{1}{2}");
});
it("createMathField: an edit past maxLength is refused and leaves the field unchanged", () => {
  const { field, options } = mount({ maxLength: 8 });
  field.latex("x+1");
  field.typedText("23456");
  expect(field.latex()).toBe("x+123456"); // exactly 8 characters are accepted
  field.typedText("7");
  expect(field.latex()).toBe("x+123456");
  field.latex("123456789");
  expect(field.latex()).toBe("x+123456");
  expect(options.onRefused).toHaveBeenCalledTimes(2);
  expect(options.onRefused).toHaveBeenCalledWith("char-limit");
  expect(options.onEdit).toHaveBeenCalledTimes(1);
});
it("createMathField: Enter, Up, Down and Backspace or Delete at an edge raise their callbacks", () => {
  const { field, options } = mount();
  field.typedText("\n");
  field.keystroke("Up");
  field.keystroke("Down");
  field.latex("x");
  field.keystroke("Home");
  field.keystroke("Backspace");
  field.keystroke("End");
  field.keystroke("Del");
  expect(options.onEnter).toHaveBeenCalledTimes(1);
  expect(vi.mocked(options.onArrowOut).mock.calls).toEqual([["up"], ["down"]]);
  expect(vi.mocked(options.onDeleteOutOf).mock.calls).toEqual([["left"], ["right"]]);
  expect(field.latex()).toBe("x");
});
it("D-7 createMathField: Left at the start and Right at the end raise onMoveOutOf", () => {
  const onMoveOutOf = vi.fn();
  const { field } = mount({ onMoveOutOf });
  field.latex("2");
  field.keystroke("End");
  field.keystroke("Right");
  field.keystroke("Home");
  field.keystroke("Left");
  expect(onMoveOutOf.mock.calls).toEqual([["right"], ["left"]]);
});
it("createMathField: focus, blur and selection work through the adapter", () => {
  const { field, options, textarea } = mount();
  field.focus();
  expect(document.activeElement).toBe(textarea);
  expect(options.onFocus).toHaveBeenCalledTimes(1);
  field.latex("y=x^{2}");
  field.select();
  expect(field.selectedLatex()).toBe("y=x^{2}");
  field.clearSelection();
  expect(field.selectedLatex()).toBeNull();
  field.blur();
  expect(options.onBlur).toHaveBeenCalledTimes(1);
});
it("createMathField: the textarea is named by ariaLabel and setInputMode switches inputmode", () => {
  const { field, textarea } = mount();
  expect(
    ["autocapitalize", "autocorrect", "spellcheck", "inputmode", "aria-label"].map((a) =>
      textarea.getAttribute(a)
    )
  ).toEqual(["off", "off", "false", "text", "Expression 1"]);
  field.setInputMode("none");
  expect(textarea.getAttribute("inputmode")).toBe("none");
  field.typedText("x");
  field.focus();
  field.blur();
  expect(textarea.getAttribute("aria-label")).toBe("Expression 1"); // patch 0004
});
it("createMathField: native undo, redo, copy, cut and paste never reach MathQuill", async () => {
  const { field, textarea } = mount();
  field.typedText("x");
  const fire = (event: Event) => (textarea.dispatchEvent(event), event.defaultPrevented);
  // key, code, keyCode and which are all set (jsdom leaves keyCode and which at 0 otherwise),
  // so the chord reads as Ctrl-Z etc. whichever property MathQuill's key normaliser uses
  const chord = (key: string, modifiers: KeyboardEventInit) => {
    const keyCode = key.toLowerCase() === "z" ? 90 : 89;
    return new KeyboardEvent("keydown", {
      key,
      code: keyCode === 90 ? "KeyZ" : "KeyY",
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    });
  };
  const chords: [string, KeyboardEvent][] = [
    ["Ctrl-Z", chord("z", { ctrlKey: true })],
    ["Meta-Z", chord("z", { metaKey: true })],
    ["Ctrl-Shift-Z", chord("Z", { ctrlKey: true, shiftKey: true })],
    ["Meta-Shift-Z", chord("Z", { metaKey: true, shiftKey: true })],
    ["Ctrl-Y", chord("y", { ctrlKey: true })],
  ];
  for (const [name, event] of chords) expect(fire(event), name).toBe(true);
  expect(
    fire(
      new InputEvent("beforeinput", { inputType: "historyUndo", bubbles: true, cancelable: true })
    )
  ).toBe(true);
  expect(fire(new Event("paste", { bubbles: true, cancelable: true }))).toBe(true);
  // copy and cut with a selection: prevented, and MathQuill neither deletes nor changes the
  // selection (its cut path would act in a setTimeout, so wait one task before reading)
  field.select();
  for (const type of ["copy", "cut"])
    expect(fire(new Event(type, { bubbles: true, cancelable: true })), type).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect([field.latex(), field.selectedLatex()]).toEqual(["x", "x"]);
});
/** A clipboard event with a working clipboardData (jsdom has no DataTransfer). */
function clipboardEvent(type: string, text = "") {
  const store = new Map<string, string>([["text/plain", text]]);
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: (f: string) => store.get(f) ?? "",
      setData: (f: string, v: string) => store.set(f, v),
    },
  });
  return { event, read: () => store.get("text/plain") };
}
it("break-ui copy takes the selection or, with none, the whole field; cut deletes the selection", () => {
  const { field, textarea } = mount();
  field.latex("y=x^{2}");
  const copy = clipboardEvent("copy");
  textarea.dispatchEvent(copy.event);
  expect([copy.event.defaultPrevented, copy.read()]).toEqual([true, "y=x^{2}"]);
  field.select();
  const cut = clipboardEvent("cut");
  textarea.dispatchEvent(cut.event);
  expect([cut.read(), field.latex()]).toEqual(["y=x^{2}", ""]);
});
it("break-ui paste writes the first cleaned line at the caret and refuses text over maxLength", () => {
  const { field, textarea, options } = mount({ maxLength: 20 });
  field.latex("y=");
  textarea.dispatchEvent(clipboardEvent("paste", "\u0000 2x+1 \nignored").event);
  expect(field.latex()).toBe("y=2x+1");
  textarea.dispatchEvent(clipboardEvent("paste", "x".repeat(21)).event);
  expect(field.latex()).toBe("y=2x+1");
  expect(options.onRefused).toHaveBeenCalledWith("char-limit");
});
it("createMathField: speechText reads the parser tree and falls back to MathQuill for unparsed input", () => {
  const { field } = mount();
  expect(field.speechText()).toBe("");
  field.latex("y=x^{2}+\\frac{3}{4}");
  expect(field.speechText()).toBe("y equals x squared plus 3 fourths");
  field.latex("x+");
  expect(field.speechText()).toMatch(/plus/);
});
it("createMathField: reflow bumps the reflows counter and destroy is idempotent", () => {
  const { host, field, options } = mount();
  const before = globalThis.__karmanCalculatorCounters?.reflows ?? 0;
  field.reflow();
  expect(globalThis.__karmanCalculatorCounters?.reflows).toBe(before + 1);
  field.destroy();
  field.destroy();
  field.typedText("x");
  expect(host.childElementCount).toBe(0);
  expect(field.latex()).toBe("");
  expect(options.onEdit).not.toHaveBeenCalled();
});
it("T-7 typing % writes Desmos's % of, the caret after it, whatever comes before (live Desmos, 2026-10-22)", () => {
  const { field } = mount();
  field.typedText("5%40");
  expect(field.latex()).toBe("5\\%\\operatorname{of}40");
  for (const [before, after] of [
    ["", "\\%\\operatorname{of}Z"],
    ["a", "a\\%\\operatorname{of}Z"],
    ["x+", "x+\\%\\operatorname{of}Z"],
    ["5%", "5\\%\\operatorname{of}\\%\\operatorname{of}Z"],
  ]) {
    field.latex("");
    field.typedText(`${before}%Z`);
    expect(field.latex()).toBe(after);
  }
});
it("T-7 Backspace deletes % of as one unit, and loaded \\%\\operatorname{of} is one unit too", () => {
  const { field } = mount();
  field.typedText("5%4");
  field.keystroke("Backspace");
  expect(field.latex()).toBe("5\\%\\operatorname{of}");
  field.keystroke("Backspace");
  expect(field.latex()).toBe("5");
  field.latex("7\\%\\operatorname{of}");
  field.keystroke("End");
  field.keystroke("Backspace");
  expect(field.latex()).toBe("7");
});
