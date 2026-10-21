// Recursive user functions, run as Desmos runs them (its recursion executor, read 2026-10-20):
// a call into a group of functions that reach themselves runs on an explicit stack of frames
// with a cache of finished calls, not on the JavaScript stack. A frame whose body meets a call
// that is not in the cache yet stops (MissingEntry), goes back on the stack under that call, and
// runs again once the call is done. More than RECURSION_DEPTH_LIMIT frames waiting, or more than
// RECURSION_STEP_LIMIT frames run, gives the failed value (undefined), as Desmos's
// "Recursive depth limit exceeded" does in a value. Each entry from outside the group gets a fresh
// cache. Pure TypeScript: no DOM.

import { sourceChildren, type Node } from "../latex/ast";

export const RECURSION_DEPTH_LIMIT = 10_000;
export const RECURSION_STEP_LIMIT = 2 * RECURSION_DEPTH_LIMIT;
/**
 * The frames one compiled expression may run across all its calls, so a graph whose samples
 * never reach a base case (`f(n)=\{n=0:0,f(n-1)+1\}` at x=0.5, 0.51, …) cannot stall the
 * evaluator: past it every recursive call is undefined. Ten failing calls' worth of steps.
 */
export const RECURSION_BUDGET = 10 * RECURSION_STEP_LIMIT;

export interface Frame<V> {
  fn: string;
  args: readonly V[];
}

/** Thrown by a recursive call whose result is not cached yet; caught only by `trampoline`. */
export class MissingEntry<V> {
  constructor(readonly frame: Frame<V>) {}
}

/** A recursion in progress: the finished calls by frameKey. */
export interface RecursionRun<V> {
  cache: Map<string, V>;
}
/** The steps a compiled expression has left (RECURSION_BUDGET). */
export interface RecursionBudget {
  left: number;
}

/** A frame's cache key: the function and its arguments, NaN and infinities kept distinct. */
export function frameKey<V>(frame: Frame<V>): string {
  let key = frame.fn;
  for (const arg of frame.args) key += `:${argKey(arg)}`;
  return key;
}

/** One argument's key: a number (raw or a number value) as its text, anything else as JSON. */
function argKey(arg: unknown): string {
  if (typeof arg === "number") return String(arg);
  const v = arg as { type?: string; value?: unknown };
  if (v.type === "number" && typeof v.value === "number") return String(v.value);
  return JSON.stringify(arg, (_k, w: unknown) => (typeof w === "number" ? String(w) : w));
}

/**
 * The result of `root`: frames run with `invoke` until the root's result is cached, or `failed`
 * past the depth or step limit.
 */
export function trampoline<V>(
  root: Frame<V>,
  invoke: (frame: Frame<V>) => V,
  failed: V,
  run: RecursionRun<V>,
  budget: RecursionBudget
): V {
  const stack: Frame<V>[] = [root];
  let steps = 0;
  while (stack.length > 0) {
    if (stack.length > RECURSION_DEPTH_LIMIT || steps++ > RECURSION_STEP_LIMIT) return failed;
    if (budget.left-- <= 0) return failed;
    const frame = stack.pop()!;
    const key = frameKey(frame);
    if (run.cache.has(key)) continue;
    try {
      run.cache.set(key, invoke(frame));
    } catch (thrown) {
      if (!(thrown instanceof MissingEntry)) throw thrown;
      stack.push(frame, (thrown as MissingEntry<V>).frame);
    }
  }
  return run.cache.get(frameKey(root)) ?? failed;
}

/**
 * Inside a recursion, the cached result of `frame`, or a MissingEntry thrown for it; outside one,
 * null (the caller starts a recursion).
 */
export function cachedOrMissing<V>(run: RecursionRun<V> | null, frame: Frame<V>): V | null {
  if (run === null) return null;
  const key = frameKey(frame);
  if (run.cache.has(key)) return run.cache.get(key)!;
  throw new MissingEntry(frame);
}

const recursiveSets = new WeakMap<object, ReadonlySet<string>>();

/** The names of `functions` whose bodies reach a call of themselves, through any other function. */
export function recursiveNames(
  functions: ReadonlyMap<string, { body: Node }>
): ReadonlySet<string> {
  const known = recursiveSets.get(functions);
  if (known !== undefined) return known;
  const calls = new Map<string, Set<string>>();
  for (const [name, { body }] of functions) {
    const called = new Set<string>();
    const pending: Node[] = [body];
    for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
      if ((node.kind === "call" || node.kind === "id") && functions.has(node.name)) {
        called.add(node.name);
      }
      pending.push(...sourceChildren(node));
    }
    calls.set(name, called);
  }
  const found = new Set<string>();
  for (const name of functions.keys()) {
    const seen = new Set<string>();
    const pending = [...(calls.get(name) ?? [])];
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      if (next === name) {
        found.add(name);
        break;
      }
      if (seen.has(next)) continue;
      seen.add(next);
      pending.push(...(calls.get(next) ?? []));
    }
  }
  recursiveSets.set(functions, found);
  return found;
}

/** The state of a real-mode evaluator a recursive frame binds its parameters in. */
export interface RealCallState {
  env: number[];
  bound: number[];
  sp: number;
  depth: number;
  recursion: RecursionRun<number> | null;
  budget: RecursionBudget;
}

/**
 * A call of a recursive function in the real-mode evaluator: inside a recursion its cached result
 * (or a MissingEntry); outside one, a new recursion from this call. `invoke` binds a frame's
 * arguments to `fn`'s parameter slots; the state is restored after every frame, finished or not.
 */
export function realRecursiveCall(
  state: RealCallState,
  name: string,
  args: readonly (() => number)[],
  slotsOf: (fn: string) => { slots: readonly number[]; body: () => number } | null
): () => number {
  const invoke = (frame: Frame<number>): number => {
    const fn = slotsOf(frame.fn);
    if (fn === null) return NaN;
    const env = state.env.slice(),
      bound = state.bound.slice(),
      { sp, depth } = state;
    fn.slots.forEach((slot, k) => {
      state.env[slot] = frame.args[k];
      state.bound[slot] = 1;
    });
    state.depth = 0;
    try {
      return fn.body();
    } finally {
      env.forEach((v, k) => (state.env[k] = v));
      bound.forEach((v, k) => (state.bound[k] = v));
      [state.sp, state.depth] = [sp, depth];
    }
  };
  return () => {
    const frame = { fn: name, args: args.map((arg) => arg()) };
    const cached = cachedOrMissing(state.recursion, frame);
    if (cached !== null) return cached;
    const run: RecursionRun<number> = { cache: new Map() };
    state.recursion = run;
    try {
      return trampoline(frame, invoke, NaN, run, state.budget);
    } finally {
      state.recursion = null;
    }
  };
}
