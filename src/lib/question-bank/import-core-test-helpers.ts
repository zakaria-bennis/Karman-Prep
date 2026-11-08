// Shared fixtures for the import-core tests: a valid import row and a mocked
// Supabase client that records every insert and update.

import type { ImportQuestionInput } from "./import-core";

export function validRow(overrides: Partial<ImportQuestionInput> = {}): ImportQuestionInput {
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

export function mockSupabase(
  inserts: Record<string, { data?: unknown; error?: { code?: string; message: string } | null }>,
  lookup?: Record<string, unknown>
) {
  const calls: Array<{ table: string; payload: unknown; method: string }> = [];
  function make(table: string) {
    const builder: {
      insert: (p: unknown) => typeof builder;
      update: (p: unknown) => typeof builder;
      eq: (...args: unknown[]) => typeof builder;
      select: () => typeof builder;
      single: () => unknown;
      maybeSingle: () => unknown;
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
      maybeSingle() {
        return Promise.resolve({ data: lookup?.[table] ?? null, error: null });
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
