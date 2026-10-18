// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { classifyChoice, classifyStem } from "@/lib/calculator-transfer/classify";
import { splitMathText } from "@/components/learn/math-segments";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import MathText from "@/components/learn/MathText";
import {
  CalculatorChoiceAction,
  CalculatorSourceAction,
  CalculatorTableAction,
} from "./CalculatorSourceAction";
import { loadTransferClassifier } from "./transfer-classifier";
import { transferSelection } from "./transfer-selection";

// D4: the classifier and TransferControl load lazily, so every test awaits the first control
// (findBy…) or the loaded chunk before it reads the rendered controls synchronously.

const h = vi.hoisted(() => ({
  stub: false,
  bridge: null as unknown,
  onSelect: vi.fn(),
  onCross: vi.fn(),
  outer: vi.fn(),
}));
vi.mock("./CalculatorScope", async (original) => {
  const real = await original<typeof import("./CalculatorScope")>();
  return {
    ...real,
    useCalculator: () =>
      h.stub ? (h.bridge as ReturnType<typeof real.useCalculator>) : real.useCalculator(),
  };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/free-diagnostic",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
const v2Bridge = () => ({
  version: "v2",
  open: false,
  status: "idle",
  failure: null,
  questionKey: "attempt:q1",
  toggle: vi.fn(),
  prefetch: vi.fn(),
  transfer: vi.fn(
    async (_payload: TransferPayload, _trigger: TransferTrigger): Promise<TransferResult> => ({
      status: "added",
      message: "Added.",
      focusRowId: "1",
    })
  ),
});
const v1Bridge = () => ({ version: "v1", open: false, toggle: vi.fn(), paste: vi.fn() });
const stubbed = (bridge: unknown) => {
  h.stub = true;
  h.bridge = bridge;
  return bridge as ReturnType<typeof v2Bridge>;
};
let restore = () => {};
beforeEach(() => {
  restore = installDomStubs();
  h.stub = false;
  h.bridge = null;
  transferSelection.resetForTests();
  vi.clearAllMocks();
});
afterEach(() => restore());
const SYSTEM = "\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}";
const CONTROL = /^Transfer to Calculator: /;
const namesOf = () =>
  screen.getAllByRole("button", { name: CONTROL }).map((b) => b.getAttribute("aria-label"));
const controlsReady = () => screen.findAllByRole("button", { name: CONTROL });
const annotationBefore = (anchor: Element) =>
  anchor.previousElementSibling?.querySelector("annotation")?.textContent;

it("TR-45 one real button per item right after it or in its cluster; the math is never focusable; hidden stem controls are clipped and hidden choice controls sit at opacity 0, never leaving the tree (OI-18)", async () => {
  stubbed(v2Bridge());
  const { container } = render(
    <>
      <MathText calculator text={`Use $y=2x+3$, $x$ and $$${SYSTEM}$$`} />
      <div className="group relative">
        <button type="button">A</button>
        <div data-calculator="v2">
          <button type="button" aria-label="Cross out choice A" />
          <CalculatorChoiceAction slot="cluster" text="$2x$" letter="A" />
        </div>
      </div>
    </>
  );
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  const anchors = [...container.querySelectorAll<HTMLElement>("[data-transfer-control]")];
  expect(anchors.map((a) => a.dataset.placement)).toEqual(["inline", "block", "cluster"]);
  for (const a of anchors) {
    const buttons = a.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("type", "button");
    expect([
      buttons[0].getAttribute("aria-hidden"),
      buttons[0].hidden,
      buttons[0].style.display,
      buttons[0].style.visibility,
      buttons[0].tabIndex,
    ]).toEqual([null, false, "", "", 0]);
  }
  expect(annotationBefore(anchors[0])).toBe("y=2x+3");
  expect(anchors[1].previousElementSibling?.classList.contains("block")).toBe(true);
  expect(anchors[2].parentElement).toHaveAttribute("data-calculator", "v2");
  expect(anchors[2].previousElementSibling).toHaveAccessibleName("Cross out choice A");
  expect(container.querySelectorAll(".katex [tabindex], [tabindex].katex")).toHaveLength(0);
  expect(anchors[0]).toHaveAttribute("data-visible", "false");
  const css = readFileSync("src/components/calculator/TransferControl.module.css", "utf8");
  expect(css).toMatch(/\[data-visible="false"\][^{]*\{[^}]*clip-path:\s*inset\(50%\)/);
  expect(css).toMatch(/\[data-placement="cluster"\]\s*\{[^}]*opacity:\s*0\s*[;}]/);
  expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden/);
});

it("TR-45 across underline, italic and serialized-function runs each control follows the segment its item came from, and a run that shifts the math count renders no wrong control", async () => {
  stubbed(v2Bridge());
  await loadTransferClassifier(); // D4: later renders get the loaded chunk synchronously
  const runs = {
    text: "[[u]]Line $y=2x+3$[[/u]]\nf(x) = 2^x + 3\n<i>Region $y>2x+1$</i>",
    serializedFunctionLines: true,
  };
  const shifted = {
    text: "Use $a<i>b</i>$ then $y=2x+3$ and $y=x$",
    serializedFunctionLines: false,
  };
  for (const stem of [runs, shifted]) {
    const { container, unmount } = render(
      <MathText
        calculator
        text={stem.text}
        serializedFunctionLines={stem.serializedFunctionLines}
      />
    );
    const segments = splitMathText(stem.text, stem.serializedFunctionLines, true, true);
    const items = classifyStem(stem);
    const anchors = [...container.querySelectorAll<HTMLElement>("[data-transfer-control]")];
    for (const a of anchors) {
      const index = Number((a.dataset.sourceId ?? "").slice("stem:".length));
      const segment = segments[index];
      expect(items.has(index), stem.text).toBe(true);
      expect(segment.kind, stem.text).not.toBe("text");
      expect(annotationBefore(a), stem.text).toBe(segment.kind === "text" ? null : segment.latex);
    }
    if (stem === runs) {
      expect(anchors.map((a) => a.dataset.sourceId)).toEqual(
        [...items.keys()].map((k) => `stem:${k}`)
      );
      expect(anchors).toHaveLength(3);
      expect(
        [
          anchors[0].closest("u"),
          anchors[1].previousElementSibling?.classList.contains("source-function-math") || null,
          anchors[2].closest("i"),
        ].map(Boolean)
      ).toEqual([true, true, true]);
    }
    unmount();
  }
});

it("TR-50 names are Transfer to Calculator plus the table 8.1 description, unique within the question with ', occurrence n' for repeats", async () => {
  stubbed(v2Bridge());
  render(<MathText calculator text={`Lines $y=2x+3$ and $y=2x+3$ meet $$${SYSTEM}$$`} />);
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  expect(namesOf()).toEqual([
    "Transfer to Calculator: y = 2x + 3",
    "Transfer to Calculator: y = 2x + 3, occurrence 2",
    "Transfer to Calculator: system of 2 inequalities",
  ]);
});

it("TR-76, AR-11 the wrappers branch on bridge.version: v1 keeps PasteAction and cluster instances render nothing; v2 renders only Transfer controls and no table control before Phase 3", async () => {
  const stem = { text: "Line $y=2x+3$", serializedFunctionLines: false };
  const tree = (
    <>
      <CalculatorSourceAction latex="y=2x+3" segmentIndex={1} stem={stem} />
      <CalculatorChoiceAction text="$2x$" letter="B" />
      <div data-testid="cluster">
        <CalculatorChoiceAction text="$2x$" letter="B" slot="cluster" />
        <CalculatorTableAction rows={[["1", "2"]]} slot="cluster" />
      </div>
      <CalculatorTableAction
        rows={[
          ["1", "2"],
          ["2", "4"],
        ]}
        headers={["x", "y"]}
        itemId="table"
      />
    </>
  );
  stubbed(v1Bridge());
  const v1 = render(tree);
  expect(
    screen
      .getAllByRole("button", {
        name: /^Paste .+ into calculator|^Paste table into calculator as x₁, y₁$/,
      })
      .map((b) => b.getAttribute("aria-label"))
  ).toEqual([
    "Paste y=2x+3 into calculator",
    "Paste choice B into calculator",
    "Paste table into calculator as x₁, y₁",
  ]);
  expect(screen.getByTestId("cluster")).toBeEmptyDOMElement();
  expect(screen.queryAllByRole("button", { name: /^Transfer to Calculator/ })).toHaveLength(0);
  v1.unmount();
  stubbed(v2Bridge());
  render(tree);
  await waitFor(() => expect(namesOf()).toHaveLength(2));
  expect(screen.queryAllByText(/Export to Karman|Copy for Desmos/)).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "Export options" })).toBeNull();
  expect(namesOf()).toEqual([
    "Transfer to Calculator: y = 2x + 3",
    "Transfer to Calculator: choice B",
  ]);
});

