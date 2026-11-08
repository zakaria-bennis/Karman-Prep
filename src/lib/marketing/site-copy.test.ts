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
      `${formatPrice(MARCH_PROGRAM.price)}, or a ${formatPrice(MARCH_PROGRAM.depositAmount)} deposit and three payments of ${formatPrice(MARCH_PROGRAM.installments.amount)}.`
    );
    expect(section(21).text).toContain(MARCH_PROGRAM.startLabel.replace(/, \d{4}$/, ""));
    expect(section(41).headline).toContain(FREE_PRACTICE_TEST.dateShort);
    expect(section(51).headline).toContain(
      `+${GUARANTEE.pointsBelow} points, or +${GUARANTEE.pointsFrom} from ${GUARANTEE.splitAt}`
    );
    expect(section(33)["large package"]).toContain(formatPrice(PRIVATE_PACKAGES[1].price));
    expect(list(section(25)["form date options"])).toEqual([
      MARCH_PROGRAM.startShort,
      ...NEXT_PROGRAMS.map((p) => p.startShort),
    ]);
  });

  it("adds the deposit and installments up to the cohort price", () => {
    const { depositAmount, installments, price } = MARCH_PROGRAM;
    expect(depositAmount + installments.count * installments.amount).toBe(price);
  });

  it("names the founder's plan ladder and nothing older", () => {
    expect(SITE["pricing practice button"]).toBe("Start Practice");
    expect(SITE["pricing pro button"]).toBe("Start Pro");
    expect(SITE_COPY).not.toMatch(
      /Self-paced|self-paced|\$29\b|\$49\b|or a 1450|1,295|1,950|3,600|\$195/
    );
    expect(section(33)["small package"]).toContain(formatPrice(PRIVATE_PACKAGES[0].price));
    expect(section(33)["small package"]).toContain("guarantee");
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
