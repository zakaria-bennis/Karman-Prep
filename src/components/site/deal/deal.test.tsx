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
import { placeExample } from "./ExampleTrack";
import GuaranteeSections, { targetBands } from "./GuaranteeSections";
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
    expect(words).toContain(section(51).headline);
    expect(words).toContain(section(51).text);
    for (const [a, b] of pairs(section(52).rows)) {
      expect(words).toContain(a);
      expect(words).toContain(b);
    }
    for (const x of list(section(53).list)) expect(words).toContain(x);
    for (const [a, b] of pairs(section(54).rows)) {
      expect(words).toContain(a);
      expect(words).toContain(b);
    }
    expect(words).toContain(section(55).text);
    expect(words).not.toMatch(/undefined|NaN/);
  });

  it("charts the targets from offer.ts, one band per line of section 56", () => {
    const bands = targetBands();
    expect(bands).toHaveLength(G.bands.length + 1);
    bands.slice(0, -1).forEach((b, i) => {
      expect(b.cohort).toBe(G.bands[i].cohort);
      expect(b.private).toBe(G.bands[i].private);
    });
    expect(bands.at(-1)?.cohort).toBeUndefined();
    expect(html.match(/role="radio"/g)).toHaveLength(bands.length);
  });

  it("places each worked example in the ending its words name", () => {
    const zone = (at: number) => (at < 1 / 3 ? "full" : at < 2 / 3 ? "half" : "kept");
    for (const [label, out] of pairs(section(52).rows)) {
      const p = placeExample(label);
      expect(p).not.toBeNull();
      const z = zone(p!.at);
      if (/full/.test(out)) expect(z).toBe("full");
      else if (/Half back/.test(out)) expect(z).toBe("half");
      else expect(z).toBe("kept");
      expect(out).toContain(`+${p!.gain}`);
    }
  });
});
