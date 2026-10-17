// The MathField adapter (AR-42; 01-interfaces-runtime.md section 9): one calculator v2 row's
// editable math field over the vendored MathQuill. This is the only module that imports
// vendor/mathquill/, values and types alike (AR-5).

import type { MathFieldAction } from "@/lib/calculator-v2/core/latex/operator-names";
import { bumpDevCounter } from "@/lib/calculator-v2/dev-counters";
import MathQuill from "../../../../vendor/mathquill/mathquill.js";
import type {
  EditableMathQuill,
  MathQuillConfig,
  MathQuillInterface,
} from "../../../../vendor/mathquill/mathquill";
import { isNativeHistoryChord, mathQuillOptions } from "./config";
import { toMathFieldLatex } from "./load-latex";
import { latexToSpeech } from "./speech";

export interface MathFieldOptions {
  ariaLabel: string; // "Expression n" (A11Y-3)
  maxLength: number; // MAX_ROW_CHARACTERS; longer writes are refused unchanged (T-13)
  onEdit(latex: string): void;
  onEnter(): void;
  onArrowOut(direction: "up" | "down"): void; // caret cannot move further (R-3)
  onDeleteOutOf(direction: "left" | "right"): void; // Backspace or Delete at an edge (R-9)
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
      overrideTypedText: (text) => this.transact((mq) => mq.typedText(text)),
      overrideKeystroke: (key, event) => {
        if (isNativeHistoryChord(key)) event.preventDefault();
        else this.transact((mq) => mq.keystroke(key, event));
      },
      handlers: {
        edit: () => this.edited(),
        enter: () => this.live() && this.options.onEnter(),
        upOutOf: () => this.live() && this.options.onArrowOut("up"),
        downOutOf: () => this.live() && this.options.onArrowOut("down"),
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
    this.transact((mq) => mq.typedText(text));
  }

  run(actions: readonly MathFieldAction[]): void {
    this.transact((mq) => {
      for (const { op, arg } of actions) {
        if (op === "write") mq.write(toMathFieldLatex(arg));
        else if (op === "cmd") mq.cmd(arg);
        else if (op === "keystroke") mq.keystroke(arg);
        else mq.typedText(arg);
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

  /**
   * MathQuill's substituteTextarea hook. The listeners are bound here, before MathQuill binds
   * its own. Copy, cut and paste only prevent the default action: 13's capture-phase bridge on
   * the shadow root has already run, and MathQuill (disableCopyPaste) never edits on them.
   */
  private createTextarea(): HTMLTextAreaElement {
    const textarea = this.element.ownerDocument.createElement("textarea");
    for (const [name, value] of Object.entries(TEXTAREA_ATTRIBUTES))
      textarea.setAttribute(name, value);
    textarea.setAttribute("inputmode", "text");
    textarea.setAttribute("aria-label", this.options.ariaLabel);
    const prevent = (event: Event) => event.preventDefault();
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
      ["copy", prevent],
      ["cut", prevent],
      ["paste", prevent],
    ];
    for (const [type, listener] of this.listeners) textarea.addEventListener(type, listener);
    this.textarea = textarea;
    return textarea;
  }
}

export function createMathField(host: HTMLElement, options: MathFieldOptions): MathField {
  return new KarmanMathField(host, options);
}
