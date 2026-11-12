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
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";
import { placeExample } from "./ExampleTrack";
import GuaranteeSections, { targetBands } from "./GuaranteeSections";
import PricingSections from "./PricingSections";
import { usd } from "./RefundSteps";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("pricing, on the SAT Program page's frame", () => {
  const html = renderToStaticMarkup(<PricingSections />);
  const words = text(html);

  it("is built from the rebuilt pages' sections, with none of the older markup", () => {
    expect(html).toContain('class="pg-hero dl-hero"');
    expect(html.match(/class="sect pg-sect/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).not.toMatch(/class="(p-hero|plans|gx|i-sec|panel guarantee)/);
    expect(words).not.toMatch(/undefined|NaN/);
  });

  it("keeps every price and term from offer.ts", () => {
    for (const p of [PRACTICE_PLAN, PRO_PLAN]) {
      expect(words).toContain(formatPrice(p.monthly));
      expect(words).toContain(formatPrice(p.threeMonths));
    }
    expect(words).toContain(formatPrice(MP.price));
    expect(words).toContain(formatPrice(PRIVATE_PACKAGES[0].price));
    expect(words).toContain(usd(MP.price / 2));
    expect(words).toContain(SITE["pricing honest note"]);
    expect(words).toContain(SITE["pricing scholarship"]);
    expect(words).toContain(SITE["pricing renewal"]);
    // the guarantee's whole deal is on the page, as the pricing text promises
    for (const x of [...list(section(8)["we do"]), ...list(section(8)["you do"])])
      expect(words).toContain(x);
    for (const x of list(section(8).covers)) expect(words).toContain(x);
    expect(words).toContain(section(8).claim);
  });

  it("links the badges to the guarantee section it renders", () => {
    expect(html).toContain('href="#guarantee"');
    expect(html).toContain('id="guarantee"');
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
