import { describe, expect, it } from "vitest";
import { faqItems } from "@/components/site/company/FaqSections";
import { BACKED_BY, STUDIES } from "@/components/site/company/ResearchSections";
import { FREE_PLAN, MARCH_PROGRAM, TRACK_RECORD, formatPrice } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

describe("About, FAQ and Research", () => {
  it("gives the FAQ at least a dozen questions, each with an answer, in its four topics", () => {
    const qa = faqItems();
    expect(qa.length).toBeGreaterThanOrEqual(12);
    expect(new Set(qa.map(([q]) => q)).size).toBe(qa.length);
    qa.forEach(([q, a]) => {
      expect(q).toMatch(/\?$/);
      expect(a.length).toBeGreaterThan(10);
    });
    expect(list(section(71).groups)).toHaveLength(4);
    expect(qa[0][1]).toContain(formatPrice(MARCH_PROGRAM.price));
  });

  it("organises the research by the home page's seven ways, and cites a real study for each", () => {
    const ways = pairs(section(6).ways);
    expect(ways).toHaveLength(7);
    expect(list(section(82).why)).toHaveLength(ways.length);
    expect(BACKED_BY).toHaveLength(ways.length);
    const f = section(82);
    const keys = STUDIES.map(([k]) => k);
    BACKED_BY.flat().forEach((k) => expect(keys).toContain(k));
    // every study is cited somewhere, and each has its words and a DOI link
    keys.forEach((k) => {
      expect(BACKED_BY.flat()).toContain(k);
      expect(f[`${k} name`]).toBeTruthy();
      expect(f[`${k} found`]).toBeTruthy();
      expect(f[`${k} source`]).toMatch(/, \d{4}$/);
    });
    STUDIES.forEach(([, href]) => expect(href).toMatch(/^https:\/\/doi\.org\/10\./));
  });

  it("states the About page's numbers from offer.ts, with their source", () => {
    expect(section(61).stat).toBe(`+${TRACK_RECORD.averageGain}`);
    expect(section(61)["stat source"]).toBe(TRACK_RECORD.sourceLabel);
    expect(section(65).text).toContain(String(FREE_PLAN.questionLimit));
  });
});
