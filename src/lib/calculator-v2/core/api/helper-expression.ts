// Helper expressions (API-10; 07 Decisions 3 and 8): expressions that add no row and that the
// worker evaluates with the rows' definitions. Each live helper has one current job. The engine
// re-issues every live helper after each `state` send, setBlank included, so values for an older
// job are ignored (API-6, AR-46). The HelperExpression type is public; HelperRegistry is
// package-internal.

import type { MainToWorker } from "../../worker/protocol";
import type { Value } from "../eval/values";
import { MAX_ROW_CHARACTERS } from "../latex";
import { KarmanCalculatorError } from "./errors";

export interface HelperExpression {
  readonly numericValue: number; // NaN until computed, undefined or non-real
  readonly listValue: number[] | undefined;
  observe(name: "numericValue" | "listValue", callback: () => void): () => void; // fires after every worker result for this helper, NaN included
  unobserve(name: "numericValue" | "listValue", callback?: () => void): void;
  destroy(): void;
}

type HelperName = "numericValue" | "listValue";

function invalid(method: string, text: string): never {
  throw new KarmanCalculatorError("invalid-argument", `${method}: ${text}`);
}

/** API-13, NM-42: the latex of a `{ latex }` spec, at most MAX_ROW_CHARACTERS long. */
function specLatex(spec: unknown): string {
  const method = "HelperExpression";
  if (Object.prototype.toString.call(spec) !== "[object Object]") {
    invalid(method, "spec must be an object");
  }
  const fields = spec as Record<string, unknown>;
  const unknown = Object.keys(fields).find((key) => key !== "latex");
  if (unknown !== undefined) invalid(method, `spec has an unknown key "${unknown}"`);
  const latex = Object.prototype.hasOwnProperty.call(fields, "latex") ? fields.latex : undefined;
  if (typeof latex !== "string") invalid(method, "latex must be a string");
  if (latex.length > MAX_ROW_CHARACTERS) {
    invalid(method, `latex is longer than ${MAX_ROW_CHARACTERS} characters`);
  }
  return latex;
}

/** API-13: "numericValue" or "listValue", else invalid-argument. */
function helperName(name: unknown, method: string): HelperName {
  if (name !== "numericValue" && name !== "listValue") {
    invalid(method, `unknown name ${String(name)}`);
  }
  return name;
}

/** API-13: a function, or undefined where the callback is optional; else invalid-argument. */
function callbackOf(callback: unknown, method: string, optional = false): (() => void) | undefined {
  if (typeof callback === "function") return callback as () => void;
  if (optional && callback === undefined) return undefined;
  return invalid(method, "callback must be a function");
}

/** API-10: a real number; NaN for undefined and for anything not real (complex, point, list). */
function numericOf(value: Value): number {
  return value.type === "number" && Number.isFinite(value.value) ? value.value : Number.NaN;
}

/**
 * API-10: a list of numbers, with NaN for an undefined item, as a frozen array; undefined for a
 * value that is not a list or holds anything else (as API-9's evaluation does).
 */
function listOf(value: Value): number[] | undefined {
  if (value.type !== "list") return undefined;
  const items = value.value.map((item) =>
    item.type === "number" ? item.value : item.type === "undefined" ? Number.NaN : null
  );
  return items.includes(null) ? undefined : (Object.freeze(items) as number[]);
}

class Helper implements HelperExpression {
  readonly latex: string;
  private readonly stop: (helper: Helper) => void;
  private numeric = Number.NaN;
  private list: number[] | undefined = undefined;
  private readonly callbacks: Record<HelperName, Set<() => void>> = {
    numericValue: new Set(),
    listValue: new Set(),
  };

  constructor(latex: string, stop: (helper: Helper) => void) {
    this.latex = latex;
    this.stop = stop;
  }

  get numericValue(): number {
    return this.numeric;
  }

  get listValue(): number[] | undefined {
    return this.list;
  }

  observe(name: HelperName, callback: () => void): () => void {
    const set = this.callbacks[helperName(name, "observe")];
    const fn = callbackOf(callback, "observe")!;
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  }

  unobserve(name: HelperName, callback?: () => void): void {
    const set = this.callbacks[helperName(name, "unobserve")];
    const fn = callbackOf(callback, "unobserve", true);
    if (fn === undefined) set.clear();
    else set.delete(fn);
  }

  /** Stops the helper: no later value reaches it and its observers are dropped; values stay. */
  destroy(): void {
    this.stop(this);
    this.callbacks.numericValue.clear();
    this.callbacks.listValue.clear();
  }

  /** Stores a result, then runs every numericValue and listValue observer, in that order. */
  update(value: Value): void {
    this.numeric = numericOf(value);
    this.list = listOf(value);
    for (const name of ["numericValue", "listValue"] as const) {
      const set = this.callbacks[name];
      for (const callback of [...set]) if (set.has(callback)) callback();
    }
  }
}

export class HelperRegistry {
  private readonly deps: { post(message: MainToWorker): void; generation(): number };
  /** Each live helper and its current job id. */
  private readonly live = new Map<Helper, number>();
  private lastJobId = 0;
  private disposed = false;

  constructor(deps: { post(message: MainToWorker): void; generation(): number }) {
    this.deps = deps;
  }

  /** API-10: validates the spec (API-13), then posts `evaluate` with a new jobId at generation(). */
  create(spec: { latex: string }): HelperExpression {
    const helper = new Helper(specLatex(spec), (h) => this.live.delete(h));
    if (!this.disposed) this.send(helper);
    return helper;
  }

  /** API-6, Decision 8: after every `state` send each live helper gets a new job; older ones die. */
  reissue(): void {
    for (const helper of [...this.live.keys()]) this.send(helper);
  }

  /** Ignored unless `jobId` is a live helper's current job; that helper then updates and fires. */
  receive(jobId: number, value: Value): void {
    const entry = [...this.live].find(([, current]) => current === jobId);
    entry?.[0].update(value);
  }

  /** The engine's destroy(): every helper stops, and later values are ignored. */
  dispose(): void {
    this.disposed = true;
    this.live.clear();
  }

  private send(helper: Helper): void {
    const jobId = ++this.lastJobId;
    this.live.set(helper, jobId);
    const generation = this.deps.generation();
    this.deps.post({ v: 1, type: "evaluate", jobId, generation, latex: helper.latex });
  }
}
