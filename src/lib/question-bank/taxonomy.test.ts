// ============================================================
// Unit tests for the SAT taxonomy validators.
// These rules guard the bulk-importer — invalid slugs/domains
// from the Custom GPT pipeline get rejected at import time.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  isValidDomain,
  isValidSlug,
  clusterFromSlug,
  domainFromSlug,
  labelFromSlug,
  CLUSTER_BY_DOMAIN,
} from "./taxonomy";

describe("isValidDomain", () => {
  it("accepts the 4 math domains", () => {
    expect(isValidDomain("algebra")).toBe(true);
    expect(isValidDomain("advanced_math")).toBe(true);
    expect(isValidDomain("geometry")).toBe(true);
    expect(isValidDomain("data_analysis")).toBe(true);
  });

  it("accepts the 4 R&W domains", () => {
    expect(isValidDomain("info_ideas")).toBe(true);
    expect(isValidDomain("craft_structure")).toBe(true);
    expect(isValidDomain("expression_ideas")).toBe(true);
    expect(isValidDomain("conventions")).toBe(true);
  });

  it("rejects unknown domains", () => {
    expect(isValidDomain("unknown")).toBe(false);
    expect(isValidDomain("")).toBe(false);
    expect(isValidDomain("Algebra")).toBe(false); // case-sensitive
  });

  it("rejects dash-form (taxonomy uses underscores for domains)", () => {
    expect(isValidDomain("advanced-math")).toBe(false);
    expect(isValidDomain("info-ideas")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("accepts known slugs across both subjects", () => {
    expect(isValidSlug("linear-equations-one-variable")).toBe(true);
    expect(isValidSlug("quadratic-equations-factoring")).toBe(true);
    expect(isValidSlug("subject-verb-agreement")).toBe(true);
    expect(isValidSlug("main-idea-and-central-claims")).toBe(true);
  });

  it("rejects invented slugs (the GPT sometimes hallucinates)", () => {
    expect(isValidSlug("quadratic-functions")).toBe(false); // close but wrong
    expect(isValidSlug("not-a-real-slug")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects underscore-form (slugs use dashes — opposite of domains)", () => {
    expect(isValidSlug("linear_equations_one_variable")).toBe(false);
  });
});

describe("slug → domain/cluster lookups", () => {
  it("returns the correct domain for each slug", () => {
    expect(domainFromSlug("linear-equations-one-variable")).toBe("algebra");
    expect(domainFromSlug("triangle-congruence-and-similarity")).toBe("geometry");
    expect(domainFromSlug("subject-verb-agreement")).toBe("conventions");
  });

  it("returns the correct cluster label", () => {
    expect(clusterFromSlug("linear-equations-one-variable")).toBe(CLUSTER_BY_DOMAIN.algebra);
    expect(clusterFromSlug("subject-verb-agreement")).toBe(CLUSTER_BY_DOMAIN.conventions);
  });

  it("returns undefined for unknown slugs", () => {
    expect(domainFromSlug("not-a-slug")).toBeUndefined();
    expect(clusterFromSlug("not-a-slug")).toBeUndefined();
  });
});

describe("labelFromSlug", () => {
  it("returns the human label for known slugs", () => {
    expect(labelFromSlug("linear-equations-one-variable")).toBe("Linear equations (one variable)");
  });

  it("falls back to humanized kebab for unknown slugs", () => {
    expect(labelFromSlug("some-new-thing")).toBe("Some New Thing");
  });
});
