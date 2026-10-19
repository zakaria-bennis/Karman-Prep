// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import type { QuizMountOptions } from "@/components/calculator/host/quiz-host";
import { installDomStubs } from "@/components/calculator/__fixtures__/dom-stubs";
import { FULL_SCREEN_QUERY } from "./breakpoints";
import type { CalculatorBridge } from "./CalculatorScope";

vi.mock("@/components/calculator/host/quiz-host", () => ({ mountQuizCalculator: vi.fn() }));

const REJECTED: TransferResult = {
  status: "rejected",
  message: "This can't be added to the calculator.",
  focusRowId: null,
};
function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}
const fakeHandle = (options?: QuizMountOptions) => ({
  calculator: { subscribe: vi.fn() },
  focusOnOpen: vi.fn(() => options?.frame.focus()),
  focusBoundary: vi.fn(),
  setReducedMotion: vi.fn(),
  reflow: vi.fn(),
  destroy: vi.fn(),
  applyTransfer: vi.fn(
    (p: TransferPayload, _trigger: TransferTrigger): TransferResult => ({
      status: "added",
      message: `Added to calculator: ${p.description}.`,
      focusRowId: "1",
    })
  ),
});
const rejecting = (options: QuizMountOptions) => {
  const hd = fakeHandle(options);
  hd.applyTransfer.mockReturnValue(REJECTED);
  return hd;
};
const payload = (n: number, questionKey = "attempt:q1"): TransferPayload => ({
  version: 1,
  questionKey,
  sourceId: `stem:${n}`,
  description: `y=${n}x`,
  format: "rows",
  dependencies: [],
  rows: [`y=${n}x`],
});
const media = (matching: string[]) =>
  ((q: string) => ({
    matches: matching.includes(q),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;

async function scope(
  o: {
    gate?: Promise<unknown>;
    mount?: (options: QuizMountOptions) => ReturnType<typeof fakeHandle>;
    fullScreen?: boolean;
    loadFails?: boolean;
    lazyCore?: boolean; // leave the bridge's lazy pipeline unloaded (D4)
  } = {}
) {
  vi.resetModules();
  const handles: ReturnType<typeof fakeHandle>[] = [];
  const mountQuizCalculator = vi.fn((options: QuizMountOptions) => {
    const hd = (o.mount ?? fakeHandle)(options);
    handles.push(hd);
    return hd;
  });
  vi.doMock("@/components/calculator/host/quiz-host", async () => {
    await o.gate;
    if (o.loadFails) throw new Error("chunk failed");
    return { mountQuizCalculator };
  });
  const S = await import("./CalculatorScope");
  // D4: a Transfer control renders only once the bridge's lazy pipeline has loaded with it.
  if (!o.lazyCore) await (await import("./use-transfer-bridge")).loadTransferCore();
  // the instances the reset scope uses
  const { calculatorWindowStore: store } = await import("./calculator-window-store");
  const { isCoreRejection } = await import("./transfer-report");
  store.resetForTests();
  window.matchMedia = media(o.fullScreen ? [FULL_SCREEN_QUERY] : []);
  const seen = { bridge: null as CalculatorBridge | null };
  function Probe() {
    seen.bridge = S.useCalculator();
    return null;
  }
  function Host({ questionKey }: { questionKey: string }) {
    const [open, setOpen] = useState(false);
    return (
      <S.CalculatorScope
        key={questionKey}
        enabled
        open={open}
        onOpenChange={setOpen}
        questionKey={questionKey}
      >
        <p>Question body</p>
        <button type="button">Stand-in control</button>
        <S.CalculatorTrigger />
        <Probe />
      </S.CalculatorScope>
    );
  }
  const view = render(<Host questionKey="attempt:q1" />);
  return {
    store,
    handles,
    mountQuizCalculator,
    isCore: isCoreRejection,
    bridge: () => must(seen.bridge, "bridge"),
    remount: (key: string) => view.rerender(<Host questionKey={key} />),
    unmount: view.unmount,
    status: () => must(document.querySelector<HTMLElement>("[data-transfer-status]"), "region"),
  };
}

function send(s: Awaited<ReturnType<typeof scope>>, p: TransferPayload, trigger: TransferTrigger) {
  const out: { result?: TransferResult } = {};
  act(() => {
    void s
      .bridge()
      .transfer(p, trigger)
      .then((r) => (out.result = r));
  });
  return out;
}

let restore = () => {};
beforeEach(() => {
  restore = installDomStubs();
  vi.clearAllMocks();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

it("AR-10 the bridge exposes status, transfer and prefetch, hands each payload to the calculator with its trigger, and the host never calls subscribe", async () => {
  const s = await scope();
  expect(s.bridge()).toMatchObject({
    open: false,
    status: "idle",
    failure: null,
    questionKey: "attempt:q1",
  });
  expect([typeof s.bridge().transfer, typeof s.bridge().prefetch]).toEqual([
    "function",
    "function",
  ]);
  for (const [n, trigger] of [
    [1, "mouse"],
    [2, "keyboard"],
    [3, "touch"],
  ] as const) {
    const out = send(s, payload(n), trigger);
    await waitFor(() => expect(out.result?.status).toBe("added"));
  }
  expect(s.handles[0].applyTransfer.mock.calls).toEqual([
    [payload(1), "mouse"],
    [payload(2), "keyboard"],
    [payload(3), "touch"],
  ]);
  expect(s.handles[0].calculator.subscribe).not.toHaveBeenCalled();
  for (const file of [
    "src/components/calculator/host/quiz-host.ts",
    "src/components/calculator/CalculatorScope.tsx",
    "src/components/calculator/use-transfer-bridge.ts",
    "src/components/calculator/transfer-bridge-core.ts",
  ])
    expect(readFileSync(file, "utf8"), file).not.toMatch(/\.subscribe\(/);
});

it("AR-33, AR-10 a transfer made before the bridge's lazy pipeline has loaded waits for it, then opens the calculator and applies", async () => {
  const s = await scope({ lazyCore: true });
  const out = send(s, payload(1), "touch");
  await waitFor(() => expect(out.result?.status).toBe("added"));
  expect(s.handles[0].applyTransfer.mock.calls).toEqual([[payload(1), "touch"]]);
  expect(s.status()).toHaveTextContent("Added to calculator: y=1x.");
});

it("AR-17 transfers made while loading wait in order with their triggers, the 21st is refused and a question change discards the queue silently", async () => {
  let release = () => {};
  const s = await scope({ gate: new Promise<void>((r) => (release = r)) });
  const outs = Array.from({ length: 21 }, (_, i) => send(s, payload(i), i % 2 ? "touch" : "mouse"));
  await waitFor(() =>
    expect(outs[20].result).toEqual({
      status: "queue-full",
      message: "Too many transfers are waiting. Try again when the calculator has opened.",
      focusRowId: null,
    })
  );
  expect(s.status()).toHaveTextContent(
    "Too many transfers are waiting. Try again when the calculator has opened."
  );
  await act(async () => release());
  await waitFor(() => expect(outs[19].result?.status).toBe("added"));
  expect(s.handles[0].applyTransfer.mock.calls.map(([p, t]) => [p.sourceId, t])).toEqual(
    Array.from({ length: 20 }, (_, i) => [`stem:${i}`, i % 2 ? "touch" : "mouse"])
  );
  s.unmount();
  let hold = () => {};
  const q = await scope({ gate: new Promise<void>((r) => (hold = r)) });
  const held = send(q, payload(1), "mouse");
  q.remount("attempt:q2");
  await act(async () => hold());
  await waitFor(() =>
    expect(held.result).toEqual({ status: "unavailable", message: "", focusRowId: null })
  );
  await waitFor(() => expect(q.handles).toHaveLength(1));
  expect(q.handles[0].applyTransfer).not.toHaveBeenCalled();
  expect(q.status().textContent).toBe("");
});

it("TR-67 one polite status region beside the workspace and the window announces each result in plain text, outside inert and aria-hidden content in full screen", async () => {
  const s = await scope({ fullScreen: true });
  const said: string[] = [];
  new MutationObserver(() => {
    const t = s.status().textContent ?? "";
    if (t) said.push(t);
  }).observe(s.status(), { childList: true, characterData: true, subtree: true });
  const expected = [
    "Added to calculator: y=1x.",
    "Already in the calculator, row 1.",
    "Already in the calculator, row 1.",
    "This can't be added to the calculator.",
  ];
  send(s, payload(1), "mouse");
  await waitFor(() => expect(said).toEqual(expected.slice(0, 1)));
  const present: TransferResult = {
    status: "already-present",
    message: "Already in the calculator, row 1.",
    focusRowId: "1",
  };
  s.handles[0].applyTransfer
    .mockReturnValueOnce(present)
    .mockReturnValueOnce(present)
    .mockReturnValueOnce({ ...REJECTED });
  for (const [i, n] of [1, 1, 2].entries()) {
    send(s, payload(n), "mouse");
    await waitFor(() => expect(said).toEqual(expected.slice(0, i + 2)));
  }
  const region = s.status();
  const workspace = must(document.querySelector("[data-calculator-workspace]"), "workspace");
  expect(document.querySelectorAll("[data-transfer-status]")).toHaveLength(1);
  expect([region.getAttribute("role"), region.getAttribute("aria-live")]).toEqual([
    "status",
    "polite",
  ]);
  expect(region.parentElement).toBe(workspace.parentElement);
  expect(workspace).toHaveAttribute("aria-hidden", "true");
  expect(
    region.closest(
      "[inert], [aria-hidden='true'], [data-calculator-root], [data-calculator-window], [data-calculator-host]"
    )
  ).toBeNull();
});

it("TR-70 the bridge drops a payload whose question key is not the current question's, says so and never marks it as a core-check rejection", async () => {
  const s = await scope({ mount: rejecting });
  const out = send(s, payload(1, "attempt:q0"), "mouse");
  await waitFor(() => expect(out.result).toEqual(REJECTED));
  expect(s.isCore(must(out.result))).toBe(false);
  expect(s.mountQuizCalculator).not.toHaveBeenCalled();
  expect(document.querySelector("[data-calculator-window]")).toBeNull();
  expect(s.status()).toHaveTextContent("This can't be added to the calculator.");
  const core = send(s, payload(2), "mouse");
  await waitFor(() => expect(core.result?.status).toBe("rejected"));
  expect(s.isCore(must(core.result))).toBe(true);
});

it("TR-69 after a mount failure the held payload waits for Retry and applies once; after a load failure it is discarded and announced", async () => {
  let calls = 0;
  const s = await scope({
    mount: (options) => {
      if (calls++ === 0) throw new Error("mount");
      return fakeHandle(options);
    },
  });
  const out = send(s, payload(1), "keyboard");
  await waitFor(() =>
    expect(s.status()).toHaveTextContent(
      "Calculator unavailable. Use Retry in the calculator panel."
    )
  );
  expect(out.result).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(out.result?.status).toBe("added"));
  expect(s.handles.flatMap((x) => x.applyTransfer.mock.calls)).toEqual([[payload(1), "keyboard"]]);
  s.unmount();
  const f = await scope({ loadFails: true });
  const lost = send(f, payload(2), "mouse");
  await waitFor(() =>
    expect(lost.result).toEqual({
      status: "unavailable",
      message: "Calculator unavailable. Reload the page to use it.",
      focusRowId: null,
    })
  );
  expect(f.status()).toHaveTextContent("Calculator unavailable. Reload the page to use it.");
  const again = send(f, payload(3), "mouse");
  await waitFor(() => expect(again.result?.status).toBe("unavailable"));
});

it("AR-21, TR-64 a mouse or touch transfer docks a closed, floating or maximized window when the viewport is wide, opens a load-failure panel docked, leaves the stored mode alone in full screen and never writes it for a refused transfer", async () => {
  const s = await scope();
  const first = send(s, payload(1), "mouse");
  await waitFor(() => expect(first.result?.status).toBe("added"));
  expect(s.store.get().mode).toBe("docked");
  expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "docked");
  for (const [n, mode, trigger] of [
    [2, "floating", "touch"],
    [3, "maximized", "mouse"],
  ] as const) {
    act(() => s.store.set({ mode }));
    const o = send(s, payload(n), trigger);
    await waitFor(() => expect(o.result).toBeDefined());
    expect(s.store.get().mode, trigger).toBe("docked");
  }
  s.unmount();
  const t = await scope();
  const byTouch = send(t, payload(1), "touch");
  await waitFor(() => expect(byTouch.result?.status).toBe("added"));
  expect(t.store.get().mode).toBe("docked");
  expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "docked");
  t.unmount();
  const f = await scope({ fullScreen: true });
  const o = send(f, payload(4), "mouse");
  await waitFor(() => expect(o.result?.status).toBe("added"));
  expect(f.store.get().mode).toBeNull();
  expect(document.querySelector("[data-calculator-window]")).toHaveAttribute(
    "data-mode",
    "fullscreen"
  );
  f.unmount();
  const k = await scope();
  const stale = send(k, payload(1, "attempt:q0"), "mouse");
  await waitFor(() => expect(stale.result?.status).toBe("rejected"));
  expect(k.store.get().mode).toBeNull();
  k.unmount();
  let release = () => {};
  const q = await scope({ gate: new Promise<void>((r) => (release = r)) });
  for (let n = 0; n < 20; n++) send(q, payload(n), "mouse");
  act(() => q.store.set({ mode: "floating" }));
  const full = send(q, payload(20), "mouse");
  await waitFor(() => expect(full.result?.status).toBe("queue-full"));
  expect(q.store.get().mode).toBe("floating");
  await act(async () => release());
  q.unmount();
  const l = await scope({ loadFails: true });
  const lost = send(l, payload(1), "mouse");
  await waitFor(() => expect(lost.result?.status).toBe("unavailable"));
  expect(l.store.get().mode).toBe("docked");
  expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "docked");
  expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
});

it("TR-66 a transfer held while a toolbar-opened window is still loading places the focus, not the opener; once loaded, the opener's focus stays", async () => {
  let release = () => {};
  const s = await scope({ gate: new Promise<void>((r) => (release = r)) });
  fireEvent.click(screen.getByRole("button", { name: "Toggle Karman calculator" }));
  const out = send(s, payload(1), "mouse");
  await act(async () => release());
  await waitFor(() => expect(out.result?.status).toBe("added"));
  expect(s.handles[0].applyTransfer.mock.calls).toEqual([[payload(1), "mouse"]]);
  expect(s.handles[0].focusOnOpen).not.toHaveBeenCalled();
  s.unmount();
  const t = await scope();
  fireEvent.click(screen.getByRole("button", { name: "Toggle Karman calculator" }));
  // a synthetic click has no pointer detail, so the opener's trigger reads as keyboard
  await waitFor(() => expect(t.handles[0].focusOnOpen.mock.calls).toEqual([["keyboard"]]));
  const later = send(t, payload(2), "touch");
  await waitFor(() => expect(later.result?.status).toBe("added"));
  expect(t.handles[0].focusOnOpen).toHaveBeenCalledTimes(1);
});

it("TR-66, AR-55 a window a transfer opened takes its focus from the transfer: the row's own focus, else focusOnOpen when every result was rejected, else the failure panel's button, never the inert workspace", async () => {
  const a = await scope();
  const added = send(a, payload(1), "mouse");
  await waitFor(() => expect(added.result?.status).toBe("added"));
  expect(a.handles[0].focusOnOpen).not.toHaveBeenCalled();
  a.unmount();
  const s = await scope({ fullScreen: true, mount: rejecting });
  screen.getByRole("button", { name: "Stand-in control" }).focus();
  const out = send(s, payload(1), "touch");
  await waitFor(() => expect(out.result?.status).toBe("rejected"));
  await waitFor(() =>
    expect(document.activeElement?.closest("[data-calculator-window]")).not.toBeNull()
  );
  expect(s.handles[0].focusOnOpen.mock.calls).toEqual([["touch"]]);
  s.unmount();
  const f = await scope({ fullScreen: true, loadFails: true });
  screen.getByRole("button", { name: "Stand-in control" }).focus();
  const lost = send(f, payload(1), "mouse");
  await waitFor(() => expect(lost.result?.status).toBe("unavailable"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Reload page" })).toHaveFocus());
});
