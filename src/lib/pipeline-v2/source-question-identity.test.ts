import { describe, expect, it } from "vitest";
import {
  answerKeyEntryId,
  identityKey,
  matchAnswerEntries,
} from "../../../scripts/lib/source-question-identity.mjs";

const version = "a".repeat(64);
const otherVersion = "b".repeat(64);

function question(module: string, number: number, id: string, extra = {}) {
  return {
    id,
    source_pdf: "released.pdf",
    source_version: version,
    source_section: "math",
    source_module: module,
    source_question_number: number,
    source_occurrence: 1,
    ...extra,
  };
}

function keyEntry(module: string, number: number, extra = {}) {
  return {
    source_pdf: "released.pdf",
    source_version: version,
    section: "math",
    module,
    source_question_number: number,
    source_occurrence: 1,
    ...extra,
  };
}

describe("source identity answer-key matching", () => {
  it("matches shuffled UUIDs across two modules with repeated numbers", () => {
    const questions = [
      question("M2", 2, "b"),
      question("M1", 1, "z"),
      question("M2", 1, "y"),
      question("M1", 2, "a"),
    ];
    const entries = [
      keyEntry("M1", 2, { answer: "B" }),
      keyEntry("M2", 1, { answer: "C" }),
      keyEntry("M1", 1, { answer: "A" }),
      keyEntry("M2", 2, { answer: "D" }),
    ];
    const matched = matchAnswerEntries(entries, questions);
    expect(entries.map((entry) => matched.get(entry))).toEqual(["a", "y", "z", "b"]);
  });

  it("separates source versions, even with the same filename", () => {
    const oldKey = keyEntry("M1", 1, { source_version: otherVersion });
    expect(matchAnswerEntries([oldKey], [question("M1", 1, "new")]).get(oldKey)).toBeNull();
  });

  it("uses the content version rather than the display filename", () => {
    const entry = keyEntry("M1", 1, { source_pdf: "renamed.pdf" });
    expect(matchAnswerEntries([entry], [question("M1", 1, "stable")]).get(entry)).toBe("stable");
  });

  it("matches a repeated visible number by its occurrence index", () => {
    const first = keyEntry("M1", 1, { source_occurrence: undefined, occurrence_index: 1 });
    const second = keyEntry("M1", 1, { source_occurrence: undefined, occurrence_index: 2 });
    const rows = [
      question("M1", 1, "first", { source_occurrence: 1 }),
      question("M1", 1, "second", { source_occurrence: 2 }),
    ];
    const matched = matchAnswerEntries([second, first], rows);
    expect(matched.get(first)).toBe("first");
    expect(matched.get(second)).toBe("second");
    expect(answerKeyEntryId(first)).not.toBe(answerKeyEntryId(second));
  });

  it("fails closed for missing module, duplicate questions, and repeated key entries", () => {
    const missingModule = keyEntry("", 1);
    const repeatedA = keyEntry("M1", 2);
    const repeatedB = keyEntry("M1", 2);
    const duplicateQuestion = keyEntry("M2", 1);
    const rows = [
      question("M1", 1, "one"),
      question("M1", 2, "two"),
      question("M2", 1, "three"),
      question("M2", 1, "duplicate"),
    ];
    const matched = matchAnswerEntries(
      [missingModule, repeatedA, repeatedB, duplicateQuestion],
      rows
    );
    for (const entry of [missingModule, repeatedA, repeatedB, duplicateQuestion]) {
      expect(matched.get(entry)).toBeNull();
    }
  });

  it("matches a retry consistently without relying on input order", () => {
    const entry = keyEntry("M1", 1);
    const rows = [question("M1", 1, "stable")];
    expect(matchAnswerEntries([entry], rows).get(entry)).toBe("stable");
    expect(matchAnswerEntries([entry], [...rows].reverse()).get(entry)).toBe("stable");
    expect(identityKey(entry)).toBe(identityKey(rows[0]));
    expect(answerKeyEntryId(entry)).toBe(answerKeyEntryId(rows[0]));
    expect(answerKeyEntryId(entry)).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/
    );
    expect(answerKeyEntryId(keyEntry("M1", 1, { source_version: otherVersion }))).not.toBe(
      answerKeyEntryId(entry)
    );
  });
});
