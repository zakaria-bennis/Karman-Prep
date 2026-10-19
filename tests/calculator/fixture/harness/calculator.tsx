// Shell harness page, /harness/calculator.html?skin=&w=&h=&rows=&reducedMotion=1&announceReset=1:
// mounts the assembled calculator through the quiz host's mountQuizCalculator in #calc, inside a
// fixed #frame that stands in for the CalculatorWindow. The frame is w×h px (default the whole
// viewport), clamped to the viewport so phones hold a phone-sized calculator. skin sets
// html[data-theme] (default ivory); rows (URL-encoded JSON string[]) become rows "1"…"n" at every
// mount. The shell specs drive it through globalThis.__shell; the engine is on
// globalThis.__calculatorHarness.

import {
  mountQuizCalculator,
  type QuizCalculatorHandle,
} from "@/components/calculator/host/quiz-host";

interface ShellLog {
  mountedAt: number;
  escapes: { defaultPrevented: boolean }[];
  announcements: { text: string; t: number }[];
}

declare global {
  var __shell:
    | {
        handle: QuizCalculatorHandle;
        resizeFrame(width: number, height: number): void;
        // Destroys and mounts again with the same rows; keeps log; resets log.mountedAt.
        remount(o?: { announceReset?: boolean; reducedMotion?: boolean }): void;
        log: ShellLog;
      }
    | undefined;
}

const params = new URLSearchParams(location.search);
const rowsParam = params.get("rows");
const rows = rowsParam === null ? null : (JSON.parse(rowsParam) as string[]);
const width = params.get("w");
const height = params.get("h");
const reducedMotion = params.get("reducedMotion") === "1";

document.documentElement.dataset.theme = params.get("skin") || "ivory";

const frame = document.getElementById("frame")!;
const slot = document.getElementById("slot")!;
const calc = document.getElementById("calc")!;

/** Sizes the frame to width×height px, clamped to the viewport. */
function resizeFrame(w: number | null, h: number | null): void {
  frame.style.width = w === null ? "100vw" : `min(${w}px, 100vw)`;
  frame.style.height = h === null ? "100dvh" : `min(${h}px, 100dvh)`;
}
resizeFrame(width === null ? null : Number(width), height === null ? null : Number(height));

const log: ShellLog = { mountedAt: 0, escapes: [], announcements: [] };

// Stands in for the frame: the shell never stops an Escape, so every one bubbles
// here, and the frame closes only when no calculator layer took it.
frame.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  log.escapes.push({ defaultPrevented: event.defaultPrevented });
  if (!event.defaultPrevented) frame.dataset.closed = "true";
});

let statusObserver: MutationObserver | null = null;

/** Logs each non-empty text the shadow [role="status"] region takes, with performance.now(). */
function observeStatus(): void {
  statusObserver?.disconnect();
  const region = calc.shadowRoot?.querySelector('[role="status"]');
  if (!region) return;
  let last = region.textContent ?? "";
  statusObserver = new MutationObserver(() => {
    const text = region.textContent ?? "";
    if (text === last) return;
    last = text;
    if (text !== "") log.announcements.push({ text, t: performance.now() });
  });
  statusObserver.observe(region, { childList: true, characterData: true, subtree: true });
}

function mount(o: { announceReset: boolean; reducedMotion: boolean }): QuizCalculatorHandle {
  log.mountedAt = performance.now();
  const handle = mountQuizCalculator({
    element: calc,
    frame,
    chromeSlot: slot,
    reducedMotion: o.reducedMotion,
    announceReset: o.announceReset,
  });
  observeStatus();
  if (rows) {
    handle.calculator.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  }
  return handle;
}

const shell = {
  handle: mount({ announceReset: params.get("announceReset") === "1", reducedMotion }),
  resizeFrame: (w: number, h: number) => resizeFrame(w, h),
  remount(o: { announceReset?: boolean; reducedMotion?: boolean } = {}) {
    shell.handle.destroy();
    shell.handle = mount({
      announceReset: o.announceReset ?? false,
      reducedMotion: o.reducedMotion ?? reducedMotion,
    });
  },
  log,
};
globalThis.__shell = shell;
