// Recording stand-ins for the MathField adapter (
// and Decisions, "Fake MathFields in jsdom"). Component tests inject them through
// MathFieldFactoryContext, so an adapter call is asserted call by call; real MathQuill behaviour is
// asserted in the browser specs. Test-only: every import here is a type, so node tests that load
// this file never load the vendored MathQuill.

import type { MathFieldAction } from "@/lib/calculator/core/latex/operator-names";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex/limits";
import type { MathField, MathFieldOptions } from "../../../math-field/MathField";
import type { MathFieldFactory } from "../math-field-factory";

export interface FakeCall {
  // the only recorded methods: latex is latex(value), never a read; select,
  // clearSelection, reflow, destroy, speechText and selectedLatex run unrecorded
  method:
    | "focus"
    | "blur"
    | "latex"
    | "write"
    | "cmd"
    | "keystroke"
    | "typedText"
    | "run"
    | "setInputMode";
  arg: unknown;
}

export interface FakeMathField extends MathField {
  readonly options: MathFieldOptions;
  calls: FakeCall[]; // reassignable; the fake pushes to the current array
  emitEdit(latex: string): void; // sets the latex, then options.onEdit(latex)
}

export interface FakeFieldFactory {
  // a MathFieldFactory whose return type keeps the fake's own members visible to tests
  factory: (host: HTMLElement, options: MathFieldOptions) => FakeMathField;
  forRow(rowId: string): FakeMathField; // newest field whose host was inside [data-row-id] at creation
  byLabel(ariaLabel: string): FakeMathField; // newest field created with that ariaLabel
}

/** Options for a fake created outside a row: the given label, the T-13 limit, no-op callbacks. */
export function fakeOptions(
  ariaLabel: string,
  overrides: Partial<MathFieldOptions> = {}
): MathFieldOptions {
  return {
    ariaLabel,
    maxLength: MAX_ROW_CHARACTERS,
    onEdit: () => undefined,
    onEnter: () => undefined,
    onArrowOut: () => undefined,
    onDeleteOutOf: () => undefined,
    onFocus: () => undefined,
    onBlur: () => undefined,
    onRefused: () => undefined,
    ...overrides,
  };
}

/** The latex after one edit: write, cmd and typedText append; Backspace drops a character. */
function applyAction(latex: string, { op, arg }: MathFieldAction): string {
  if (op === "keystroke") return arg === "Backspace" ? latex.slice(0, -1) : latex;
  return latex + arg;
}

function createFakeMathField(host: HTMLElement, options: MathFieldOptions): FakeMathField {
  const doc = host.ownerDocument;
  const element = doc.createElement("span");
  element.className = "kc-fake-field";
  const textarea = doc.createElement("textarea");
  textarea.setAttribute("aria-label", options.ariaLabel);
  textarea.addEventListener("focus", () => options.onFocus());
  textarea.addEventListener("blur", () => options.onBlur());
  element.append(textarea);
  host.append(element);
  let current = "";

  const record = (method: FakeCall["method"], arg: unknown) => field.calls.push({ method, arg });
  // Like the adapter's transaction: one onEdit per call that changes the latex, and a result
  // past maxLength is refused with the latex unchanged.
  const edit = (actions: readonly MathFieldAction[]) => {
    const next = actions.reduce(applyAction, current);
    if (next.length > options.maxLength) {
      options.onRefused("char-limit");
      return;
    }
    if (next === current) return;
    current = next;
    options.onEdit(next);
  };

  function latex(): string;
  function latex(value: string): void;
  function latex(value?: string): string | void {
    if (value === undefined) return current;
    record("latex", value);
    current = value;
  }

  const field: FakeMathField = {
    element,
    options,
    calls: [],
    emitEdit(next) {
      current = next;
      options.onEdit(next);
    },
    focus() {
      record("focus", undefined);
      textarea.focus();
    },
    blur() {
      record("blur", undefined);
      textarea.blur();
    },
    latex,
    write(arg) {
      record("write", arg);
      edit([{ op: "write", arg }]);
    },
    cmd(arg) {
      record("cmd", arg);
      edit([{ op: "cmd", arg }]);
    },
    keystroke(arg) {
      record("keystroke", arg);
      edit([{ op: "keystroke", arg }]);
    },
    typedText(arg) {
      record("typedText", arg);
      edit([{ op: "typedText", arg }]);
    },
    run(actions) {
      record("run", actions);
      edit(actions);
    },
    setInputMode(mode) {
      record("setInputMode", mode);
    },
    select: () => undefined,
    clearSelection: () => undefined,
    selectedLatex: () => null,
    reflow: () => undefined,
    speechText: () => "",
    destroy() {
      element.remove();
    },
  };
  return field;
}

interface Created {
  field: FakeMathField;
  rowId: string | null;
}

/** A factory of recording fakes that remembers each field's row and label for lookups. */
export function createFakeFieldFactory(): FakeFieldFactory {
  const created: Created[] = [];
  const newest = (match: (c: Created) => boolean, what: string): FakeMathField => {
    for (let i = created.length - 1; i >= 0; i--) if (match(created[i])) return created[i].field;
    throw new Error(`No fake MathField was created for ${what}`);
  };
  const factory = ((host: HTMLElement, options: MathFieldOptions): FakeMathField => {
    const rowId = host.closest("[data-row-id]")?.getAttribute("data-row-id") ?? null;
    const field = createFakeMathField(host, options);
    created.push({ field, rowId });
    return field;
  }) satisfies MathFieldFactory;
  return {
    factory,
    forRow: (rowId) => newest((c) => c.rowId === rowId, `row ${rowId}`),
    byLabel: (ariaLabel) => newest((c) => c.field.options.ariaLabel === ariaLabel, ariaLabel),
  };
}