it("AR-11 a choice with no stem prop classifies against the stem its question's MathText registered", async () => {
  const bridge = stubbed(v2Bridge());
  const text = "The function $f$ is defined by $f(x)=x^{2}$.";
  render(
    <>
      <MathText calculator text={text} />
      <div data-calculator="v2">
        <CalculatorChoiceAction slot="cluster" text="$f(x)+1$" letter="A" />
      </div>
    </>
  );
  fireEvent.click(await screen.findByRole("button", { name: "Transfer to Calculator: choice A" }));
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  const expected = classifyChoice(
    { letter: "A", text: "$f(x)+1$" },
    { text, serializedFunctionLines: false }
  );
  expect(expected).not.toBeNull();
  expect(bridge.transfer.mock.calls[0][0]).toEqual({
    ...expected?.payload,
    questionKey: "attempt:q1",
  });
});

it("AR-33 (D4) a v2 wrapper renders no control until the lazy classifier has loaded, then the control appears", async () => {
  vi.resetModules();
  stubbed(v2Bridge());
  const fresh = await import("./CalculatorSourceAction");
  const { container } = render(
    <div data-calculator="v2">
      <fresh.CalculatorChoiceAction slot="cluster" text="$5$" letter="A" />
    </div>
  );
  expect(container.querySelector("[data-transfer-control]")).toBeNull();
  expect(await controlsReady()).toHaveLength(1);
});
