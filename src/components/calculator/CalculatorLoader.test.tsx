// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { QuizMountOptions } from "@/components/calculator-v2/host/quiz-host";
import type { CalculatorLoaderProps } from "./CalculatorLoader";

const fonts = vi.hoisted(() => ({
  listener: null as null | (() => void),
  warm: vi.fn(async () => {}),
}));
vi.mock("./font-warmup", () => ({
  warmCalculatorFonts: fonts.warm,
  onCalculatorFontsLoaded: (l: () => void) => ((fonts.listener = l), () => {}),
}));
vi.mock("./report-error", () => ({ reportCalculatorError: vi.fn() }));

beforeEach(() => {
  fonts.warm.mockReset().mockImplementation(async () => {});
  fonts.listener = null;
});

const fakeHandle = () => ({
  calculator: { setBlank: vi.fn() },
  focusOnOpen: vi.fn(),
  focusBoundary: vi.fn(),
  setReducedMotion: vi.fn(),
  reflow: vi.fn(),
  destroy: vi.fn(),
});

async function loaderWith(quizHost: () => object) {
  vi.resetModules();
  vi.doMock("@/components/calculator-v2/host/quiz-host", quizHost);
  return import("./CalculatorLoader");
}

function mount(L: typeof import("./CalculatorLoader"), extra: Partial<CalculatorLoaderProps> = {}) {
  const base = {
    active: true,
    frame: document.createElement("div"),
    chromeSlot: document.createElement("div"),
    reducedMotion: false,
    announceReset: false,
    onStatus: vi.fn(),
    onHandle: vi.fn(),
    reloadPage: vi.fn(),
    ...(extra as object),
  };
  const tree = (p: Partial<CalculatorLoaderProps>) => (
    <L.CalculatorHostIdContext.Provider value="kc-host">
      <L.CalculatorLoader {...base} {...p} />
    </L.CalculatorHostIdContext.Provider>
  );
  const view = render(tree({}));
  return {
    ...base,
    ...view,
    update: (p: Partial<CalculatorLoaderProps>) => view.rerender(tree(p)),
  };
}

it("AR-32 loadCalculatorModule keeps the exact client-only import body", () => {
  expect(
    readFileSync("src/components/calculator/CalculatorLoader.tsx", "utf8").replace(/\s+/g, " ")
  ).toContain(
    'typeof window === "undefined" ? Promise.reject(new Error("client only")) : import("@/components/calculator-v2/host/quiz-host")'
  );
});

it("AR-31 the module is imported once per page and a failed import stays failed (OI-28)", async () => {
  const imported = vi.fn();
  let L = await loaderWith(() => {
    imported();
    return { mountQuizCalculator: vi.fn() };
  });
  expect(L.getCalculatorModule()).toBe(L.getCalculatorModule());
  await L.getCalculatorModule();
  expect(imported).toHaveBeenCalledTimes(1);
  L = await loaderWith(() => {
    throw new Error("chunk failed");
  });
  await expect(L.getCalculatorModule()).rejects.toThrow();
  await expect(L.getCalculatorModule()).rejects.toThrow();
});

