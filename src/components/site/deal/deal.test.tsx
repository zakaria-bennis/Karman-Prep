import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatPrice,
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
} from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import GuaranteeSections, { pointRows } from "./GuaranteeSections";
import { pricingData } from "./pricing-data";
import PricingPage from "./PricingPage";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("the pricing page", () => {
  const html = renderToStaticMarkup(<PricingPage {...pricingData("2026-11-13")} />);
  const words = text(html);

  it("opens on the tutor side with the cohort first, and nothing undefined", () => {
    expect(html).toContain('class="pg-hero pz"');
    expect(html.indexOf('data-plan="cohort"')).toBeLessThan(html.indexOf('data-plan="private-10"'));
    expect(words).not.toMatch(/undefined|NaN/);
  });

  it("keeps the prices from offer.ts", () => {
    expect(words).toContain(formatPrice(MP.price));
    for (const p of PRIVATE_PACKAGES) expect(words).toContain(formatPrice(p.price));
  });

  it("offers a cohort only while its enrollment is open", () => {
    const open = pricingData("2026-11-13").tutor[0].cohorts ?? [];
    const later = pricingData("2027-01-10").tutor[0].cohorts ?? [];
    expect(open).toHaveLength(3);
    expect(open[0].award).toBe(true);
    expect(later).toHaveLength(2);
    expect(later[0].award).toBe(false);
  });

  it("prices self-study by the month, three months first", () => {
    const [practice, pro] = pricingData("2026-11-13").self;
    expect(practice.terms?.[0].note).toContain(formatPrice(PRACTICE_PLAN.threeMonths));
    expect(practice.terms?.[1].price).toBe(formatPrice(PRACTICE_PLAN.monthly));
    expect(pro.terms?.[1].price).toBe(formatPrice(PRO_PLAN.monthly));
  });
});

describe("the guarantee page", () => {
  const html = renderToStaticMarkup(<GuaranteeSections />);
  const words = text(html);

  it("keeps every line of sections 51 to 56 word for word", () => {
    for (const n of [51, 52, 53, 55, 56]) expect(words).toContain(section(n).headline);
    expect(words).toContain(section(55).sides);
    expect(words).toContain(section(51).text);
    for (const [a, b] of [
      ...pairs(section(52).high),
      ...pairs(section(53).rows),
      ...pairs(section(55).points),
      ...pairs(section(56).steps),
    ]) {
      expect(words).toContain(a);
      expect(words).toContain(b);
    }
    for (const n of [53, 56]) expect(words).toContain(section(n).note);
    expect(words).toContain(section(56).proof);
    for (const x of G.proof) expect(words).toContain(x);
    expect(words).not.toMatch(/does the work|do the work/);
    for (const x of [...list(section(8)["we do"]), ...list(section(8)["you do"])]) {
      expect(words).toContain(x);
    }
    expect(words).not.toMatch(/undefined|NaN|video explanations/);
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("lists the points from offer.ts, one line per band of starting scores", () => {
    const rows = pointRows();
    expect(rows).toHaveLength(G.bands.length);
    rows.forEach(([label, cohort, priv], i) => {
      expect(cohort).toBe(`+${G.bands[i].cohort}`);
      expect(priv).toBe(`+${G.bands[i].private}`);
      expect(words).toContain(label);
    });
    expect(section(52).high).toContain(`${G.noGuaranteeFrom} or higher`);
  });
});
