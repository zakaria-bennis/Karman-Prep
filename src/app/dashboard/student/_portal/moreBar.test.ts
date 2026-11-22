import { describe, expect, it } from "vitest";
import { inView, slots, strip, waits } from "./moreBar";

const bar = ["homework", "library", "chat", "progress", "more"] as const;
const tucked = ["mistakes", "rewards"] as const;

describe("the phone bar's carousel", () => {
  it("lists the strip with More in the middle and Account last", () => {
    expect(strip(bar, tucked)).toEqual([...bar, "mistakes", "rewards", "account"]);
    expect(inView(bar, tucked, false)).toEqual([...bar]);
    expect(inView(bar, tucked, true)).toEqual(["more", "mistakes", "rewards", "account"]);
  });

  it("fills the bar exactly with whichever set is in view", () => {
    const rest = slots(5, 4, 300, false);
    expect(rest.slice(0, 5).map((s) => s.x)).toEqual([0, 60, 120, 180, 240]);
    expect(rest.slice(5).every((s) => s.x >= 300)).toBe(true);
    const turned = slots(5, 4, 300, true);
    expect(turned.slice(0, 4).every((s) => s.x + s.w <= 0)).toBe(true);
    expect(turned.slice(4)).toEqual([
      { x: 0, w: 75 },
      { x: 75, w: 75 },
      { x: 150, w: 75 },
      { x: 225, w: 75 },
    ]);
  });

  it("gives every picture a wait", () => {
    expect(waits(5, 4, true)).toHaveLength(8);
    expect(waits(5, 4, false).every((s) => s >= 0 && s < 0.2)).toBe(true);
  });
});
