// The MathField adapter (AR-42): one calculator row's
// editable math field over the vendored MathQuill. This is the only module that imports
// vendor/mathquill/, values and types alike (AR-5).

import type { MathFieldAction } from "@/lib/calculator/core/latex/operator-names";
import { bumpDevCounter } from "@/lib/calculator/dev-counters";
import MathQuill from "../../../../vendor/mathquill/mathquill.js";
import type {
  EditableMathQuill,
  MathQuillConfig,
  MathQuillInterface,
} from "../../../../vendor/mathquill/mathquill";
import { isModifiedEnter, isNativeHistoryChord, mathQuillOptions } from "./config";
import { toMathFieldLatex } from "./load-latex";
import { overRowLimit, pastedLatex, pastedLines } from "./paste-text";
import { latexToSpeech } from "./speech";

export interface MathFieldOptions {
  ariaLabel: string; // "Expression n" (A11Y-3)
  maxLength: number; // MAX_ROW_CHARACTERS; longer writes are refused unchanged (T-13)
  onEdit(latex: string): void;
  onEnter(): void;
  onArrowOut(direction: "up" | "down"): void; // caret cannot move further (R-3)
  onDeleteOutOf(direction: "left" | "right"): void; // Backspace or Delete at an edge (R-9)
  onMoveOutOf?(direction: "left" | "right"): void; // ArrowLeft or ArrowRight at an edge (D-7)
  onFocus(): void;
  onBlur(): void;
  onRefused(reason: "char-limit"): void;
}

export interface MathField {
  readonly element: HTMLElement;
  focus(): void;
  blur(): void;
  latex(): string;
  latex(value: string): void;
  write(latex: string): void;
  cmd(name: string): void;
  keystroke(keys: string): void;
  typedText(text: string): void;
  run(actions: readonly MathFieldAction[]): void;
  select(): void;
  clearSelection(): void;
  selectedLatex(): string | null; // T-5 copy (13 uses it in the App copy listener)
  reflow(): void; // bumps the "reflows" dev counter
  setInputMode(mode: "none" | "text"): void; // T-11
  speechText(): string; // T-5
  destroy(): void;
}

/** One MathQuill interface for the module, created on first use. */
let mathQuillInterface: MathQuillInterface | null = null;
function mathQuill(): MathQuillInterface {
  mathQuillInterface ??= MathQuill.getInterface(3);
  return mathQuillInterface;
}

/** The textbox attributes of the adapter contract; aria-label and inputmode are set apart. */
const TEXTAREA_ATTRIBUTES: Readonly<Record<string, string>> = Object.freeze({
  autocapitalize: "off",
  autocomplete: "off",
  autocorrect: "off",
  spellcheck: "false",
});

type Listener = [type: string, listener: (event: Event) => void];

class KarmanMathField implements MathField {
  readonly element: HTMLElement;
  private readonly options: MathFieldOptions;
  /** Undefined while MathQuill builds the field inside the constructor. */
  private readonly mq: EditableMathQuill | undefined;
  private textarea: HTMLTextAreaElement | null = null;
  private listeners: Listener[] = [];
  /** Above 0 while the adapter itself changes the field; the edit handler then stays quiet. */
  private silent = 0;
  private lastLatex = "";
  private destroyed = false;

  constructor(host: HTMLElement, options: MathFieldOptions) {
    this.options = options;
    this.element = host.ownerDocument.createElement("span");
    this.element.className = "kc-math-field";
    host.append(this.element);
    const config: MathQuillConfig = {
      ...mathQuillOptions(),
      substituteTextarea: () => this.createTextarea(),
      overrideTypedText: (text) => this.transact((mq) => typeInto(mq, text)),
      overrideKeystroke: (key, event) => {
        // A modified Enter (Shift, Alt, Ctrl or Cmd) does nothing, as in Desmos: preventing it
        // stops the newline MathQuill would read as Enter (owner decision, 2026-10-21).
        if (isNativeHistoryChord(key) || isModifiedEnter(key)) event.preventDefault();
        else this.transact((mq) => mq.keystroke(key, event));
      },
      handlers: {
        edit: () => this.edited(),
        enter: () => this.live() && this.options.onEnter(),
        upOutOf: () => this.live() && this.options.onArrowOut("up"),
        downOutOf: () => this.live() && this.options.onArrowOut("down"),
        moveOutOf: (direction) =>
          this.live() && this.options.onMoveOutOf?.(direction < 0 ? "left" : "right"),
        deleteOutOf: (direction) =>
          this.live() && this.options.onDeleteOutOf(direction < 0 ? "left" : "right"),
      },
    };
    this.silent++;
    try {
      this.mq = mathQuill().MathField(this.element, config);
    } finally {
      this.silent--;
    }
  }

