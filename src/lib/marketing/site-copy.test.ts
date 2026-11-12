import { describe, expect, it } from "vitest";
import {
  FREE_PRACTICE_TEST,
  GUARANTEE,
  guaranteeBandLabel,
  guaranteedGain,
  guaranteeMax,
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
    expect(section(41).text).toContain(String(FREE_PRACTICE_TEST.questionCount));
    expect(section(51).headline).toBe(section(10).headline); // the home page and the guarantee page agree
    expect(section(51).headline).toContain(`Up to +${guaranteeMax("private")} points`);
    expect(section(8).promise).toBe(`Up to +${guaranteeMax("cohort")} points`);
    expect(section(33)["large package"]).toContain(formatPrice(PRIVATE_PACKAGES[1].price));
    expect(list(section(25)["form date options"])).toEqual([
      MARCH_PROGRAM.startShort,
      ...NEXT_PROGRAMS.map((p) => p.startShort),
    ]);
  });

  it("states the tiered guarantee the same way everywhere", () => {
    // every band, both tracks, and the point where there is no guarantee
    const rows = pairs(section(56).rows);
    expect(rows).toHaveLength(GUARANTEE.bands.length + 1);
    GUARANTEE.bands.forEach((band, i) => {
      expect(rows[i][0]).toBe(guaranteeBandLabel(i));
      expect(rows[i][1]).toContain(`+${band.cohort} on the cohort`);
      expect(rows[i][1]).toContain(`+${band.private} on`);
    });
    expect(rows.at(-1)?.[0]).toBe(`${GUARANTEE.noGuaranteeFrom} or higher`);
    expect(section(8)["promise note"]).toContain(
      `From ${GUARANTEE.noGuaranteeFrom} the promise is that the score rises`
    );
    // nothing of the flat "+100, or +50 from 1400" promise is left
    expect(SITE_COPY).not.toMatch(/\+100 points, or \+50|from 1400\b|under 1400/);
  });

  it("works the guarantee examples out from the cohort's targets", () => {
    const outcomes = pairs(section(52).rows).map(([scores, result]) => {
      const [base, sat] = scores.match(/\d{3,4}/g)!.map(Number);
      const target = guaranteedGain(base, "cohort")!;
      const gained = sat - base;
      const expected = gained >= target ? "kept" : gained >= target / 2 ? "Half back" : "The full";
      expect(result).toContain(`+${gained}`);
      expect(result).toContain(`+${target}`);
      expect(result).toContain(expected);
      return expected;
    });
    expect(outcomes).toEqual(["kept", "Half back", "The full", "kept", "Half back"]);
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
    expect(section(63).proof).toMatch(/Karman 1:1 tutoring, median 16 weeks/);
    expect(section(34).proof).toMatch(/Karman 1:1 tutoring, median 16 weeks/);
  });

  it("reads sections, the site block and pairs", () => {
    expect(SITE.logo).toBe("Karman");
    expect(pairs(section(8).outcomes)).toHaveLength(3);
    expect(section(999)).toEqual({});
  });
});
