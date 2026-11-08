import { describe, expect, it } from "vitest";
import { importQuestion } from "@/lib/question-bank/import-core";
import { validRow } from "@/lib/question-bank/import-core-test-helpers";
import {
  PLACEHOLDER_ID,
  recordingClient,
  shapeWrites,
  type RecordedWrite,
} from "../../../scripts/import-tools/ts/stage-rows";

describe("stage-rows recording client", () => {
  it("captures the exact rows importQuestion would write, without reading", async () => {
    const writes: RecordedWrite[] = [];
    const result = await importQuestion(
      recordingClient(writes),
      validRow({ explanation_text: "Made up." })
    );
    expect(result.inserted).toBe(true);
    expect(result.errors).toEqual([]);
    const rows = shapeWrites(writes, "multiple_choice", "row 1");
    expect(rows.question.question_text).toBe("What is 2 + 2?");
    expect(rows.question.content_hash_v2).toMatch(/^[0-9a-f]{64}$/);
    // undefined fields drop out exactly as supabase-js serializes them
    expect(Object.values(rows.question)).not.toContain(undefined);
    expect(rows.choices.map((c) => c.letter)).toEqual(["A", "B", "C", "D"]);
    expect(rows.choices.find((c) => c.is_correct)?.letter).toBe("B");
    expect(rows.choices.every((c) => !("question_id" in c))).toBe(true);
    expect(rows.key.printed_answer).toBe("B");
    expect(rows.mirror).toEqual({
      selected_official_answer: "B",
      answer_key_status: "printed_key_used_no_correction",
    });
    expect(writes.find((w) => w.op === "update")?.match).toEqual({ id: PLACEHOLDER_ID });
  });

  it("refuses a numeric row recorded with choices", async () => {
    const writes: RecordedWrite[] = [];
    await importQuestion(recordingClient(writes), validRow());
    expect(() => shapeWrites(writes, "numeric_entry", "row 1")).toThrow(/choice writes/);
  });

  it("never lets the importer read the database", () => {
    const client = recordingClient([]) as unknown as {
      from: (t: string) => { select: () => unknown };
    };
    expect(() => client.from("quiz_questions").select()).toThrow(/tried to read/);
  });
});
