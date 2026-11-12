import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import PartnerMap from "./PartnerMap";

it("draws 65 dots labelled by area, naming only districts that agreed", () => {
  const html = renderToStaticMarkup(<PartnerMap />);
  expect(html.match(/class="pm-dot"/g)).toHaveLength(65);
  expect(html).toContain("<title>Boston area</title>");
  expect(html).toContain("65</span> districts");
  expect(html.match(/Public Schools|School District|Unified/g)).toEqual([
    "Public Schools",
    "Public Schools",
  ]); // Greenwich only: its title and its hover label.
  // Every dot sits inside the 960 by 600 map.
  for (const [, x, y] of html.matchAll(/translate\(([\d.-]+) ([\d.-]+)\)/g)) {
    expect(Number(x)).toBeGreaterThan(0);
    expect(Number(x)).toBeLessThan(960);
    expect(Number(y)).toBeGreaterThan(0);
    expect(Number(y)).toBeLessThan(600);
  }
});
