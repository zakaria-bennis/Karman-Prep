import { describe, expect, it } from "vitest";
import { LIFE_SCENES } from "./life/types";
import { choosePainting } from "./schedule";
import { PAINTING_SEASONS, PAINTING_TITLES } from "./scenes";

const NOV = new Date(2026, 10, 8, 12);

describe("each painting's season", () => {
  it("snows on the winter cabin, whatever the month", () => {
    const winter = PAINTING_TITLES.indexOf("Cabin in the winter woods");
    expect(choosePainting(NOV, `?paint-scene=${winter}`, true).season).toBe("winter");
    expect(choosePainting(new Date(2026, 6, 1), `?paint-scene=${winter}`, true).season).toBe(
      "winter"
    );
  });

  it("drops autumn leaves only in autumn paintings", () => {
    LIFE_SCENES.forEach((life, i) => {
      if (life.some(([kind]) => kind === "leaves")) expect(PAINTING_SEASONS[i]).toBe("fall");
    });
    PAINTING_SEASONS.forEach((season, i) => {
      if (season !== "fall")
        expect(choosePainting(NOV, `?paint-scene=${i}`, true).season).not.toBe("fall");
    });
  });

  it("still takes a forced season in development", () => {
    expect(choosePainting(NOV, "?paint-scene=2&paint-season=spring", true).season).toBe("spring");
  });
});
