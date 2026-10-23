import "server-only";

import path from "node:path";
import type { StudentQuizQuestion } from "@/types/quiz";
import type { QuestionTableData } from "@/types/question-table";
import { FIGURE_ID, toQuestion } from "../figure-review/review-data";
import { originalUrl } from "./grading";

// Dev-only exam preview. The founder takes a newly captured exam (for example
// 2026-10_US_V1) exactly like a student before its questions are in the
// database. Everything is read from the import pipeline on his machine
// (College Board material, never in the repo or a build) and nothing is
// written anywhere: answers stay in the browser.
//
//   <pipeline>/new-exams/packages/<exam>/<B version>/<category>/<question_id>/
//       student.json (renderable_text), teacher.json (key_answer), source.json, original.png
//   <pipeline>/corpus/new-exam-c-records.json   (text, question_type, figure, complete)
//   <pipeline>/figures/<question_id>/figure.json (a rebuilt figure, when one exists)

export const EXAM_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;
export const CATEGORIES = ["Problems that passed", "Problems with fixes", "Broken problems"];
const BROKEN = "Broken problems";
const LETTERS = ["A", "B", "C", "D"] as const;

export type ExamSection = "RW" | "MATH";

export interface ExamQuestion {
  questionId: string;
  section: ExamSection;
  module: number;
  number: number;
  category: string;
  /** Broken problems: the capture is incomplete (clipped figure, missing legend...). */
  incomplete: boolean;
  issues: string[];
  /** The printed answer key, not yet validated. */
  printedKey: string;
  question: StudentQuizQuestion;
}

export interface ExamModule {
  section: ExamSection;
  module: number;
  minutes: number;
  questions: ExamQuestion[];
}

export interface ExamPreview {
  examId: string;
  version: string;
  modules: ExamModule[];
}

export function isExamPreviewEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function examPipelineDir() {
  return process.env.EXAM_PREVIEW_PIPELINE_DIR ?? path.join(process.cwd(), ".exam-preview");
}

// ── Text → student question ───────────────────────────────────

const CHOICE_LINE = /^([A-D])\)\s?(.*)$/;
const TABLE_LINE = /^\[Table:\s*([\s\S]*)\]$/;
const FIGURE_LINE = /^\[(?:Graph|Figure|Image|Diagram|Chart|Map|Photo)\b[^\]]*\]$/;

function splitColumns(text: string) {
  return text
    .replace(/\.\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** "[Table: Title. Columns: a | b.]" (rows on the following lines) or, for a table answer
 *  choice, "[Table: Columns: x | y. Rows: 2 | 28; 4 | 86.]" */
export function parseTableHeader(inner: string): QuestionTableData | null {
  const m = /^([\s\S]*?)\s*Columns:\s*([\s\S]*?)(?:\.\s*Rows:\s*([\s\S]*?))?\.?\s*$/.exec(
    inner.trim()
  );
  if (!m) return null;
  const caption = m[1].trim().replace(/\.$/, "") || null;
  const rows = m[3]
    ? m[3]
        .replace(/\.\s*$/, "")
        .split(";")
        .map((r) => splitColumns(r))
    : [];
  return { caption, header_row: splitColumns(m[2]), rows };
}

export interface ParsedText {
  passage: string | null;
  passage_a: string | null;
  passage_b: string | null;
  question_text: string;
  choices: { letter: (typeof LETTERS)[number]; text: string; table: QuestionTableData | null }[];
  table: QuestionTableData | null;
  /** The text described a figure (now removed): show the source image instead. */
  describedFigure: boolean;
}

/** Splits a captured question's renderable text into passage, prompt, choices and table. */
export function parseRenderableText(
  text: string,
  { section, multipleChoice }: { section: ExamSection; multipleChoice: boolean }
): ParsedText {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  // Choices: the last "A)" line followed by B), C), D) in order (continuations join the choice).
  let choiceStart = -1;
  if (multipleChoice) {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (CHOICE_LINE.exec(lines[i])?.[1] !== "A") continue;
      const seen = lines.slice(i).flatMap((l) => CHOICE_LINE.exec(l)?.[1] ?? []);
      if (seen.join("").startsWith("ABCD")) {
        choiceStart = i;
        break;
      }
    }
  }
  const choices: ParsedText["choices"] = [];
  if (choiceStart >= 0) {
    for (const line of lines.slice(choiceStart)) {
      const m = CHOICE_LINE.exec(line);
      if (m && LETTERS.includes(m[1] as (typeof LETTERS)[number]) && choices.length < 4)
        choices.push({ letter: m[1] as (typeof LETTERS)[number], text: m[2], table: null });
      else if (choices.length) choices[choices.length - 1].text += `\n${line}`;
    }
    for (const c of choices) {
      c.text = c.text.trim();
      const t = TABLE_LINE.exec(c.text);
      const table = t ? parseTableHeader(t[1]) : null;
      if (table && table.rows.length) {
        c.table = table;
        c.text = "";
      }
    }
  }
  const body = choiceStart >= 0 ? lines.slice(0, choiceStart) : lines;
  let table: QuestionTableData | null = null;
  let describedFigure = false;
  const kept: string[] = [];
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i].trim();
    const t = TABLE_LINE.exec(line);
    if (t && !table) {
      const parsed = parseTableHeader(t[1]);
      if (parsed) {
        while (i + 1 < body.length && body[i + 1].includes("|")) {
          parsed.rows.push(splitColumns(body[i + 1]));
          i += 1;
        }
        table = parsed;
        continue;
      }
    }
    if (FIGURE_LINE.test(line)) {
      describedFigure = true;
      continue;
    }
    kept.push(body[i]);
  }
  const clean = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const out: ParsedText = {
    passage: null,
    passage_a: null,
    passage_b: null,
    question_text: clean,
    choices,
    table,
    describedFigure,
  };
  if (section !== "RW") return out;
  const paras = clean.split(/\n\s*\n/).map((p) => p.trim());
  if (paras.length < 2) return out;
  out.question_text = paras.at(-1)!;
  const rest = paras.slice(0, -1);
  const t1 = rest.findIndex((p) => /^Text 1\b/.test(p));
  const t2 = rest.findIndex((p) => /^Text 2\b/.test(p));
  if (t1 >= 0 && t2 > t1) {
    const strip = (p: string) => p.replace(/^Text [12]\s*\n?/, "").trim();
    out.passage_a = rest.slice(t1, t2).map(strip).join("\n\n");
    out.passage_b = rest.slice(t2).map(strip).join("\n\n");
  } else {
    out.passage = rest.join("\n\n");
  }
  return out;
}

