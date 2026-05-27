// @vitest-environment node
//
// Phase 8.2 — round-trip sanity tests for the generated taxonomy
// artifact at scripts/lib/taxonomy.generated.mjs.
//
// The CI workflow runs `npm run sync:taxonomy && git diff --exit-code`
// to catch stale generated artifacts at commit time. This vitest
// catches a different failure mode: the GENERATOR silently dropping
// or duplicating data between the TS source and the .mjs output.
//
// Imports the .mjs side as a module (vitest handles .mjs natively)
// and the TS side via the @/ alias, then asserts they agree on
// shape and content.

import { describe, expect, it } from "vitest";
import {
  CONCEPT_SLUGS as TS_CONCEPT_SLUGS,
  SAT_DOMAINS,
  CLUSTER_BY_DOMAIN as TS_CLUSTER_BY_DOMAIN,
  isValidSlug as tsIsValidSlug,
  isValidDomain as tsIsValidDomain,
  nodeIdFromSlug as tsNodeIdFromSlug,
} from "@/lib/question-bank/taxonomy";

import {
  DOMAINS,
  SUBJECTS,
  ANSWER_FORMATS,
  DIFFICULTY_LEVELS,
  READING_DOMAINS,
  MATH_DOMAINS,
  CLUSTER_BY_DOMAIN as MJS_CLUSTER_BY_DOMAIN,
  TOPIC_CLUSTERS,
  CONCEPT_SLUGS as MJS_CONCEPT_SLUGS,
  CONCEPT_SLUG_VALUES,
  SLUG_TO_NODE_ID,
  SLUG_TO_DOMAIN,
  RW_NODE_IDS,
  MATH_NODE_IDS,
  isValidDomain as mjsIsValidDomain,
  isValidSlug as mjsIsValidSlug,
  nodeIdFromSlug as mjsNodeIdFromSlug,
  subjectFromDomain,
  clusterFromSlug,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — .mjs has no type declarations; runtime validation only.
} from "../../../scripts/lib/taxonomy.generated.mjs";

