// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { expect, it, vi } from "vitest";
import { ERROR_COPY, ErrorBoundary, isUpdateDepthError } from "./ErrorBoundary";

const DEPTH =
  "Maximum update depth exceeded. This can happen when a component repeatedly calls setState";

/** Throws the next error from a layout effect (as a setState there would), once per mount. */
function Thrower(props: { errors: Error[] }) {
  useLayoutEffect(() => {
    const next = props.errors.shift();
    if (next !== undefined) throw next;
  }, [props.errors]);
  return <p>calculator</p>;
}

function mount(errors: Error[]) {
  const onError = vi.fn();
  const onRecover = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary host={document.body} onError={onError} onReset={() => {}} onRecover={onRecover}>
      <Thrower errors={errors} />
    </ErrorBoundary>
  );
  return { onError, onRecover };
}

it("break-ui recognises React's update-depth error in development and production wording", () => {
  expect(isUpdateDepthError(new Error(DEPTH))).toBe(true);
  expect(isUpdateDepthError(new Error("Minified React error #185; visit https://react.dev"))).toBe(
    true
  );
  expect(isUpdateDepthError(new Error("Minified React error #1850"))).toBe(false);
  expect(isUpdateDepthError(new Error("boom"))).toBe(false);
  expect(isUpdateDepthError("Maximum update depth exceeded")).toBe(false);
});

it("break-ui an update-depth error from fast input remounts at once, reports it and calls onRecover", () => {
  const { onError, onRecover } = mount([new Error(DEPTH)]);
  expect(screen.getByText("calculator")).toBeInTheDocument();
  expect(screen.queryByText(ERROR_COPY.message)).toBeNull();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onRecover).toHaveBeenCalledTimes(1);
});

it("break-ui any other error shows the fallback", () => {
  mount([new Error("boom")]);
  expect(screen.getByText(ERROR_COPY.message)).toBeInTheDocument();
});

it("break-ui update-depth recovery stops after three in a row so a real loop cannot spin", () => {
  const { onRecover } = mount([1, 2, 3, 4].map(() => new Error(DEPTH)));
  expect(screen.getByText(ERROR_COPY.message)).toBeInTheDocument();
  expect(onRecover).toHaveBeenCalledTimes(3);
});
