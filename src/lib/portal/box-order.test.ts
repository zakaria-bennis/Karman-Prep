import { describe, expect, it } from "vitest";
import { ACCESSORIES } from "@/app/dashboard/student/_portal/accessories";
import { ACCESSORY_COUNT, nextPrize } from "./box-order";

describe("nextPrize", () => {
  it("counts the same things to wear as the drawings", () => {
    expect(ACCESSORIES.length).toBe(ACCESSORY_COUNT);
    ACCESSORIES.forEach((a, i) => expect(a.id).toBe(String(i)));
  });

  it("gives every thing once before it runs out", () => {
    const owned: string[] = [];
    for (let i = 0; i < ACCESSORY_COUNT; i++) {
      const id = nextPrize(owned);
      expect(id).not.toBeNull();
      expect(owned).not.toContain(id);
      owned.push(id!);
    }
    expect(nextPrize(owned)).toBeNull();
  });

  it("starts where the page always started", () => {
    expect(nextPrize([])).toBe("11");
  });
});
