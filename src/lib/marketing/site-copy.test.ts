import { describe, expect, it } from "vitest";
import {
  FREE_PRACTICE_TEST,
  GUARANTEE,
  MARCH_PROGRAM,
  NEXT_PROGRAMS,
  PRIVATE_PACKAGES,
  formatPrice,
} from "./offer";
import { list, pairs, section, SITE, SITE_COPY } from "./site-copy";

describe("site copy", () => {
  it("follows the house copy rules", () => {
    expect(SITE_COPY).not.toMatch(/—/); // no em dashes
    expect(SITE_COPY).not.toMatch(/\$\{|undefined|NaN/); // every slot filled
    expect(SITE_COPY).not.toMatch(/^\s*\d+\.\s/m); // no numbered list markers
  });

  it("states prices and dates from offer.ts", () => {
    expect(section(26).headline).toBe(
      `${formatPrice(MARCH_PROGRAM.price)}, or three payments of ${formatPrice(MARCH_PROGRAM.installments.amount)}.`
    );
    expect(section(21).headline).toContain(MARCH_PROGRAM.testDateLabel.replace(/, \d{4}$/, ""));
    expect(section(41).headline).toContain(FREE_PRACTICE_TEST.dateShort);
    expect(section(51).headline).toContain(`+${GUARANTEE.points} points or a ${GUARANTEE.orScore}`);
    expect(section(33)["large package"]).toContain(formatPrice(PRIVATE_PACKAGES[1].price));
    expect(list(section(25)["form date options"])).toEqual([
      MARCH_PROGRAM.testDateShort,
      ...NEXT_PROGRAMS.map((p) => p.testDateShort),
    ]);
  });

  it("puts every tutoring result next to where it came from", () => {
    for (const n of [1, 63])
      expect(section(n).proof).toMatch(/Karman 1:1 tutoring, median 16 weeks/);
    expect(section(34).proof).toMatch(/Karman 1:1 tutoring, median 16 weeks/);
  });

  it("reads sections, the site block and pairs", () => {
    expect(SITE.logo).toBe("Karman");
    expect(pairs(section(8).outcomes)).toHaveLength(3);
    expect(section(999)).toEqual({});
  });
});
