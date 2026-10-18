// Test-only AR-44 guards: while installed, `eval`, `Function`, `Function.prototype.constructor`,
// the async, generator and async-generator function constructors, and `setTimeout`/`setInterval`
// with a string first argument record the call and then throw. Each is a Proxy around the original,
// installed and restored with Object.defineProperty. The guards wrap the globals and never call a
// code-generation path themselves. Never imported by production code.

/** What `restore()` puts back: the object, the property and its original descriptor. */
interface Saved {
  target: object;
  key: string;
  descriptor: PropertyDescriptor;
}

type AnyFunction = (...args: unknown[]) => unknown;

export function installCodegenGuards(): { calls: string[]; restore(): void } {
  const calls: string[] = [];
  const saved: Saved[] = [];

  const refuse = (name: string): never => {
    calls.push(name);
    throw new EvalError(
      `AR-44: ${name} is disabled while the code-generation guards are installed`
    );
  };

  /** Replaces `target[key]` with `proxy`, keeping the original descriptor's other attributes. */
  const replace = (target: object, key: string, proxy: unknown): void => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor === undefined) throw new Error(`installCodegenGuards: no ${key} to guard`);
    saved.push({ target, key, descriptor });
    Object.defineProperty(target, key, { ...descriptor, value: proxy });
  };

  /** A Proxy whose call and `new` both record `name` and throw. */
  const blocked = (fn: AnyFunction, name: string): AnyFunction =>
    new Proxy(fn, {
      apply: () => refuse(name),
      construct: () => refuse(name),
    });

  /** A timer that records and throws for a string handler and otherwise calls the original. */
  const stringTimer = (fn: AnyFunction, name: string): AnyFunction =>
    new Proxy(fn, {
      apply: (target, thisArg, args: unknown[]) =>
        typeof args[0] === "string" ? refuse(name) : Reflect.apply(target, thisArg, args),
    });

  const globals = globalThis as unknown as Record<string, AnyFunction>;
  const constructors: [string, AnyFunction][] = [
    ["Function", Function as unknown as AnyFunction],
    ["AsyncFunction", Object.getPrototypeOf(async function () {}).constructor],
    ["GeneratorFunction", Object.getPrototypeOf(function* () {}).constructor],
    ["AsyncGeneratorFunction", Object.getPrototypeOf(async function* () {}).constructor],
  ];

  try {
    replace(globalThis, "eval", blocked(globals.eval, "eval"));
    replace(globalThis, "Function", blocked(globals.Function, "Function"));
    for (const [name, ctor] of constructors) {
      const prototype = (ctor as unknown as { prototype: object }).prototype;
      replace(prototype, "constructor", blocked(ctor, `${name}.prototype.constructor`));
    }
    replace(globalThis, "setTimeout", stringTimer(globals.setTimeout, "setTimeout"));
    replace(globalThis, "setInterval", stringTimer(globals.setInterval, "setInterval"));
  } catch (thrown) {
    restoreAll(saved);
    throw thrown;
  }

  return {
    calls,
    restore: () => restoreAll(saved),
  };
}

/** Puts every saved descriptor back, newest first, and empties the list. */
function restoreAll(saved: Saved[]): void {
  for (const { target, key, descriptor } of saved.splice(0).reverse()) {
    Object.defineProperty(target, key, descriptor);
  }
}
