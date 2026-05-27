// @vitest-environment node
//
// Unit tests for Phase 8.1's shared import-core module
// (src/lib/question-bank/import-core.ts).
//
// PURE helpers (computeContentHashV2, validateImportRow,
// subjectFromDomain, parseDifficulty) get the most coverage here.
// The importQuestion DB writer is exercised via a mocked Supabase
// client at the bottom — full DB integration is covered by the
// existing audit + smoke flows.

import { describe, expect, it, vi } from "vitest";
import {
  computeContentHashV2,
  parseDifficulty,
  subjectFromDomain,
  validateImportRow,
  importQuestion,
  importQuestions,
  type ImportQuestionInput,
} from "./import-core";

// ── subjectFromDomain ────────────────────────────────────────

describe("subjectFromDomain", () => {
  it("maps the 4 reading domains to 'reading'", () => {
    expect(subjectFromDomain("info_ideas")).toBe("reading");
    expect(subjectFromDomain("craft_structure")).toBe("reading");
    expect(subjectFromDomain("expression_ideas")).toBe("reading");
    expect(subjectFromDomain("conventions")).toBe("reading");
  });
  it("maps the 4 math domains to 'math'", () => {
    expect(subjectFromDomain("algebra")).toBe("math");
    expect(subjectFromDomain("advanced_math")).toBe("math");
    expect(subjectFromDomain("geometry")).toBe("math");
    expect(subjectFromDomain("data_analysis")).toBe("math");
  });
});

// ── parseDifficulty ──────────────────────────────────────────

describe("parseDifficulty", () => {
  it("accepts integer 1-7 inputs", () => {
    expect(parseDifficulty(1).level).toBe(1);
    expect(parseDifficulty(7).level).toBe(7);
    expect(parseDifficulty(4).level).toBe(4);
  });

  it("accepts string-numeric inputs", () => {
    expect(parseDifficulty("5").level).toBe(5);
    expect(parseDifficulty(" 3 ").level).toBe(3);
  });

  it("accepts legacy enum strings", () => {
    expect(parseDifficulty("foundational").legacy).toBe("foundational");
    expect(parseDifficulty("intermediate").legacy).toBe("intermediate");
    expect(parseDifficulty("advanced").legacy).toBe("advanced");
    expect(parseDifficulty("mastery").legacy).toBe("mastery");
  });

  it("defaults to (4, intermediate) on missing or bogus input", () => {
    expect(parseDifficulty(undefined)).toEqual({ level: 4, legacy: "intermediate" });
    expect(parseDifficulty(null as unknown as undefined).level).toBe(4);
    expect(parseDifficulty("not_a_difficulty").level).toBe(4);
    expect(parseDifficulty(0).level).toBe(4); // out of range
    expect(parseDifficulty(8).level).toBe(4); // out of range
  });
});

// ── computeContentHashV2 ─────────────────────────────────────

