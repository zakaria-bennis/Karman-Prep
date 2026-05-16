import { describe, it, expect } from "vitest";
import { requiresOptInConsent } from "./regions";

describe("requiresOptInConsent", () => {
  it("EU country → true", () => {
    expect(requiresOptInConsent({ country: "DE", region: null })).toBe(true);
    expect(requiresOptInConsent({ country: "FR", region: "75" })).toBe(true);
    expect(requiresOptInConsent({ country: "IT", region: null })).toBe(true);
  });

  it("EEA non-EU → true (Norway, Iceland, Liechtenstein)", () => {
    expect(requiresOptInConsent({ country: "NO", region: null })).toBe(true);
    expect(requiresOptInConsent({ country: "IS", region: null })).toBe(true);
    expect(requiresOptInConsent({ country: "LI", region: null })).toBe(true);
  });

  it("UK → true (post-Brexit UK GDPR)", () => {
    expect(requiresOptInConsent({ country: "GB", region: null })).toBe(true);
  });

  it("US + California → true (CCPA/CPRA)", () => {
    expect(requiresOptInConsent({ country: "US", region: "CA" })).toBe(true);
    expect(requiresOptInConsent({ country: "us", region: "ca" })).toBe(true);
  });

  it("US outside California → false", () => {
    expect(requiresOptInConsent({ country: "US", region: "NY" })).toBe(false);
    expect(requiresOptInConsent({ country: "US", region: "TX" })).toBe(false);
    expect(requiresOptInConsent({ country: "US", region: null })).toBe(false);
  });

  it("Other countries → false", () => {
    expect(requiresOptInConsent({ country: "CA", region: null })).toBe(false); // Canada
    expect(requiresOptInConsent({ country: "JP", region: null })).toBe(false);
    expect(requiresOptInConsent({ country: "MX", region: null })).toBe(false);
    expect(requiresOptInConsent({ country: "AU", region: null })).toBe(false);
  });

  it("Missing country → true (fail-safe)", () => {
    expect(requiresOptInConsent({ country: null, region: null })).toBe(true);
    expect(requiresOptInConsent({ country: null, region: "CA" })).toBe(true);
  });
});
