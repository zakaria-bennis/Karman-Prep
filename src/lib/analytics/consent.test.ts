import { describe, expect, it } from "vitest";
import { mayRecord, privacySignalOn, siteEventsAllowed } from "./consent";

const US_TX = { country: "US", region: "TX" };
const US_CA = { country: "US", region: "CA" };
const FR = { country: "FR", region: null };
const UNKNOWN = { country: null, region: null };

describe("siteEventsAllowed", () => {
  it("records after Allow all, anywhere", () => {
    for (const region of [US_TX, US_CA, FR, UNKNOWN])
      expect(siteEventsAllowed({ cookie: "yes", region, dnt: null, gpc: null })).toBe(true);
  });

  it("never records after Essentials only", () => {
    for (const region of [US_TX, US_CA, FR, UNKNOWN])
      expect(siteEventsAllowed({ cookie: "no", region, dnt: null, gpc: null })).toBe(false);
  });

  it("waits for an answer where the banner asks first (EU/UK, California, unknown place)", () => {
    for (const region of [US_CA, FR, UNKNOWN])
      expect(siteEventsAllowed({ cookie: null, region, dnt: null, gpc: null })).toBe(false);
  });

  it("records without an answer where no banner is shown", () => {
    expect(siteEventsAllowed({ cookie: null, region: US_TX, dnt: null, gpc: null })).toBe(true);
  });

  it("treats Do Not Track and Global Privacy Control as no, even after Allow all", () => {
    expect(siteEventsAllowed({ cookie: "yes", region: US_TX, dnt: "1", gpc: null })).toBe(false);
    expect(siteEventsAllowed({ cookie: "yes", region: US_TX, dnt: null, gpc: "1" })).toBe(false);
    expect(siteEventsAllowed({ cookie: null, region: US_TX, dnt: "1", gpc: null })).toBe(false);
    expect(privacySignalOn("0", "0")).toBe(false);
  });
});

describe("mayRecord", () => {
  const declined = { cookie: "no", region: FR, dnt: "1", gpc: "1" };
  it("records portal use for a signed-in user whatever the site cookie says", () => {
    expect(mayRecord("portal", { ...declined, signedIn: true })).toBe(true);
  });
  it("records nothing in a portal when signed out", () => {
    expect(
      mayRecord("portal", { cookie: "yes", region: US_TX, dnt: null, gpc: null, signedIn: false })
    ).toBe(false);
  });
  it("applies the site rules to signed-in people on the public site too", () => {
    expect(mayRecord("site", { ...declined, signedIn: true })).toBe(false);
  });
});