it("AR-31 a load failure shows the reload panel and Reload page reloads the document", async () => {
  const L = await loaderWith(() => {
    throw new Error("chunk failed");
  });
  const v = mount(L);
  expect(screen.getByText("Loading calculator…")).toBeInTheDocument();
  expect(
    await screen.findByText("The calculator could not load. Reload the page to try again.")
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
  expect(v.reloadPage).toHaveBeenCalledTimes(1);
  expect(v.onStatus).toHaveBeenLastCalledWith("failed", "load");
});

it("AR-31 a mount failure shows Retry, which mounts again from the loaded module", async () => {
  const imported = vi.fn();
  const mountQuizCalculator = vi
    .fn()
    .mockImplementationOnce(() => {
      throw new Error("mount");
    })
    .mockReturnValue(fakeHandle());
  const L = await loaderWith(() => {
    imported();
    return { mountQuizCalculator };
  });
  const v = mount(L);
  expect(
    await screen.findByText("The calculator could not load.", { exact: true })
  ).toBeInTheDocument();
  expect(v.onStatus).toHaveBeenLastCalledWith("failed", "mount");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await vi.waitFor(() => expect(v.onStatus).toHaveBeenLastCalledWith("ready", null));
  expect(mountQuizCalculator).toHaveBeenCalledTimes(2);
  expect(imported).toHaveBeenCalledTimes(1);
});

it.each(["focusOnOpen", "calculator.setBlank"])(
  "AR-53 a throwing %s call becomes the Retry panel instead of reaching React",
  async (member) => {
    const boom = vi.fn(() => {
      throw new Error("api");
    });
    const base = fakeHandle();
    const handle =
      member === "focusOnOpen"
        ? { ...base, focusOnOpen: boom }
        : { ...base, calculator: { setBlank: boom } };
    const v = mount(await loaderWith(() => ({ mountQuizCalculator: () => handle })));
    await vi.waitFor(() => expect(v.onHandle).toHaveBeenCalled());
    const guarded = v.onHandle.mock.calls[0][0];
    act(() =>
      expect(() =>
        member === "focusOnOpen" ? guarded.focusOnOpen("mouse") : guarded.calculator.setBlank()
      ).not.toThrow()
    );
    expect(
      await screen.findByText("The calculator could not load.", { exact: true })
    ).toBeInTheDocument();
    expect(handle.destroy).toHaveBeenCalledTimes(1);
    expect((await import("./report-error")).reportCalculatorError).toHaveBeenCalled();
  }
);

it("AR-53 guardHandle forwards a member such as applyTransfer and a throwing applyTransfer shows the Retry panel", async () => {
  const ok = { ...fakeHandle(), applyTransfer: vi.fn(() => "ok") };
  let v = mount(await loaderWith(() => ({ mountQuizCalculator: () => ok })));
  await vi.waitFor(() => expect(v.onHandle).toHaveBeenCalled());
  expect(v.onHandle.mock.calls[0][0].applyTransfer(1, "mouse")).toBe("ok");
  expect(ok.applyTransfer).toHaveBeenCalledWith(1, "mouse");
  v.unmount();
  const bad = {
    ...fakeHandle(),
    applyTransfer: vi.fn(() => {
      throw new Error("transfer");
    }),
  };
  v = mount(await loaderWith(() => ({ mountQuizCalculator: () => bad })));
  await vi.waitFor(() => expect(v.onHandle).toHaveBeenCalled());
  act(() => {
    expect(v.onHandle.mock.calls[0][0].applyTransfer(1, "mouse")).toBeUndefined();
  });
  expect(
    await screen.findByText("The calculator could not load.", { exact: true })
  ).toBeInTheDocument();
  expect(bad.destroy).toHaveBeenCalledTimes(1);
  expect((await import("./report-error")).reportCalculatorError).toHaveBeenCalledWith(
    expect.objectContaining({ message: "transfer" }),
    null
  );
});

it("AR-41 activation warms the fonts before mounting and a font load reflows the calculator", async () => {
  const handle = fakeHandle();
  const mountQuizCalculator = vi.fn((_options: QuizMountOptions) => handle);
  mount(await loaderWith(() => ({ mountQuizCalculator })));
  await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalled());
  expect(fonts.warm.mock.invocationCallOrder[0]).toBeLessThan(
    mountQuizCalculator.mock.invocationCallOrder[0]
  );
  act(() => fonts.listener!());
  expect(handle.reflow).toHaveBeenCalledTimes(1);
});

it("AR-41 a font warm-up that never settles does not delay mounting", async () => {
  fonts.warm.mockReturnValue(new Promise<void>(() => {}));
  const mountQuizCalculator = vi.fn((_options: QuizMountOptions) => fakeHandle());
  mount(await loaderWith(() => ({ mountQuizCalculator })));
  await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalledTimes(1));
});

it("AR-58 the loader mounts into its host with the scope's options, follows reduced motion and destroys on unmount", async () => {
  const handle = fakeHandle();
  const mountQuizCalculator = vi.fn((_options: QuizMountOptions) => handle);
  const v = mount(await loaderWith(() => ({ mountQuizCalculator })), {
    reducedMotion: true,
    announceReset: true,
  });
  await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalled());
  const options = mountQuizCalculator.mock.calls[0][0];
  expect(options.element.id).toBe("kc-host");
  expect(options.element.hasAttribute("data-calculator-host")).toBe(true);
  expect(options).toMatchObject({
    frame: v.frame,
    chromeSlot: v.chromeSlot,
    reducedMotion: true,
    announceReset: true,
  });
  v.update({ reducedMotion: false });
  expect(handle.setReducedMotion).toHaveBeenLastCalledWith(false);
  v.unmount();
  expect(handle.destroy).toHaveBeenCalledTimes(1);
  expect(v.onHandle).toHaveBeenLastCalledWith(null);
});

it("AR-58 the mount waits until frame and chromeSlot are both set and runs once they arrive", async () => {
  const mountQuizCalculator = vi.fn((_options: QuizMountOptions) => fakeHandle());
  const L = await loaderWith(() => ({ mountQuizCalculator }));
  const v = mount(L, { frame: null });
  await L.getCalculatorModule();
  await act(async () => {});
  expect(mountQuizCalculator).not.toHaveBeenCalled();
  const frame = document.createElement("div");
  v.update({ frame });
  await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalledTimes(1));
  expect(mountQuizCalculator.mock.calls[0][0].frame).toBe(frame);
});

it("AR-61 an inactive loader renders nothing and imports nothing, and an import settling after unmount mounts nothing", async () => {
  const imported = vi.fn();
  const mountQuizCalculator = vi.fn();
  const L = await loaderWith(() => {
    imported();
    return { mountQuizCalculator };
  });
  const v = mount(L, { active: false });
  await act(async () => {});
  expect(v.container).toBeEmptyDOMElement();
  expect(imported).not.toHaveBeenCalled();
  v.update({ active: true });
  v.unmount();
  await L.getCalculatorModule();
  await act(async () => {});
  expect(mountQuizCalculator).not.toHaveBeenCalled();
});
