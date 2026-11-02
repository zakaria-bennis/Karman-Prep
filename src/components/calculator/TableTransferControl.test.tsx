// @vitest-environment jsdom
// The small table button of every Math table (c-transfer TR-91 to TR-97, founder 2026-11-01).
import { readFileSync } from "node:fs";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { installDomStubs } from "@/components/calculator/__fixtures__/dom-stubs";
import FigureFrame from "@/components/learn/FigureFrame";
import QuestionTable from "@/components/learn/QuestionTable";
import { loadFigureEngine } from "@/components/learn/figures/engine-loader";
import { FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";
import { TABLE_SENT_MS, TABLE_TOOLTIP } from "./TableTransferControl";
import { loadTransferClassifier } from "./transfer-classifier";
import { transferSelection } from "./transfer-selection";

const h = vi.hoisted(() => ({ bridge: null as unknown }));
// bridge-context holds useCalculator; CalculatorScope re-exports it (AR-33).
vi.mock("./bridge-context", async (original) => {
  const real = await original<typeof import("./bridge-context")>();
  return { ...real, useCalculator: () => h.bridge as ReturnType<typeof real.useCalculator> };
});

await loadFigureEngine();
await loadTransferClassifier();

const bridgeStub = (status: TransferResult["status"] = "added") => ({
  open: false,
  status: "idle",
  failure: null,
  questionKey: "attempt:q1",
  toggle: vi.fn(),
  prefetch: vi.fn(),
  transfer: vi.fn(
    async (_payload: TransferPayload, _trigger: TransferTrigger): Promise<TransferResult> =>
      status === "added"
        ? { status, message: "Added table to calculator.", focusRowId: "1" }
        : ({ status, message: "No.", focusRowId: null } as TransferResult)
  ),
});
const stubbed = (bridge: ReturnType<typeof bridgeStub> | null) => {
  h.bridge = bridge;
  return bridge as ReturnType<typeof bridgeStub>;
};

const table = (title: string, rows: string[][]): FigureSpec => ({
  version: FIGURE_SPEC_VERSION,
  labels: [],
  marks: [],
  type: "table",
  title,
  parts: [{ kind: "table", id: "t1", header: ["x", "y"], rows }],
});
const FIRST = table("Table 1", [
  ["1", "3"],
  ["2", "5"],
]);
const SECOND = table("Table 2", [
  ["0", "4"],
  ["3", "10"],
  ["6", "16"],
]);
const tableButtons = () =>
  [...document.querySelectorAll<HTMLElement>('[data-transfer-control][data-kind="table"]')].map(
    (a) => a.querySelector("button")!
  );

let restore = () => {};
beforeEach(() => {
  restore = installDomStubs();
  h.bridge = null;
  transferSelection.resetForTests();
  vi.clearAllMocks();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

it("TR-91, TR-92 every table of a two-table Math question gets its own button with a distinct name, and each transfers its own table", async () => {
  const bridge = stubbed(bridgeStub());
  render(<FigureFrame spec={[FIRST, SECOND]} calculator alt="Two tables" />);
  await waitFor(() => expect(tableButtons()).toHaveLength(2));
  const [a, b] = tableButtons();
  expect([a, b].map((x) => x.getAttribute("aria-label"))).toEqual([
    "Copy table to calculator: Table 1",
    "Copy table to calculator: Table 2",
  ]);
  // Icon-only: no text on the button, and each sits in its own table's frame.
  for (const x of [a, b]) {
    expect(x.textContent).toBe("");
    expect(x.closest("figure")?.querySelectorAll("table")).toHaveLength(1);
    expect(x.parentElement).toHaveAttribute("data-placement", "corner");
  }
  expect(a.closest("figure")).not.toBe(b.closest("figure"));
  fireEvent.click(b);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  expect(bridge.transfer.mock.calls[0][0]).toMatchObject({
    sourceId: "table:2",
    format: "table",
    questionKey: "attempt:q1",
    table: {
      columns: [
        ["0", "3", "6"],
        ["4", "10", "16"],
      ],
    },
  });
  expect(bridge.transfer.mock.calls[0][1]).toBe("keyboard"); // a click with no pointerdown
  fireEvent.pointerDown(a, { pointerType: "mouse" });
  fireEvent.click(a, { detail: 1 });
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(2));
  expect(bridge.transfer.mock.calls[1][0]).toMatchObject({
    sourceId: "table",
    table: {
      columns: [
        ["1", "2"],
        ["3", "5"],
      ],
    },
  });
  expect(bridge.transfer.mock.calls[1][1]).toBe("mouse");
});

it("TR-92 tables with no titles are told apart as table 1 and table 2", async () => {
  stubbed(bridgeStub());
  const untitled = (s: FigureSpec): FigureSpec => ({ ...s, title: undefined });
  render(<FigureFrame spec={[untitled(FIRST), untitled(SECOND)]} calculator alt="Two tables" />);
  await waitFor(() => expect(tableButtons()).toHaveLength(2));
  expect(tableButtons().map((x) => x.getAttribute("aria-label"))).toEqual([
    "Copy table to calculator: table 1",
    "Copy table to calculator: table 2",
  ]);
});

it("TR-91 Reading and Writing tables, and pages with no calculator, get no button and keep no room", async () => {
  stubbed(bridgeStub());
  const data = { header_row: ["x", "y"], rows: [["1", "2"]] };
  const rw = render(<QuestionTable data={data} calculator={false} />);
  await waitFor(() => expect(rw.container.querySelector("table")).not.toBeNull());
  expect(rw.container.querySelector("[data-transfer-control]")).toBeNull();
  expect(rw.container.querySelector(".pr-10")).toBeNull();
  rw.unmount();
  stubbed(null);
  const none = render(<QuestionTable data={data} calculator />);
  await waitFor(() => expect(none.container.querySelector("table")).not.toBeNull());
  expect(none.container.querySelector("[data-transfer-control]")).toBeNull();
  expect(none.container.querySelector(".pr-10")).toBeNull();
});

it("TR-93 a Math table keeps 40 px of room in its top-right corner for the button", async () => {
  stubbed(bridgeStub());
  const { container } = render(
    <QuestionTable data={{ header_row: ["x", "y"], rows: [["1", "2"]] }} calculator />
  );
  await waitFor(() => expect(tableButtons()).toHaveLength(1));
  const heads = [...container.querySelectorAll("thead th")];
  expect(heads.map((th) => th.classList.contains("pr-10"))).toEqual([false, true]);
  expect(container.querySelector("figure")?.classList.contains("relative")).toBe(true);
});

it("TR-94 after a transfer the glyph shows the arrow for about 2 s and then the table again; a rejected transfer never does", async () => {
  stubbed(bridgeStub());
  render(<QuestionTable data={{ header_row: ["x", "y"], rows: [["1", "2"]] }} calculator />);
  await waitFor(() => expect(tableButtons()).toHaveLength(1));
  const [button] = tableButtons();
  const anchor = button.parentElement!;
  expect(anchor).toHaveAttribute("data-sent", "false");
  expect(button.querySelector('[data-transfer-morph="table"]')).not.toBeNull();
  expect(button.querySelector('[data-transfer-morph="arrow"]')).not.toBeNull();
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(button);
  });
  expect(anchor).toHaveAttribute("data-sent", "true");
  expect(TABLE_SENT_MS).toBeGreaterThanOrEqual(1500);
  expect(TABLE_SENT_MS).toBeLessThanOrEqual(2000);
  act(() => vi.advanceTimersByTime(TABLE_SENT_MS - 1));
  expect(anchor).toHaveAttribute("data-sent", "true");
  act(() => vi.advanceTimersByTime(1));
  expect(anchor).toHaveAttribute("data-sent", "false");
  vi.useRealTimers();
  stubbed(bridgeStub("unavailable"));
  render(<QuestionTable data={{ header_row: ["t", "h"], rows: [["0", "9"]] }} calculator />);
  await waitFor(() => expect(tableButtons()).toHaveLength(2));
  const other = tableButtons()[1];
  await act(async () => {
    fireEvent.click(other);
  });
  expect(other.parentElement).toHaveAttribute("data-sent", "false");
});