describe("computeContentHashV2", () => {
  const baseFields = {
    subject: "math",
    domain: "algebra",
    answer_format: "multiple_choice",
    question_text: "What is 2 + 2?",
    choice_a: "3",
    choice_b: "4",
    choice_c: "5",
    choice_d: "6",
  };

  it("is stable for identical inputs", () => {
    const a = computeContentHashV2(baseFields);
    const b = computeContentHashV2(baseFields);
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // sha256 hex
  });

  it("changes when any canonical field changes", () => {
    const base = computeContentHashV2(baseFields);
    expect(computeContentHashV2({ ...baseFields, question_text: "What is 3 + 3?" })).not.toBe(base);
    expect(computeContentHashV2({ ...baseFields, choice_a: "0" })).not.toBe(base);
    expect(computeContentHashV2({ ...baseFields, domain: "advanced_math" })).not.toBe(base);
  });

  it("normalizes case + whitespace so trivial diffs don't collide-bust", () => {
    const a = computeContentHashV2(baseFields);
    const b = computeContentHashV2({
      ...baseFields,
      question_text: "  What is 2 + 2?  ",
    });
    const c = computeContentHashV2({
      ...baseFields,
      question_text: "WHAT IS 2 + 2?",
    });
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("includes passage fields (audit CRIT-4 fix)", () => {
    const noPassage = computeContentHashV2(baseFields);
    const withPassage = computeContentHashV2({
      ...baseFields,
      passage: "Some passage text.",
    });
    expect(noPassage).not.toBe(withPassage);
  });
});

// ── validateImportRow ────────────────────────────────────────

function validRow(overrides: Partial<ImportQuestionInput> = {}): ImportQuestionInput {
  return {
    question_text: "What is 2 + 2?",
    correct_answer: "B",
    domain: "algebra",
    choice_a: "3",
    choice_b: "4",
    choice_c: "5",
    choice_d: "6",
    ...overrides,
  };
}

describe("validateImportRow — happy path", () => {
  it("accepts a complete MC row", () => {
    const r = validateImportRow(validRow());
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("accepts a numeric_entry row without choices", () => {
    const r = validateImportRow({
      question_text: "Solve for x: 2x + 3 = 11",
      correct_answer: "4",
      domain: "algebra",
      question_format: "numeric_entry",
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateImportRow — required-field rejections", () => {
  it("rejects empty question_text", () => {
    const r = validateImportRow(validRow({ question_text: "  " }));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/question_text/);
  });

  it("rejects missing correct_answer", () => {
    const r = validateImportRow(validRow({ correct_answer: "" }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /correct_answer/.test(e))).toBe(true);
  });

  it("rejects unknown domain", () => {
    const r = validateImportRow(validRow({ domain: "made_up" as unknown as "algebra" }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /domain/.test(e))).toBe(true);
  });

  it("rejects unknown concept_slug", () => {
    const r = validateImportRow(validRow({ concept_slug: "not-a-real-slug" }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /concept_slug/.test(e))).toBe(true);
  });
});

describe("validateImportRow — MC-specific rules", () => {
  it("rejects MC row with no choice text at all", () => {
    const r = validateImportRow({
      question_text: "x",
      correct_answer: "A",
      domain: "algebra",
      choice_a: undefined,
      choice_b: undefined,
      choice_c: undefined,
      choice_d: undefined,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /choice/.test(e))).toBe(true);
  });

  it("rejects MC row with correct_answer not in A-D", () => {
    const r = validateImportRow(validRow({ correct_answer: "E" }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /correct_answer/.test(e))).toBe(true);
  });

  it("accepts MC row with case-insensitive correct_answer", () => {
    const r = validateImportRow(validRow({ correct_answer: "c" }));
    expect(r.ok).toBe(true);
  });
});

describe("validateImportRow — numeric_entry rules", () => {
  it("rejects numeric_entry row with non-numeric tolerance", () => {
    const r = validateImportRow({
      question_text: "x",
      correct_answer: "4",
      domain: "algebra",
      question_format: "numeric_entry",
      numeric_tolerance: "kinda close",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /numeric_tolerance/.test(e))).toBe(true);
  });

  it("accepts numeric_entry row with valid tolerance", () => {
    const r = validateImportRow({
      question_text: "x",
      correct_answer: "4",
      domain: "algebra",
      question_format: "numeric_entry",
      numeric_tolerance: "0.01",
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateImportRow — needs_review flag rule", () => {
  it("rejects needs_review row with no flag_reason", () => {
    const r = validateImportRow(
      validRow({
        import_status: "needs_review",
        import_flag_reason: "",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /import_flag_reason/.test(e))).toBe(true);
  });

  it("accepts needs_review row with flag_reason set", () => {
    const r = validateImportRow(
      validRow({
        import_status: "needs_review",
        import_flag_reason: "image extraction looked clipped",
      })
    );
    expect(r.ok).toBe(true);
  });
});

// ── importQuestion (mocked Supabase) ─────────────────────────

function mockSupabase(
  inserts: Record<string, { data?: unknown; error?: { code?: string; message: string } | null }>
) {
  const calls: Array<{ table: string; payload: unknown; method: string }> = [];
  function make(table: string) {
    const builder: {
      insert: (p: unknown) => typeof builder;
      update: (p: unknown) => typeof builder;
      eq: (...args: unknown[]) => typeof builder;
      select: () => typeof builder;
      single: () => unknown;
      then: (cb: (r: unknown) => unknown) => unknown;
    } = {
      insert(payload: unknown) {
        calls.push({ table, payload, method: "insert" });
        return builder;
      },
      update(payload: unknown) {
        calls.push({ table, payload, method: "update" });
        return builder;
      },
      eq() {
        return builder;
      },
      select() {
        return builder;
      },
      single() {
        const result = inserts[table] ?? { data: { id: `mock-${table}-id` }, error: null };
        return Promise.resolve(result);
      },
      then(cb: (r: unknown) => unknown) {
        const result = inserts[table] ?? { data: null, error: null };
        return Promise.resolve(cb(result));
      },
    };
    return builder;
  }
  return {
    client: { from: (table: string) => make(table) } as never,
    calls,
  };
}

describe("importQuestion — DB write shape", () => {
  it("writes raw_question_text mirror on insert (Phase 5 invariant)", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    const result = await importQuestion(client, validRow());
    expect(result.inserted).toBe(true);
    const qInsert = calls.find((c) => c.table === "quiz_questions" && c.method === "insert");
    expect(qInsert).toBeDefined();
    const payload = qInsert!.payload as Record<string, unknown>;
    expect(payload.question_text).toBe("What is 2 + 2?");
    expect(payload.raw_question_text).toBe("What is 2 + 2?");
  });

  it("computes content_hash_v2 (sha256 hex)", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(client, validRow());
    const qInsert = calls.find((c) => c.table === "quiz_questions" && c.method === "insert");
    const payload = qInsert!.payload as Record<string, unknown>;
    expect(payload.content_hash_v2).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets publish_status=draft for ok rows", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(client, validRow());
    const qInsert = calls.find((c) => c.table === "quiz_questions" && c.method === "insert");
    expect((qInsert!.payload as Record<string, unknown>).publish_status).toBe("draft");
  });

  it("sets publish_status=needs_human_review for flagged rows", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(
      client,
      validRow({
        import_status: "needs_review",
        import_flag_reason: "test",
      })
    );
    const qInsert = calls.find((c) => c.table === "quiz_questions" && c.method === "insert");
    expect((qInsert!.payload as Record<string, unknown>).publish_status).toBe("needs_human_review");
  });

  it("writes 4 answer_choices with raw_choice_text mirror", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(client, validRow());
    const cInsert = calls.find((c) => c.table === "answer_choices" && c.method === "insert");
    expect(cInsert).toBeDefined();
    const choices = cInsert!.payload as Array<Record<string, unknown>>;
    expect(choices).toHaveLength(4);
    for (const c of choices) {
      expect(c.choice_text).toBeDefined();
      expect(c.raw_choice_text).toBe(c.choice_text);
    }
    const correctChoice = choices.find((c) => c.is_correct);
    expect((correctChoice as { letter: string }).letter).toBe("B");
  });

  it("seeds answer_key_entries with Phase 1 sentinel", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(client, validRow());
    const ake = calls.find((c) => c.table === "answer_key_entries" && c.method === "insert");
    expect(ake).toBeDefined();
    const payload = ake!.payload as Record<string, unknown>;
    expect(payload.selected_official_answer).toBe("B");
    expect(payload.status).toBe("printed_key_used_no_correction");
    expect(payload.selection_reason).toBe("phase1_seed_from_printed_correct_answer");
  });

  it("mirrors selected_official_answer + answer_key_status onto quiz_questions", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(client, validRow());
    const mirror = calls.find((c) => c.table === "quiz_questions" && c.method === "update");
    expect(mirror).toBeDefined();
    const payload = mirror!.payload as Record<string, unknown>;
    expect(payload.selected_official_answer).toBe("B");
    expect(payload.answer_key_status).toBe("printed_key_used_no_correction");
  });

  it("registers image as source_assets when image_url present", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(
      client,
      validRow({ image_url: "https://r2/fig.png", source_pdf: "x.pdf" })
    );
    const sa = calls.find((c) => c.table === "source_assets" && c.method === "insert");
    expect(sa).toBeDefined();
    const payload = sa!.payload as Record<string, unknown>;
    expect(payload.asset_type).toBe("figure_crop");
    expect(payload.public_url).toBe("https://r2/fig.png");
    expect(payload.use_in_solving).toBe(true);
  });

  it("does NOT register source_assets when image_url missing", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    await importQuestion(client, validRow({ image_url: null }));
    const sa = calls.find((c) => c.table === "source_assets" && c.method === "insert");
    expect(sa).toBeUndefined();
  });

  it("returns duplicate_skipped on 23505", async () => {
    const { client } = mockSupabase({
      quiz_questions: {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      },
    });
    const result = await importQuestion(client, validRow());
    expect(result.duplicate_skipped).toBe(true);
    expect(result.inserted).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("returns errors[] when validation fails (no DB call made)", async () => {
    const spyClient = vi.fn();
    const result = await importQuestion(
      { from: spyClient } as never,
      validRow({ question_text: "  " })
    );
    expect(result.inserted).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(spyClient).not.toHaveBeenCalled();
  });
});

// ── importQuestions (batch summary) ──────────────────────────

describe("importQuestions — batch summary", () => {
  it("tallies inserted + skipped + errored across rows", async () => {
    const { client } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    const summary = await importQuestions(client, [
      validRow({ question_text: "Q1" }),
      validRow({ question_text: "  " }), // invalid — should error
      validRow({ question_text: "Q3" }),
    ]);
    expect(summary.inserted).toBe(2);
    expect(summary.errored).toBe(1);
    expect(summary.errors[0].row).toBe(3); // 1 (header) + 2 (0-indexed second row) = 3
  });
});
