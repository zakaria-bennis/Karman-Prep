// The compute worker entry (AR-43, AR-44): wires the worker's message port to an Executor and
// nothing else. No exports, no import.meta and no top-level await, because Turbopack loads it as
// a classic worker (OI-29).

import { Executor } from "./executor";
import { isMainMessage } from "./protocol";

const scope = globalThis as unknown as {
  onmessage: ((e: MessageEvent<unknown>) => void) | null;
  postMessage(m: unknown, t: Transferable[]): void;
};

const executor = new Executor({ post: (m, t) => scope.postMessage(m, t) });

scope.onmessage = (e) => {
  if (isMainMessage(e.data)) executor.receive(e.data);
};
