import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("./client", () => ({ track: (...a: unknown[]) => track(...a) }));

import { CLIENT_EVENTS } from "./events";
import { speedEnd, speedRecord, speedStart } from "./speed";

describe("speed recording", () => {
  beforeEach(() => track.mockReset());

  it("sends the kind of wait and its whole milliseconds, nothing else", () => {
    vi.spyOn(performance, "now").mockReturnValueOnce(1000).mockReturnValueOnce(2234.6);
    speedStart("tab_switch");
    expect(speedEnd("tab_switch")).toBe(1235);
    expect(track).toHaveBeenCalledWith("speed", { action: "tab_switch", ms: 1235 });
    const props = track.mock.calls[0][1];
    expect(CLIENT_EVENTS.speed.safeParse(props).success).toBe(true);
  });

  it("ends a wait only once, and only one that started", () => {
    expect(speedEnd("checkout")).toBeNull();
    speedStart("checkout");
    speedEnd("checkout");
    expect(speedEnd("checkout")).toBeNull();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("drops impossible timings", () => {
    expect(speedRecord("page_open", -5)).toBeNull();
    expect(speedRecord("page_open", 500_000)).toBeNull();
    expect(speedRecord("page_open", Number.NaN)).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it("the event refuses anything but timings", () => {
    const ok = CLIENT_EVENTS.speed.safeParse({ action: "page_open", ms: 900, ttfb: 300 });
    expect(ok.success).toBe(true);
    const extra = CLIENT_EVENTS.speed.safeParse({ action: "page_open", ms: 900, note: "hi" });
    expect(extra.success).toBe(false);
  });
});
