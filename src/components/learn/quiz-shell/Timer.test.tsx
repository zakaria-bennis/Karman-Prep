// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Timer } from "./Timer";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

const tick = (seconds: number) =>
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });

describe("Timer", () => {
  it("a hidden countdown shows itself again at 5 minutes and announces it once", () => {
    const start = Date.now();
    render(<Timer clock={{ kind: "down", baseSeconds: 310 }} startedAtMs={start} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByRole("timer")).toBeNull();
    tick(11);
    expect(screen.getByRole("timer")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("5 minutes left");
    tick(5);
    expect(screen.getByRole("status").textContent).toBe("5 minutes left");
  });
  it("expires once at zero", () => {
    const onExpire = vi.fn();
    render(
      <Timer
        clock={{ kind: "down", baseSeconds: 3 }}
        startedAtMs={Date.now()}
        onExpire={onExpire}
      />
    );
    tick(5);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Time is up");
  });
  it("double time doubles the limit", () => {
    render(
      <Timer
        clock={{ kind: "down", baseSeconds: 600 }}
        startedAtMs={Date.now()}
        accommodation="double"
      />
    );
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Time remaining 20 minutes 00 seconds"
    );
  });
  it("counts up from the start time in practice", () => {
    render(<Timer clock={{ kind: "up" }} startedAtMs={Date.now() - 65_000} />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Elapsed 1 minutes 05 seconds"
    );
  });
});
