import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isQaRenderEnabled, loadQaQuestion } from "./qa-data";

const LIVE = "00000000-0000-4000-8000-000000000001";
const HIDDEN = "00000000-0000-4000-8000-000000000002";

function exportFile() {
  const dir = mkdtempSync(path.join(tmpdir(), "qa-render-"));
  const row = (id: string, is_live: boolean) => ({
    id,
    is_live,
    node_id: null,
    question_text: "Which choice describes the made-up harbor?",
    question_type: "multiple_choice",
    difficulty: "intermediate",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    correct_answer: "B",
    subject: "reading",
    topic_cluster: "Central Ideas",
    passage: "A quiet harbor.",
    figure_kind: null,
    answer_choices: ["A", "B", "C", "D"].map((letter) => ({
      id: `${id}-${letter}`,
      question_id: id,
      letter,
      choice_text: `Choice ${letter}`,
      choice_table_data: null,
      is_correct: letter === "B",
    })),
  });
  const file = path.join(dir, "live-full.json");
  writeFileSync(file, JSON.stringify({ rows: [row(LIVE, true), row(HIDDEN, false)] }));
  return file;
}

describe("qa-render data", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off in production and without an export", () => {
    vi.stubEnv("QA_RENDER_EXPORT", "/tmp/x.json");
    vi.stubEnv("NODE_ENV", "production");
    expect(isQaRenderEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(isQaRenderEnabled()).toBe(true);
    vi.stubEnv("QA_RENDER_EXPORT", "");
    expect(isQaRenderEnabled()).toBe(false);
  });

  it("returns the student payload of a live row only, without the key", async () => {
    const file = exportFile();
    const q = await loadQaQuestion(LIVE, file);
    expect(q?.answer_choices.map((c) => c.letter)).toEqual(["A", "B", "C", "D"]);
    expect(q && "correct_answer" in q).toBe(false);
    expect(q?.answer_choices.some((c) => "is_correct" in c)).toBe(false);
    expect(await loadQaQuestion(HIDDEN, file)).toBeNull();
    expect(await loadQaQuestion("../etc/passwd", file)).toBeNull();
  });
});