  focus(): void {
    this.live()?.focus();
  }

  blur(): void {
    this.live()?.blur();
  }

  latex(): string;
  latex(value: string): void;
  latex(value?: string): string | void {
    const mq = this.live();
    if (value === undefined) return mq ? mq.latex() : "";
    if (!mq) return;
    const before = mq.latex();
    let refused = false;
    this.silent++;
    try {
      mq.latex(toMathFieldLatex(value));
      if (mq.latex().length > this.options.maxLength) {
        mq.latex(before);
        refused = true;
      }
    } finally {
      this.silent--;
    }
    this.lastLatex = mq.latex();
    if (refused) this.options.onRefused("char-limit");
  }

  write(latex: string): void {
    this.transact((mq) => mq.write(toMathFieldLatex(latex)));
  }

  cmd(name: string): void {
    this.transact((mq) => mq.cmd(name));
  }

  keystroke(keys: string): void {
    this.transact((mq) => mq.keystroke(keys));
  }

  typedText(text: string): void {
    this.transact((mq) => typeInto(mq, text));
  }

  run(actions: readonly MathFieldAction[]): void {
    this.transact((mq) => {
      for (const { op, arg } of actions) {
        if (op === "write") mq.write(toMathFieldLatex(arg));
        else if (op === "cmd") mq.cmd(arg);
        else if (op === "keystroke") mq.keystroke(arg);
        else typeInto(mq, arg);
      }
    });
  }

  select(): void {
    this.live()?.select();
  }

  clearSelection(): void {
    this.live()?.clearSelection();
  }

  selectedLatex(): string | null {
    return this.live()?.selectionLatex() ?? null;
  }

  reflow(): void {
    const mq = this.live();
    if (!mq) return;
    mq.reflow();
    bumpDevCounter("reflows", 1);
  }

  setInputMode(mode: "none" | "text"): void {
    if (this.live()) this.textarea?.setAttribute("inputmode", mode);
  }

  speechText(): string {
    const mq = this.live();
    const latex = mq ? mq.latex() : "";
    if (!mq || latex === "") return "";
    return latexToSpeech(latex) || mq.mathspeak().trim();
  }

  destroy(): void {
    const mq = this.live();
    if (this.destroyed) return;
    this.destroyed = true;
    for (const [type, listener] of this.listeners)
      this.textarea?.removeEventListener(type, listener);
    this.listeners = [];
    if (mq) {
      mq.blur();
      mq.revert();
    }
    this.element.remove();
  }

  /** The MathQuill field, or null before MathQuill returns it and after destroy(). */
  private live(): EditableMathQuill | null {
    return this.destroyed || this.mq === undefined ? null : this.mq;
  }

  /**
   * Every edit but latex(value) runs here, so onEdit fires once per call that changes the LaTeX;
   * a change past maxLength is reverted and refused instead.
   */
  private transact(apply: (mq: EditableMathQuill) => void): void {
    const mq = this.live();
    if (!mq) return;
    const before = mq.latex();
    this.silent++;
    try {
      apply(mq);
    } finally {
      this.silent--;
    }
    if (this.destroyed) return; // a callback raised during apply destroyed the field
    const after = mq.latex();
    if (after.length > this.options.maxLength) {
      this.silent++;
      try {
        mq.latex(before);
      } finally {
        this.silent--;
      }
      this.options.onRefused("char-limit");
      return;
    }
    if (after !== this.lastLatex) {
      this.lastLatex = after;
      this.options.onEdit(after);
    }
  }