// ── Package loader ────────────────────────────────────────────

async function readJson<T>(file: string): Promise<T | null> {
  const { readFile } = await import("node:fs/promises");
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function exists(file: string) {
  const { stat } = await import("node:fs/promises");
  return stat(file).then(
    () => true,
    () => false
  );
}

interface CRecord {
  question_id: string;
  exam_id: string;
  section?: string;
  module?: number;
  question?: number;
  question_type?: string;
  text?: string;
  figure?: boolean;
  complete?: boolean;
  issues?: string[];
}

let recordCache: { mtimeMs: number; file: string; byId: Map<string, CRecord> } | null = null;

async function cRecords(dir: string): Promise<Map<string, CRecord>> {
  const { stat } = await import("node:fs/promises");
  const file = path.join(dir, "corpus", "new-exam-c-records.json");
  const info = await stat(file).catch(() => null);
  if (!info) return new Map();
  if (recordCache?.file === file && recordCache.mtimeMs === info.mtimeMs) return recordCache.byId;
  const doc = await readJson<{ records?: CRecord[] }>(file);
  const byId = new Map((doc?.records ?? []).map((r) => [r.question_id, r]));
  recordCache = { file, mtimeMs: info.mtimeMs, byId };
  return byId;
}

/** The newest B version folder of an exam (the one with READY.json, last by name). */
async function versionDir(dir: string, examId: string) {
  const { readdir } = await import("node:fs/promises");
  const examDir = path.join(dir, "new-exams", "packages", examId);
  const names = (await readdir(examDir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && EXAM_ID.test(d.name))
    .map((d) => d.name)
    .sort();
  for (const name of names.reverse()) {
    if (await exists(path.join(examDir, name, "READY.json"))) return path.join(examDir, name);
  }
  return names[0] ? path.join(examDir, names[0]) : null;
}

/** The package folder of one question, whatever its category. */
export async function questionDir(examId: string, questionId: string, dir = examPipelineDir()) {
  if (!EXAM_ID.test(examId) || !FIGURE_ID.test(questionId)) return null;
  const version = await versionDir(dir, examId);
  if (!version) return null;
  for (const category of CATEGORIES) {
    const folder = path.join(version, category, questionId);
    if (await exists(path.join(folder, "student.json"))) return folder;
  }
  return null;
}

const MODULE_ORDER: [ExamSection, number][] = [
  ["RW", 1],
  ["RW", 2],
  ["MATH", 1],
  ["MATH", 2],
];
const MINUTES: Record<ExamSection, number> = { RW: 32, MATH: 35 };

export async function loadExam(
  examId: string,
  dir = examPipelineDir()
): Promise<ExamPreview | null> {
  if (!EXAM_ID.test(examId)) return null;
  const { readdir } = await import("node:fs/promises");
  const version = await versionDir(dir, examId);
  if (!version) return null;
  const records = await cRecords(dir);
  const found: ExamQuestion[] = [];
  for (const category of CATEGORIES) {
    const names = await readdir(path.join(version, category)).catch(() => [] as string[]);
    for (const questionId of names.filter((n) => FIGURE_ID.test(n))) {
      const folder = path.join(version, category, questionId);
      const student = await readJson<{ renderable_text?: string }>(
        path.join(folder, "student.json")
      );
      const teacher = await readJson<{
        key_answer?: string;
        question_type?: string;
        figure?: boolean;
        complete?: boolean;
      }>(path.join(folder, "teacher.json"));
      const source = await readJson<{
        section?: string;
        module?: number;
        question?: number;
        issues?: string[];
      }>(path.join(folder, "source.json"));
      if (!student || !teacher || !source) continue;
      const record = records.get(questionId);
      const section = (source.section ?? record?.section) === "MATH" ? "MATH" : "RW";
      const number = Number(source.question ?? record?.question);
      const moduleNumber = Number(source.module ?? record?.module);
      const text = student.renderable_text ?? record?.text ?? "";
      const numeric = (teacher.question_type ?? record?.question_type) === "numeric_response";
      const parsed = parseRenderableText(text, { section, multipleChoice: !numeric });
      const figure = Boolean(teacher.figure ?? record?.figure) || parsed.describedFigure;
      const complete = (teacher.complete ?? record?.complete) !== false;
      const qid = `exam-preview-${questionId}`;
      let question: StudentQuizQuestion = {
        id: qid,
        node_id: null,
        question_text: parsed.question_text,
        question_type: "multiple_choice",
        // Display only: the quiz screen does not show difficulty to a student.
        difficulty: "intermediate",
        difficulty_level: 4,
        answer_format: numeric ? "numeric_entry" : "multiple_choice",
        hint: null,
        image_url: null,
        image_alt: null,
        subject: section === "MATH" ? "math" : "reading",
        topic_cluster: `Question ${number}`,
        display_order: number,
        passage_intro: null,
        passage: parsed.passage,
        passage_a: parsed.passage_a,
        passage_b: parsed.passage_b,
        figure_kind: parsed.table ? "table" : null,
        figure_table_data: parsed.table,
        figure_chart_data: null,
        figure_geometry_data: null,
        figure_svg: null,
        answer_choices: parsed.choices.map((c) => ({
          id: `${qid}-${c.letter}`,
          question_id: qid,
          letter: c.letter,
          choice_text: c.text,
          choice_table_data: c.table,
        })),
      };
      if (figure) {
        const figureDoc = await readJson<Record<string, unknown>>(
          path.join(dir, "figures", questionId, "figure.json")
        );
        if (figureDoc) {
          const rebuilt = toQuestion(questionId, figureDoc, "");
          question = {
            ...question,
            figure_kind: rebuilt.figure_kind,
            figure_table_data: rebuilt.figure_table_data,
            figure_chart_data: rebuilt.figure_chart_data,
            figure_geometry_data: rebuilt.figure_geometry_data,
            image_url: rebuilt.image_url,
            image_alt: rebuilt.image_alt,
          };
        } else {
          question = {
            ...question,
            image_url: originalUrl(examId, questionId),
            image_alt: `Source page for ${section === "MATH" ? "Math" : "Reading and Writing"} module ${moduleNumber} question ${number}`,
          };
        }
      }
      found.push({
        questionId,
        section,
        module: moduleNumber,
        number,
        category,
        incomplete: category === BROKEN || !complete,
        issues: source.issues ?? record?.issues ?? [],
        printedKey: String(teacher.key_answer ?? ""),
        question,
      });
    }
  }
  const modules = MODULE_ORDER.map(([section, moduleNumber]) => ({
    section,
    module: moduleNumber,
    minutes: MINUTES[section],
    questions: found
      .filter((q) => q.section === section && q.module === moduleNumber)
      .sort((a, b) => a.number - b.number),
  })).filter((m) => m.questions.length > 0);
  return { examId, version: path.basename(version), modules };
}

/** original.png bytes of one question (dev and localhost only, checked by the route). */
export async function originalFile(examId: string, questionId: string, dir = examPipelineDir()) {
  const folder = await questionDir(examId, questionId, dir);
  if (!folder) return null;
  const { readFile } = await import("node:fs/promises");
  try {
    return new Uint8Array(await readFile(path.join(folder, "original.png")));
  } catch {
    return null;
  }
}
