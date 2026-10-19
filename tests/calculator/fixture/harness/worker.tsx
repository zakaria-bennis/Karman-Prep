// Worker harness page, /harness/worker.html: window.__workerHarness.start(scenario) builds
// one calculator engine for an AR-43, AR-49 or AR-50 scenario and sets its view to 800×600 at
// dpr 1. worker.spec.ts drives the engine through globalThis.__calculatorHarness and reads, through
// log(), every message the tapped backend delivered, with its performance.now() time.

import { exposeEngineForTests } from "@/components/calculator/ui/hooks/dev-hooks";
import { useSkin } from "@/components/calculator/ui/hooks/skin";
import { useEngine, useEngineSnapshot } from "@/components/calculator/ui/hooks/use-engine";
import { createEngine } from "@/lib/calculator/core/api/engine";
import { defaultViewport, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { createWorkerBackend, type ComputeBackend } from "@/lib/calculator/worker/backend";
import { createComputeWorker } from "@/lib/calculator/worker/create";
import { WORKER_MARKER, type WorkerToMain } from "@/lib/calculator/worker/protocol";
import { mountHarness } from "./harness-kit";

export type WorkerScenario =
  | "default"
  | "constructor-throws"
  | "error-before-ready"
  | "never-ready"
  | "hang-once";
declare global {
  var __workerHarness:
    | {
        start(s: WorkerScenario): void;
        log(): { type: string; generation: number | null; rowId: string | null; t: number }[];
        stop(): void;
      }
    | undefined;
}

type LogEntry = { type: string; generation: number | null; rowId: string | null; t: number };

const SIZE = { width: 800, height: 600 };
const VIEW: ViewSpec = { viewport: defaultViewport(SIZE), size: SIZE, dpr: 1 };

/** AR-50: a classic worker that throws before it could post ready. */
const ERROR_BEFORE_READY = 'throw new Error("boom");';
/** AR-50: a classic worker that never answers, so only the 3,000 ms ready timer decides. */
const NEVER_READY = "self.onmessage = () => {};";
/**
 * AR-49: answers hello with ready and each state or view with done, until a state holds row
 * "slow": then it posts begin for that row and never returns.
 */
const HANG_ONCE = `self.onmessage = (e) => {
  const m = e.data;
  if (m.type === "hello") {
    self.postMessage({ v: 1, type: "ready", worker: ${JSON.stringify(WORKER_MARKER)} });
  } else if (m.type === "state" && m.rows.some((r) => r.id === "slow")) {
    self.postMessage({ v: 1, type: "begin", generation: m.generation, rowId: "slow" });
    for (;;) {}
  } else if (m.type === "state" || m.type === "view") {
    self.postMessage({ v: 1, type: "done", generation: m.generation });
  }
};`;

let log: LogEntry[] = [];
let stopCurrent: (() => void) | null = null;

/** The default scenario's UI: the provided skin, the row count and the backend kind. */
function Probe() {
  const skin = useSkin();
  const { rows, backendKind } = useEngineSnapshot(useEngine());
  return (
    <p data-testid="probe">
      {skin} {rows.length} {backendKind}
    </p>
  );
}

/** A classic worker named karman-calculator running `source`; its object URL is revoked on stop. */
function blobWorker(source: string, urls: string[]): Worker {
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  urls.push(url);
  return new Worker(url, { name: "karman-calculator" });
}

/** Logs every message `backend` delivers, with performance.now(); `kind` reads through. */
function tap(backend: ComputeBackend): ComputeBackend {
  backend.onMessage((message: WorkerToMain) => {
    log.push({
      type: message.type,
      generation: "generation" in message ? message.generation : null,
      rowId: "rowId" in message ? message.rowId : null,
      t: performance.now(),
    });
  });
  return {
    get kind() {
      return backend.kind;
    },
    post: (message) => backend.post(message),
    onMessage: (listener) => backend.onMessage(listener),
    dispose: () => backend.dispose(),
  };
}

/** The default scenario: the React UI on a fresh host, with createEngine's default backend. */
function startDefault(): () => void {
  const host = document.createElement("div");
  document.getElementById("root")!.append(host);
  const { engine, destroy } = mountHarness({ root: host, css: [], render: () => <Probe /> });
  engine.setView(VIEW);
  return () => {
    destroy();
    host.remove();
  };
}

/** The other scenarios: no React UI, an engine on the tapped worker backend of `createWorker`. */
function startTapped(scenario: Exclude<WorkerScenario, "default">): () => void {
  const urls: string[] = [];
  const RealWorker = globalThis.Worker;
  let createWorker: () => Worker;
  switch (scenario) {
    case "constructor-throws":
      globalThis.Worker = class BlockedWorker {
        constructor() {
          throw new DOMException("blocked", "SecurityError");
        }
      } as unknown as typeof Worker;
      createWorker = createComputeWorker;
      break;
    case "error-before-ready":
      createWorker = () => blobWorker(ERROR_BEFORE_READY, urls);
      break;
    case "never-ready":
      createWorker = () => blobWorker(NEVER_READY, urls);
      break;
    case "hang-once": {
      let hung = false;
      createWorker = () => {
        if (hung) return createComputeWorker();
        hung = true;
        return blobWorker(HANG_ONCE, urls);
      };
      break;
    }
  }
  const engine = createEngine(undefined, { backend: tap(createWorkerBackend({ createWorker })) });
  const clearHook = exposeEngineForTests(engine);
  engine.setView(VIEW);
  return () => {
    clearHook();
    engine.destroy();
    globalThis.Worker = RealWorker;
    for (const url of urls) URL.revokeObjectURL(url);
  };
}

/** Ends the current scenario, if any: its engine is destroyed and its worker terminated. */
function stop(): void {
  const current = stopCurrent;
  stopCurrent = null;
  current?.();
}

window.__workerHarness = {
  start(s) {
    stop();
    log = [];
    stopCurrent = s === "default" ? startDefault() : startTapped(s);
  },
  log: () => log.slice(),
  stop,
};