  /** MathQuill's edit handler: reports a change the adapter did not make itself. */
  private edited(): void {
    const mq = this.live();
    if (!mq || this.silent > 0) return;
    const latex = mq.latex();
    if (latex === this.lastLatex) return;
    this.lastLatex = latex;
    this.options.onEdit(latex);
  }

  /** Copy or cut: see createTextarea. */
  private copyTo(event: ClipboardEvent, cut: boolean): void {
    event.preventDefault();
    const selected = this.selectedLatex();
    const text = selected ?? this.latex();
    if (text === "" || !event.clipboardData) return;
    event.clipboardData.setData("text/plain", text);
    if (cut && selected !== null) this.keystroke("Backspace");
  }

  /** Paste: the first math line at the caret, refused at once when over maxLength (T-13). */
  private pasteFrom(event: ClipboardEvent): void {
    event.preventDefault();
    const [line] = pastedLines(event.clipboardData?.getData("text/plain") ?? "");
    if (line === undefined) return;
    const latex = pastedLatex(line);
    if (overRowLimit(latex, this.options.maxLength)) this.options.onRefused("char-limit");
    else this.write(latex);
  }

  /**
   * MathQuill's substituteTextarea hook. The listeners are bound here, before MathQuill binds
   * its own. Copy, cut and paste are the adapter's (MathQuill has disableCopyPaste), as the
   * reference's: copy puts the selection's LaTeX, or the whole field's when nothing is selected,
   * on the clipboard; cut also deletes the selection; paste writes the first math line at the caret
   * (the expression list's capture listener has already taken grids and multi-line pastes).
   */
  private createTextarea(): HTMLTextAreaElement {
    const textarea = this.element.ownerDocument.createElement("textarea");
    for (const [name, value] of Object.entries(TEXTAREA_ATTRIBUTES))
      textarea.setAttribute(name, value);
    textarea.setAttribute("inputmode", "text");
    textarea.setAttribute("aria-label", this.options.ariaLabel);
    this.listeners = [
      ["focus", () => this.live() && this.options.onFocus()],
      ["blur", () => this.live() && this.options.onBlur()],
      [
        "beforeinput",
        (event) => {
          const { inputType } = event as InputEvent;
          if (inputType === "historyUndo" || inputType === "historyRedo") event.preventDefault();
        },
      ],
      ["copy", (event) => this.copyTo(event as ClipboardEvent, false)],
      ["cut", (event) => this.copyTo(event as ClipboardEvent, true)],
      ["paste", (event) => this.pasteFrom(event as ClipboardEvent)],
    ];
    for (const [type, listener] of this.listeners) textarea.addEventListener(type, listener);
    this.textarea = textarea;
    return textarea;
  }
}

export function createMathField(host: HTMLElement, options: MathFieldOptions): MathField {
  return new KarmanMathField(host, options);
}

/**
 * RT-23, RT-30: `latex` typeset read-only in `host` (MathQuill's static math), for regression
 * equations and statistics. The host keeps its own accessible name; the math is aria-hidden.
 * Falls back to the plain latex text where MathQuill cannot typeset (no layout engine).
 */
export function renderStaticMath(host: HTMLElement, latex: string): void {
  const api = mathQuill() as unknown as {
    StaticMath?: (el: HTMLElement) => { latex(value: string): void };
  };
  try {
    if (api.StaticMath === undefined) throw new Error("no static math");
    host.textContent = "";
    api.StaticMath(host).latex(latex);
  } catch {
    host.textContent = latex;
  }
}

/** Types `text`, a typed ° being Desmos's `\degree` (owner decision, 2026-10-21). */
function typeInto(mq: EditableMathQuill, text: string): void {
  text.split("°").forEach((part, k) => {
    if (k > 0) mq.cmd("\\degree");
    if (part !== "") mq.typedText(part);
  });
}
