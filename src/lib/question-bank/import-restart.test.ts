// @vitest-environment node
import { describe, expect, it } from "vitest";
import { importQuestion, type ImportQuestionInput } from "./import-core";

const input: ImportQuestionInput = {
  question_text: "What is 2 + 2?",
  correct_answer: "B",
  domain: "algebra",
  question_format: "multiple_choice",
  choice_a: "3",
  choice_b: "4",
  choice_c: "5",
  choice_d: "6",
  source_pdf: "frozen.pdf",
  source_page: 2,
  import_status: "ok",
  image_url: "https://example.test/figure.png",
};

function memoryClient(interruptAt = "answer_choices") {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    quiz_questions: [],
    answer_choices: [],
    answer_key_entries: [],
    source_assets: [],
  };
  let interruptOnce = true;
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    let selected = false;
    let operation: "read" | "insert" | "update" = "read";
    let payload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
    const matches = (row: Record<string, unknown>) =>
      filters.every(([column, value]) => row[column] === value);
    const execute = async () => {
      const rows = tables[table];
      if (operation === "insert") {
        if (table === interruptAt && interruptOnce) {
          interruptOnce = false;
          throw new Error("simulated process interruption after parent insert");
        }
        const additions = Array.isArray(payload) ? payload : [payload!];
        if (
          table === "quiz_questions" &&
          rows.some(
            (row) =>
              row.source_pdf === additions[0].source_pdf &&
              row.content_hash === additions[0].content_hash
          )
        ) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        for (const item of additions) rows.push({ id: `${table}-${rows.length + 1}`, ...item });
        return { data: selected ? rows.at(-1) : null, error: null };
      }
      if (operation === "update") {
        for (const row of rows.filter(matches)) Object.assign(row, payload);
        return { data: null, error: null };
      }
      const found = rows.filter(matches);
      return { data: selected ? found.map((row) => ({ ...row })) : found, error: null };
    };
    const builder = {
      insert(value: typeof payload) {
        operation = "insert" as const;
        payload = value;
        return builder;
      },
      update(value: typeof payload) {
        operation = "update" as const;
        payload = value;
        return builder;
      },
      select(_columns?: string) {
        selected = true;
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        filters.push([column, value]);
        return builder;
      },
      async single() {
        const result = await execute();
        return {
          ...result,
          data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
        };
      },
      then(
        onFulfilled: (value: Awaited<ReturnType<typeof execute>>) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        return execute().then(onFulfilled, onRejected);
      },
    };
    return builder;
  };
  return { client: { from } as never, tables };
}

describe("interrupted import reconciliation", () => {
  it("repairs missing dependents and repeated import stays one question", async () => {
    const { client, tables } = memoryClient();
    await expect(importQuestion(client, input)).rejects.toThrow("simulated process interruption");
    expect(tables.quiz_questions).toHaveLength(1);
    expect(tables.answer_choices).toHaveLength(0);

    const resumed = await importQuestion(client, input);
    expect(resumed.duplicate_skipped).toBe(true);
    expect(resumed.errors).toEqual([]);
    expect(tables.quiz_questions).toHaveLength(1);
    expect(tables.answer_choices).toHaveLength(4);
    expect(tables.answer_key_entries).toHaveLength(1);
    expect(tables.source_assets).toHaveLength(1);

    const repeated = await importQuestion(client, input);
    expect(repeated.duplicate_skipped).toBe(true);
    expect(tables.answer_choices).toHaveLength(4);
    expect(tables.answer_key_entries).toHaveLength(1);
    expect(tables.source_assets).toHaveLength(1);
  });

  it("holds a conflicting dependent row instead of marking a duplicate complete", async () => {
    const { client, tables } = memoryClient();
    await expect(importQuestion(client, input)).rejects.toThrow("simulated process interruption");
    tables.answer_choices.push({
      id: "choice-conflict",
      question_id: tables.quiz_questions[0].id,
      letter: "A",
      choice_text: "wrong choice",
      is_correct: false,
    });
    const resumed = await importQuestion(client, input);
    expect(resumed.duplicate_skipped).toBe(false);
    expect(resumed.errors).toContain("answer choice A conflicts with import input");
  });

  it("resumes after choices without inserting a second set", async () => {
    const { client, tables } = memoryClient("answer_key_entries");
    await expect(importQuestion(client, input)).rejects.toThrow("simulated process interruption");
    expect(tables.answer_choices).toHaveLength(4);
    expect(tables.answer_key_entries).toHaveLength(0);
    const resumed = await importQuestion(client, input);
    expect(resumed.duplicate_skipped).toBe(true);
    expect(resumed.errors).toEqual([]);
    expect(tables.answer_choices).toHaveLength(4);
    expect(tables.answer_key_entries).toHaveLength(1);
  });

  it("holds same-body conflicting answers without overwriting the existing row", async () => {
    const { client, tables } = memoryClient();
    await expect(importQuestion(client, input)).rejects.toThrow();
    await importQuestion(client, input);
    const changedAnswer = { ...input, correct_answer: "A" };
    const duplicate = await importQuestion(client, changedAnswer);
    expect(duplicate.duplicate_skipped).toBe(false);
    expect(duplicate.errors).toContain("existing question conflicts with import input");
    expect(tables.quiz_questions).toHaveLength(1);
    expect(tables.quiz_questions[0].correct_answer).toBe("B");
  });

  it("preserves a previously verified corrected official answer", async () => {
    const { client, tables } = memoryClient();
    await expect(importQuestion(client, input)).rejects.toThrow();
    await importQuestion(client, input);
    tables.quiz_questions[0].selected_official_answer = "A";
    tables.quiz_questions[0].answer_key_status = "corrected_key_verified";
    tables.answer_key_entries[0].selected_official_answer = "A";
    tables.answer_key_entries[0].status = "corrected_key_verified";
    const duplicate = await importQuestion(client, input);
    expect(duplicate.duplicate_skipped).toBe(true);
    expect(tables.quiz_questions[0].selected_official_answer).toBe("A");
  });
});