describe("taxonomy.generated.mjs — top-level shape", () => {
  it("exposes 2 subjects, 2 answer formats, 7 difficulty levels", () => {
    expect(SUBJECTS).toEqual(["reading", "math"]);
    expect(ANSWER_FORMATS).toEqual(["multiple_choice", "numeric_entry"]);
    expect(DIFFICULTY_LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("DOMAINS matches the TS SAT_DOMAINS exactly in order + content", () => {
    expect([...DOMAINS]).toEqual([...SAT_DOMAINS]);
  });

  it("READING_DOMAINS + MATH_DOMAINS partition DOMAINS", () => {
    const rw = new Set(READING_DOMAINS);
    const ma = new Set(MATH_DOMAINS);
    for (const d of DOMAINS) {
      expect(rw.has(d) || ma.has(d)).toBe(true);
      expect(rw.has(d) && ma.has(d)).toBe(false);
    }
    expect(rw.size + ma.size).toBe(DOMAINS.length);
  });

  it("CLUSTER_BY_DOMAIN matches the TS source exactly", () => {
    expect(MJS_CLUSTER_BY_DOMAIN).toEqual(TS_CLUSTER_BY_DOMAIN);
  });

  it("TOPIC_CLUSTERS is ordered 1:1 with DOMAINS", () => {
    expect(TOPIC_CLUSTERS).toHaveLength(DOMAINS.length);
    const lookup = MJS_CLUSTER_BY_DOMAIN as Record<string, string>;
    (DOMAINS as string[]).forEach((d, i) => {
      expect((TOPIC_CLUSTERS as string[])[i]).toBe(lookup[d]);
    });
  });
});

describe("taxonomy.generated.mjs — concept slugs", () => {
  it("CONCEPT_SLUGS contains all 89 slugs and matches TS source by slug + domain + label + nodeId", () => {
    const mjsSlugs = MJS_CONCEPT_SLUGS as Array<{
      slug: string;
      label: string;
      domain: string;
      nodeId: string;
    }>;
    expect(mjsSlugs).toHaveLength(TS_CONCEPT_SLUGS.length);
    const tsByslug = new Map(TS_CONCEPT_SLUGS.map((c) => [c.slug, c]));
    for (const m of mjsSlugs) {
      const ts = tsByslug.get(m.slug);
      expect(ts).toBeDefined();
      expect(m.domain).toBe(ts!.domain);
      expect(m.label).toBe(ts!.label);
      expect(m.nodeId).toBe(ts!.nodeId);
    }
  });

  it("CONCEPT_SLUG_VALUES is the bare-slug projection of CONCEPT_SLUGS", () => {
    const slugVals = CONCEPT_SLUG_VALUES as readonly string[];
    const slugObjs = MJS_CONCEPT_SLUGS as ReadonlyArray<{ slug: string }>;
    expect(slugVals).toHaveLength(slugObjs.length);
    slugVals.forEach((s, i) => {
      expect(s).toBe(slugObjs[i].slug);
    });
  });

  it("SLUG_TO_DOMAIN maps every slug to its domain", () => {
    for (const c of TS_CONCEPT_SLUGS) {
      expect(SLUG_TO_DOMAIN[c.slug]).toBe(c.domain);
    }
  });

  it("SLUG_TO_NODE_ID matches tsNodeIdFromSlug for every slug", () => {
    for (const c of TS_CONCEPT_SLUGS) {
      const tsNodeId = tsNodeIdFromSlug(c.slug);
      expect(SLUG_TO_NODE_ID[c.slug]).toBe(tsNodeId);
    }
  });
});

describe("taxonomy.generated.mjs — node-id projections", () => {
  it("RW_NODE_IDS + MATH_NODE_IDS combined contain every slug's node id", () => {
    const allIds = new Set([...(RW_NODE_IDS as string[]), ...(MATH_NODE_IDS as string[])]);
    for (const c of TS_CONCEPT_SLUGS) {
      const nodeId = tsNodeIdFromSlug(c.slug);
      if (nodeId) expect(allIds.has(nodeId)).toBe(true);
    }
  });

  it("RW_NODE_IDS and MATH_NODE_IDS don't overlap", () => {
    const rw = new Set(RW_NODE_IDS as string[]);
    for (const id of MATH_NODE_IDS as string[]) {
      expect(rw.has(id)).toBe(false);
    }
  });
});

describe("taxonomy.generated.mjs — helper functions", () => {
  it("isValidDomain agrees with TS source for every domain + a few rejections", () => {
    for (const d of SAT_DOMAINS) {
      expect(mjsIsValidDomain(d)).toBe(tsIsValidDomain(d));
    }
    expect(mjsIsValidDomain("not_a_domain")).toBe(false);
    expect(mjsIsValidDomain("")).toBe(false);
    expect(mjsIsValidDomain(null)).toBe(false);
  });

  it("isValidSlug agrees with TS source for every slug + a rejection", () => {
    for (const c of TS_CONCEPT_SLUGS) {
      expect(mjsIsValidSlug(c.slug)).toBe(tsIsValidSlug(c.slug));
    }
    expect(mjsIsValidSlug("invented-slug")).toBe(false);
  });

  it("nodeIdFromSlug agrees with TS source for every slug", () => {
    for (const c of TS_CONCEPT_SLUGS) {
      expect(mjsNodeIdFromSlug(c.slug)).toBe(tsNodeIdFromSlug(c.slug));
    }
    expect(mjsNodeIdFromSlug("not-a-slug")).toBeUndefined();
  });

  it("subjectFromDomain returns reading for RW + math for MATH", () => {
    for (const d of READING_DOMAINS as string[]) expect(subjectFromDomain(d)).toBe("reading");
    for (const d of MATH_DOMAINS as string[]) expect(subjectFromDomain(d)).toBe("math");
  });

  it("clusterFromSlug agrees with the TS CLUSTER_BY_DOMAIN[domainFromSlug(...)] composition", () => {
    for (const c of TS_CONCEPT_SLUGS) {
      expect(clusterFromSlug(c.slug)).toBe(TS_CLUSTER_BY_DOMAIN[c.domain]);
    }
    expect(clusterFromSlug("not-a-slug")).toBeUndefined();
  });
});

describe("Object.freeze invariants", () => {
  it("frozen arrays/objects can't be mutated", () => {
    // These would throw in strict mode (ESM is strict). vitest catches.
    expect(() => {
      (DOMAINS as string[]).push("nope");
    }).toThrow();
    expect(() => {
      (MJS_CLUSTER_BY_DOMAIN as Record<string, string>).algebra = "Pretend";
    }).toThrow();
  });
});
