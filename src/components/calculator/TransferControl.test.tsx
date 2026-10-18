// @vitest-environment jsdom
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import type { TransferItem } from "@/lib/calculator-transfer/classify";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import { CALCULATOR_V2_CSS } from "@/components/calculator-v2/styles/generated";
import { CURVE_VARS, ROLE_VARS, hostThemeCss } from "@/lib/calculator-v2/theme/roles";
import { FULL_SCREEN_QUERY } from "./breakpoints";
import { TRANSFER_TOOLTIP, TransferControl } from "./TransferControl";
import { transferSelection } from "./transfer-selection";

const h = vi.hoisted(() => ({ stub: false, bridge: null as unknown }));
vi.mock("./CalculatorScope", async (original) => {
  const real = await original<typeof import("./CalculatorScope")>();
  return {
    ...real,
    useCalculator: () =>
      h.stub ? (h.bridge as ReturnType<typeof real.useCalculator>) : real.useCalculator(),
  };
});

function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}
const ITEM: TransferItem = {
  sourceId: "stem:1",
  kind: "equation",
  ruleId: "TR-11",
  description: "y=2x+3",
  payload: {
    version: 1,
    sourceId: "stem:1",
    description: "y=2x+3",
    format: "rows",
    dependencies: [],
    rows: ["y=2x+3"],
  },
};
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
      message: "Added to calculator: y=2x+3.",
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
const lastTrigger = (bridge: ReturnType<typeof v2Bridge>) => must(bridge.transfer.mock.lastCall)[1];
const media = (matching: string[]) =>
  ((q: string) => ({
    matches: matching.includes(q),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
function Control({ placement = "inline" }: { placement?: "inline" | "block" | "cluster" }) {
  return (
    <p>
      <span data-testid="math">y=2x+3</span>
      <TransferControl
        item={ITEM}
        accessibleName="Transfer to Calculator: y=2x+3"
        placement={placement}
      />
    </p>
  );
}
const anchorEl = () =>
  must(document.querySelector<HTMLElement>("[data-transfer-control]"), "anchor");
const tap = (el: Element, pointerType: string) => {
  fireEvent.pointerDown(el, { pointerType, clientX: 10, clientY: 10, isPrimary: true });
  fireEvent.pointerUp(el, { pointerType, clientX: 12, clientY: 10, isPrimary: true });
};

let restore = () => {};
beforeEach(() => {
  restore = installDomStubs();
  h.stub = false;
  h.bridge = null;
  transferSelection.resetForTests();
  vi.clearAllMocks();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

it("TR-4 the control renders only when useCalculator() returns a v2 bridge (OI-21)", () => {
  for (const bridge of [null, v1Bridge()]) {
    stubbed(bridge);
    const v = render(<Control />);
    expect(v.container.querySelector("[data-transfer-control]")).toBeNull();
    v.unmount();
  }
  stubbed(v2Bridge());
  render(<Control />);
  expect(
    screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" })
  ).toBeInTheDocument();
});

it("AR-12 the v2 control is icon-only with a Transfer to Calculator tooltip after 300 ms of hover or at once on keyboard focus, and a name that starts with it", () => {
  const bridge = stubbed(v2Bridge());
  render(<Control />);
  vi.useFakeTimers();
  const button = screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" });
  const tip = must(document.querySelector("[data-transfer-tooltip]"), "tooltip");
  expect(TRANSFER_TOOLTIP).toBe("Transfer to Calculator");
  expect(button.textContent).toBe("");
  expect([
    button.querySelectorAll("svg.lucide-calculator").length,
    button.querySelectorAll("svg.lucide-arrow-up-right").length,
  ]).toEqual([1, 1]);
  expect(tip).toHaveTextContent("Transfer to Calculator");
  expect(tip).toHaveAttribute("hidden");
  expect(tip).toHaveAttribute("aria-hidden", "true");
  fireEvent.pointerEnter(button, { pointerType: "mouse" });
  expect(bridge.prefetch).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(299));
  expect(tip).toHaveAttribute("hidden");
  act(() => vi.advanceTimersByTime(1));
  expect(tip).not.toHaveAttribute("hidden");
  fireEvent.pointerLeave(button, { pointerType: "mouse" });
  expect(tip).toHaveAttribute("hidden");
  fireEvent.focus(button);
  expect(tip).not.toHaveAttribute("hidden");
  expect(bridge.prefetch).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/Export to Karman|Copy for Desmos/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Export options" })).toBeNull();
});

it("TR-59 a hidden control stays in the accessibility tree, and a click with no pointerdown transfers at once with trigger keyboard and no selection step", async () => {
  const bridge = stubbed(v2Bridge());
  render(<Control />);
  expect(anchorEl()).toHaveAttribute("data-visible", "false");
  const button = screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" });
  expect(button).not.toHaveAttribute("aria-hidden");
  expect(anchorEl().closest("[aria-hidden]")).toBeNull();
  expect(button.tabIndex).toBe(0);
  fireEvent.click(button);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  expect(bridge.transfer).toHaveBeenCalledWith(
    { ...ITEM.payload, questionKey: "attempt:q1" },
    "keyboard"
  );
  // no tap selection (the item's outline now shows only because TR-68 focuses the control)
  expect(transferSelection.get()).toBeNull();
  expect(anchorEl()).toHaveAttribute("data-reveal", "fine");
});

it("AR-10 the control passes touch for a touch or pen tap, mouse for a mouse click or a click from a hovering pen, and keyboard for a click with no pointerdown", async () => {
  const bridge = stubbed(v2Bridge());
  render(<Control />);
  const button = screen.getByRole("button");
  const runs = [
    ["touch", false, "touch"],
    ["pen", false, "touch"],
    ["pen", true, "mouse"],
    ["mouse", false, "mouse"],
    [null, false, "keyboard"],
  ] as const;
  for (const [i, [pointerType, hovering, trigger]] of runs.entries()) {
    if (hovering) fireEvent.pointerEnter(anchorEl(), { pointerType: "pen", buttons: 0 });
    if (pointerType) fireEvent.pointerDown(button, { pointerType, buttons: 1 });
    fireEvent.click(button);
    if (hovering) fireEvent.pointerLeave(anchorEl(), { pointerType: "pen", buttons: 0 });
    await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(i + 1));
    expect(lastTrigger(bridge), `${pointerType} hovering=${hovering}`).toBe(trigger);
  }
});

it("TR-59, AR-10 a pointer contact that never becomes a click leaves no record: after a pointercancel, a pressed pointer leaving the button, a key or a blur, the next click with no pointerdown is keyboard, while a touch tap whose pointerleave fires before its click stays touch", async () => {
  const bridge = stubbed(v2Bridge());
  render(<Control />);
  const button = screen.getByRole("button");
  const aborted: [string, () => void][] = [
    [
      "pointercancel",
      () => {
        fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 });
        fireEvent.pointerCancel(button, { pointerType: "touch", buttons: 0 });
      },
    ],
    [
      "pressed pointerleave",
      () => {
        fireEvent.pointerDown(button, { pointerType: "mouse", buttons: 1 });
        fireEvent.pointerLeave(button, { pointerType: "mouse", buttons: 1 });
      },
    ],
    [
      "keydown",
      () => {
        fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 });
        fireEvent.keyDown(button, { key: "Enter" });
      },
    ],
    [
      "blur",
      () => {
        fireEvent.pointerDown(button, { pointerType: "mouse", buttons: 1 });
        fireEvent.blur(button);
      },
    ],
  ];
  for (const [i, [name, abort]] of aborted.entries()) {
    abort();
    fireEvent.click(button);
    await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(i + 1));
    expect(lastTrigger(bridge), name).toBe("keyboard");
  }
  fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 });
  fireEvent.pointerUp(button, { pointerType: "touch", buttons: 0 });
  fireEvent.pointerLeave(button, { pointerType: "touch", buttons: 0 });
  fireEvent.click(button);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(5));
  expect(lastTrigger(bridge), "touch tap").toBe("touch");
});