it("TR-92, TR-51 the tooltip reads Copy table to calculator at once on keyboard focus and after 300 ms of hover, and the name starts with it", async () => {
  stubbed(bridgeStub());
  render(<QuestionTable data={{ header_row: ["x", "y"], rows: [["1", "2"]] }} calculator />);
  await waitFor(() => expect(tableButtons()).toHaveLength(1));
  const [button] = tableButtons();
  const tip = button.parentElement!.querySelector<HTMLElement>("[data-transfer-tooltip]")!;
  expect(tip.textContent).toBe(TABLE_TOOLTIP);
  expect(button.getAttribute("aria-label")!.startsWith(TABLE_TOOLTIP)).toBe(true);
  expect(tip.hidden).toBe(true);
  act(() => button.focus());
  expect(tip.hidden).toBe(false);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(tip.hidden).toBe(true);
  act(() => button.blur());
  vi.useFakeTimers();
  fireEvent.pointerEnter(button, { pointerType: "mouse", buttons: 0 });
  act(() => vi.advanceTimersByTime(299));
  expect(tip.hidden).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(tip.hidden).toBe(false);
  fireEvent.pointerLeave(button.parentElement!, { pointerType: "mouse" });
  expect(tip.hidden).toBe(true);
});

it("TR-41 the button's pointer, key and click events never reach a surrounding answer handler", async () => {
  const bridge = stubbed(bridgeStub());
  const outer = vi.fn();
  render(
    <div onClick={outer} onPointerDown={outer} onKeyDown={outer}>
      <QuestionTable data={{ header_row: ["x", "y"], rows: [["1", "2"]] }} calculator />
    </div>
  );
  await waitFor(() => expect(tableButtons()).toHaveLength(1));
  const [button] = tableButtons();
  fireEvent.pointerDown(button, { pointerType: "touch" });
  fireEvent.click(button, { detail: 1 });
  fireEvent.keyDown(button, { key: "Enter" });
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  expect(bridge.transfer.mock.calls[0][1]).toBe("touch"); // a tap transfers at once (TR-95)
  expect(outer).not.toHaveBeenCalled();
});

it("TR-95, TR-96 the sheet gives the corner button a 44 px touch target, a visible focus ring, and no morph motion with reduced motion", () => {
  const css = readFileSync("src/components/calculator/transfer-control.css", "utf8");
  expect(css).toMatch(
    /@media \(any-pointer: coarse\)\s*\{\s*\[data-transfer-control\]\[data-kind="table"\]\[data-placement="corner"\] > button::before\s*\{[^}]*width: 44px;[^}]*height: 44px;/
  );
  expect(css).toMatch(/\[data-transfer-control\] > button:focus-visible\s*\{[^}]*outline: 2px/);
  expect(css).toMatch(
    /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-transfer-control\]\[data-kind="table"\] \[data-transfer-morph\]\s*\{\s*transition: none;/
  );
});
