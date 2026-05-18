// ============================================================
// Unit tests for the bank-accept classifier.
//
// The classifier is the pure half of the actionAcceptAllBank
// admin flow. Locks down the split-by-slug-match behavior so
// future changes can't silently regress.
// ============================================================

import { describe, expect, it } from "vitest";
import { classifyBankRowsForAccept, type BankRow } from "./classify-bank-accept";

// A small in-memory slug→node map for the tests. Mirrors the
// real shape of `nodeIdFromSlug` from `@/lib/question-bank/taxonomy`
// (returns string | null | undefined), without dragging the real
// 89-node map into a unit test.
function makeResolver(map: Record<string, string>): (slug: string) => string | null {
  return (slug) => map[slug] ?? null;
}

describe("classifyBankRowsForAccept", () => {
  it("returns empty plan for empty input", () => {
    const r = classifyBankRowsForAccept([], makeResolver({}));
    expect(r.toAccept).toEqual([]);
    expect(r.skippedIds).toEqual([]);
  });

  it("queues a row whose slug maps to a node", () => {
    const rows: BankRow[] = [{ id: "q-1", concept_slug: "linear-equations-one-variable" }];
    const r = classifyBankRowsForAccept(
      rows,
      makeResolver({ "linear-equations-one-variable": "ma-00" })
    );
    expect(r.toAccept).toEqual([{ questionId: "q-1", nodeId: "ma-00" }]);
    expect(r.skippedIds).toEqual([]);
  });

  it("skips a row whose slug does NOT map to a node", () => {
    const rows: BankRow[] = [{ id: "q-2", concept_slug: "made-up-slug" }];
    const r = classifyBankRowsForAccept(rows, makeResolver({}));
    expect(r.toAccept).toEqual([]);
    expect(r.skippedIds).toEqual(["q-2"]);
  });

  it("skips a row with null concept_slug (no slug at all)", () => {
    const rows: BankRow[] = [{ id: "q-3", concept_slug: null }];
    const r = classifyBankRowsForAccept(rows, makeResolver({}));
    expect(r.toAccept).toEqual([]);
    expect(r.skippedIds).toEqual(["q-3"]);
  });

  it("preserves input order in the toAccept array", () => {
    const rows: BankRow[] = [
      { id: "q-3", concept_slug: "linear-equations-one-variable" },
      { id: "q-1", concept_slug: "quadratic-equations-factoring" },
      { id: "q-2", concept_slug: "linear-equations-one-variable" },
    ];
    const r = classifyBankRowsForAccept(
      rows,
      makeResolver({
        "linear-equations-one-variable": "ma-00",
        "quadratic-equations-factoring": "ma-17",
      })
    );
    expect(r.toAccept.map((x) => x.questionId)).toEqual(["q-3", "q-1", "q-2"]);
  });

  it("partitions a mixed batch correctly", () => {
    const rows: BankRow[] = [
      { id: "q-1", concept_slug: "linear-equations-one-variable" }, // matches
      { id: "q-2", concept_slug: null }, // no slug
      { id: "q-3", concept_slug: "made-up" }, // unmatched
      { id: "q-4", concept_slug: "quadratic-equations-factoring" }, // matches
    ];
    const r = classifyBankRowsForAccept(
      rows,
      makeResolver({
        "linear-equations-one-variable": "ma-00",
        "quadratic-equations-factoring": "ma-17",
      })
    );
    expect(r.toAccept).toEqual([
      { questionId: "q-1", nodeId: "ma-00" },
      { questionId: "q-4", nodeId: "ma-17" },
    ]);
    expect(r.skippedIds).toEqual(["q-2", "q-3"]);
  });

  it("treats undefined return from the resolver as 'no match' (same as null)", () => {
    // Some taxonomy lookups return undefined for missing keys instead
    // of null. The classifier must handle both identically.
    const undefinedResolver: (slug: string) => string | undefined = () => undefined;
    const rows: BankRow[] = [{ id: "q-1", concept_slug: "anything" }];
    const r = classifyBankRowsForAccept(rows, undefinedResolver);
    expect(r.skippedIds).toEqual(["q-1"]);
  });
});