it("TR-54 the triggering pointer type sets the mode whatever the device class or width: mouse and hovering pen reveal, touch and pen taps select", () => {
  const bridge = stubbed(v2Bridge());
  window.matchMedia = media([
    "(any-pointer: coarse)",
    "(max-width: 767px), (max-height: 500px)",
    FULL_SCREEN_QUERY,
  ]);
  render(<Control />);
  const item = screen.getByTestId("math");
  const anchor = anchorEl();
  expect(item).toHaveAttribute("data-transfer-item");
  fireEvent.pointerEnter(item, { pointerType: "touch" });
  expect(anchor.dataset.visible).toBe("false");
  fireEvent.pointerEnter(item, { pointerType: "mouse" });
  expect([anchor.dataset.visible, anchor.dataset.reveal]).toEqual(["true", "fine"]);
  fireEvent.pointerLeave(item, { pointerType: "mouse" });
  expect(anchor.dataset.visible).toBe("false");
  fireEvent.pointerEnter(item, { pointerType: "pen", buttons: 0 });
  expect(anchor.dataset.visible).toBe("true");
  fireEvent.pointerLeave(item, { pointerType: "pen" });
  act(() => tap(item, "touch"));
  expect([anchor.dataset.visible, anchor.dataset.reveal]).toEqual(["true", "coarse"]);
  expect(item).toHaveAttribute("data-transfer-selected", "true");
  expect(bridge.prefetch).toHaveBeenCalled();
  act(() => tap(item, "touch"));
  expect(item).not.toHaveAttribute("data-transfer-selected");
  window.matchMedia = media([]);
  act(() => tap(item, "pen"));
  expect(item).toHaveAttribute("data-transfer-selected", "true");
  act(() => tap(item, "mouse"));
  expect(item).toHaveAttribute("data-transfer-selected", "true");
});

it("TH-2 the control, tooltip and outline take colours only from --kcc-*, the injected shadow sheet holds no literal colour outside the vendored MathQuill section, and every rule of the control's global sheet is keyed on a Transfer or v2 attribute", () => {
  const literal = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/;
  const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const file of ["transfer-control.css"]) {
    const css = strip(readFileSync(`src/components/calculator/${file}`, "utf8"));
    expect(css, file).not.toMatch(literal);
    // (?!-) so the property white-space is not read as the colour white
    expect(css, file).not.toMatch(/color-mix\(|\b(white|black)\b(?!-)/);
    expect(
      [...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]).filter((v) => !v.startsWith("--kcc-")),
      file
    ).toEqual([]);
  }
  // AR-33: no CSS Module (Turbopack merged it into an eager CSS chunk); the one global sheet
  // styles only the control's own DOM-contract attributes, the items and clusters it marks, and
  // the docked question layout around them.
  expect(existsSync("src/components/calculator/TransferControl.module.css")).toBe(false);
  const globalCss = strip(readFileSync("src/components/calculator/transfer-control.css", "utf8"));
  const selectors = [...globalCss.matchAll(/(?:^|[{};])\s*([^\s{}@;][^{};]*)\{/g)].flatMap((m) =>
    m[1].split(",").map((s) => s.trim())
  );
  expect(selectors.length).toBeGreaterThan(0);
  expect(
    selectors.filter(
      (s) =>
        !/^\[data-(transfer-[a-z]+|calculator="v2"|calculator-workspace)[\]=]/.test(s) ||
        /(^|[\s>])[a-z]*\.[\w-]+/.test(s)
    )
  ).toEqual([]);
  // The import line carries an explanatory comment in the current CalculatorScope.tsx.
  expect(readFileSync("src/components/calculator/CalculatorScope.tsx", "utf8")).toMatch(
    /^import "\.\/calculator-chrome\.generated\.css";(\s*\/\/.*)?$/m
  );
  expect(readFileSync("src/components/calculator/TransferControl.tsx", "utf8")).toMatch(
    /^import "\.\/transfer-control\.css";$/m
  );
  const parts = CALCULATOR_V2_CSS.split(/^\/\* ([\w./-]+\.css) \*\/$/m);
  const sections = Array.from({ length: (parts.length - 1) / 2 }, (_, i) => ({
    path: parts[2 * i + 1],
    css: parts[2 * i + 2],
  }));
  expect(sections.map((s) => s.path)).toEqual(
    expect.arrayContaining([
      "vendor/mathquill/mathquill.css",
      "src/components/calculator-v2/styles/tokens.css",
    ])
  );
  for (const { path, css } of sections)
    if (path !== "vendor/mathquill/mathquill.css") expect(strip(css), path).not.toMatch(literal);
  const host = hostThemeCss("ivory");
  expect(host.startsWith(":host{")).toBe(true);
  for (const name of [...Object.values(ROLE_VARS), ...Object.values(CURVE_VARS)])
    expect(host).toContain(`${name}:`);
});

const hasCutPoint = (() => {
  try {
    execFileSync("git", ["cat-file", "-e", "08c8c76^{commit}"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
it.skipIf(!hasCutPoint)(
  "TH-2 palettes.ts and the site tokens in globals.css are unchanged since the cut point 08c8c76",
  () => {
    expect(() =>
      execFileSync("git", [
        "diff",
        "--quiet",
        "08c8c76",
        "--",
        "src/lib/themes/palettes.ts",
        "src/app/globals.css",
      ])
    ).not.toThrow();
  }
);

it("TR-68 a pointer click focuses the control before the transfer starts, and that focus never shows the tooltip", async () => {
  const bridge = stubbed(v2Bridge());
  render(<Control />);
  const button = screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" });
  let focusedAtTransfer: Element | null = null;
  bridge.transfer.mockImplementation(async () => {
    focusedAtTransfer = document.activeElement;
    return { status: "added", message: "Added to calculator: y=2x+3.", focusRowId: "1" };
  });
  fireEvent.pointerDown(button, { pointerType: "mouse", buttons: 1 });
  fireEvent.click(button);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  expect(focusedAtTransfer).toBe(button);
  expect(document.querySelector("[data-transfer-tooltip]")).toHaveAttribute("hidden");
  // a click with no pointerdown (a DOM click) focuses it the same way, still without the tooltip
  button.blur();
  fireEvent.click(button);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(2));
  expect(focusedAtTransfer).toBe(button);
  expect(document.querySelector("[data-transfer-tooltip]")).toHaveAttribute("hidden");
});
