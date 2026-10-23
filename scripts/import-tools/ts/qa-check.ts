#!/usr/bin/env -S npx tsx
// Student QA audit, the checks that need the app's own code (`qa-audit.py static` runs this).
// For each live row of the full QA export it runs the functions the student screen and the
// catalog lane run, and reports what would break or show wrongly:
//   markup    source underline/italic tokens the parsers refuse (shown as literal text), and any
//             other HTML-looking tag or [[x]] token left in a text segment
//   math      every math span MathText would hand to KaTeX, parsed with throwOnError; LaTeX
//             commands, stray $ and \( \) left in plain text
//   figure    figureImportErrors (table, chart, geometry, SVG checks) and isValidChoiceTableData,
//             plus what CatalogQuestion would actually draw for the row's figure columns
//   delivery  the catalog lane (fetchCatalogQuestionPool): scope evidence, payload seal,
//             reviewed numeric answer set; numeric keys parseNumericAnswer accepts
// Usage: npx tsx scripts/import-tools/ts/qa-check.ts <live-full.json> <out.json>
// Writes {"<id>": {"checks": {"<check>": ["detail", ...]}, "figure": {...}}}.

import { readFileSync, writeFileSync } from "node:fs";
import katex from "katex";
import { splitMathText } from "@/components/learn/math-segments";
import { parseSourceUnderlining } from "@/components/learn/source-underlining";
import { parseSourceItalics } from "@/components/learn/source-italics";
import { isValidChoiceTableData } from "@/lib/question-bank/choice-table";
import { figureImportErrors, type ImportFigureFields } from "@/lib/question-bank/import-figure";
import { buildGeometrySvg, type GeometryFigureData } from "@/lib/figures/geometry-svg";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import { parseNumericAnswer } from "@/lib/numeric-answer";
import { clusterLabelsForDomain, type SATDomain } from "@/lib/question-bank/taxonomy";
import type { QuizQuestionWithChoices } from "@/types/quiz";

type Obj = Record<string, unknown>;
export type Findings = Record<string, string[]>;

const READY = new Set(["publish_ready", "publish_ready_with_verified_repair"]);
const MARKUP_TOKEN = /<\/?[A-Za-z][A-Za-z0-9]*(?:\s[^<>]*)?\/?>|\[\[\/?[A-Za-z]+\]\]/g;
const LATEX_IN_TEXT =
  /\\(?:frac|sqrt|left|right|cdot|times|div|le|ge|leq|geq|neq|pi|theta|alpha|beta|text|mathrm|overline|angle|triangle|circ|degree|pm|infty|sum|int|dfrac|tfrac)\b|\^\{|_\{/;
const clip = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n)}…` : s);

function add(f: Findings, check: string, detail: string) {
  (f[check] ??= []).push(detail);
}

/** The text runs MathText shows for one field, exactly as it splits them. */
export function displaySegments(text: string, serializedFunctionLines: boolean) {
  const underline = parseSourceUnderlining(text);
  const out: { kind: "text" | "inline" | "block"; value: string }[] = [];
  const problems: string[] = [];
  const hasU = /\[\[\/?u\]\]|<\/?u>/.test(text);
  if (hasU && underline.length === 1 && !underline[0].underlined)
    problems.push("underline tokens are unmatched, so they show as text");
  underline.forEach((run, index) => {
    const italics = parseSourceItalics(run.text);
    if (/\[\[\/?i\]\]|<\/?i>/.test(run.text) && italics.length === 1 && !italics[0].italic)
      problems.push("italic tokens are unmatched, so they show as text");
    italics.forEach((italicRun, italicIndex) => {
      const segs = splitMathText(
        italicRun.text,
        serializedFunctionLines,
        italicIndex === 0
          ? index === 0 || underline[index - 1].text.endsWith("\n")
          : italics[italicIndex - 1].text.endsWith("\n"),
        italicIndex === italics.length - 1
          ? index === underline.length - 1 || underline[index + 1].text.startsWith("\n")
          : italics[italicIndex + 1].text.startsWith("\n")
      );
      for (const s of segs) {
        const last = out.at(-1);
        // Neighbouring text pieces read as one run (a currency $ is split off on its own).
        if (s.kind === "text" && last?.kind === "text") last.value += s.value;
        else
          out.push(
            s.kind === "text" ? { kind: "text", value: s.value } : { kind: s.kind, value: s.latex }
          );
      }
    });
  });
  return { segments: out, problems };
}

export function checkText(f: Findings, field: string, text: string, serialized: boolean) {
  if (!text) return;
  const { segments, problems } = displaySegments(text, serialized);
  for (const p of problems) add(f, "markup_unmatched", `${field}: ${p}`);
  for (const s of segments) {
    if (s.kind === "text") {
      for (const m of s.value.matchAll(MARKUP_TOKEN)) add(f, "markup_as_text", `${field}: ${m[0]}`);
      const latex = s.value.match(LATEX_IN_TEXT);
      if (latex)
        add(
          f,
          "latex_as_text",
          `${field}: …${clip(s.value.slice(Math.max(0, (latex.index ?? 0) - 20)), 60)}`
        );
      // A $ that is not a currency amount ($5, $1.50) is a math delimiter with no partner.
      for (const m of s.value.matchAll(/(?<!\\)\$(?!\s*[\d.,])/g))
        add(
          f,
          "math_delimiter_unbalanced",
          `${field}: …${clip(s.value.slice(Math.max(0, m.index! - 20), m.index! + 20), 50)}`
        );
      if (/\\\(|\\\)|\\\[|\\\]/.test(s.value))
        add(f, "math_delimiter_unbalanced", `${field}: lone \\( \\) or \\[ \\]`);
    } else {
      // Prose inside a math span (a $ amount paired with a later $ amount) is set as run-together
      // italic letters that do not wrap.
      const prose = s.value.replace(/\\(?:text|mathrm|textrm|operatorname)\{[^}]*\}/g, "");
      if (/[A-Za-z]{2,}[\s.,]+[A-Za-z]{2,}[\s.,]+[A-Za-z]{2,}/.test(prose))
        add(f, "prose_in_math", `${field}: $${clip(s.value, 70)}$`);
      try {
        katex.renderToString(s.value, {
          throwOnError: true,
          displayMode: s.kind === "block",
          output: "htmlAndMathml",
        });
      } catch (e) {
        add(
          f,
          "katex_error",
          `${field}: ${clip(s.value, 60)} -> ${clip(String((e as Error).message), 100)}`
        );
      }
    }
  }
}

/** What CatalogQuestion draws for this row's figure columns (null = nothing). */
export function renderedFigure(q: Obj): string | null {
  const kind = q.figure_kind;
  if (kind === "table" && q.figure_table_data) return "table";
  if (kind === "chart" && q.figure_chart_data) return "chart";
  if (kind === "geometric" && q.figure_geometry_data) {
    try {
      if (buildGeometrySvg(q.figure_geometry_data as GeometryFigureData).renderable)
        return "geometry";
    } catch {
      /* falls through: not renderable */
    }
  }
  const svg = kind === "image" && !q.image_url && typeof q.figure_svg === "string" && q.figure_svg;
  if (q.image_url) return "image_url";
  if (svg) return "svg";
  return null;
}

export function checkFigure(f: Findings, q: Obj) {
  const kind = (q.figure_kind ?? null) as string | null;
  const known = kind === null || ["table", "chart", "geometric", "image"].includes(kind);
  if (!known) add(f, "figure_invalid", `figure_kind ${kind} is not one the quiz draws`);
  else {
    for (const e of figureImportErrors({
      figure_kind: kind as ImportFigureFields["figure_kind"],
      figure_table_data: (q.figure_table_data ?? null) as ImportFigureFields["figure_table_data"],
      figure_chart_data: (q.figure_chart_data ?? null) as ImportFigureFields["figure_chart_data"],
      figure_geometry_data: (q.figure_geometry_data ??
        null) as ImportFigureFields["figure_geometry_data"],
      figure_svg: (q.figure_svg ?? null) as string | null,
      image_url: (q.image_url ?? null) as string | null,
      image_alt: typeof q.image_alt === "string" ? q.image_alt : undefined,
    }))
      add(f, "figure_invalid", e);
  }
  for (const c of (q.answer_choices ?? []) as Obj[])
    if (c.choice_table_data != null && !isValidChoiceTableData(c.choice_table_data))
      add(f, "choice_table_invalid", `choice ${String(c.letter)}: not a table the quiz can draw`);
  const drawn = renderedFigure(q);
  if (q.figure_graph_data != null)
    add(f, "figure_not_drawn", "figure_graph_data is set; no student screen draws it");
  if (kind && !drawn) add(f, "figure_not_drawn", `figure_kind ${kind} but nothing is drawn`);
  if (q.figure_svg && q.image_url) add(f, "figure_not_drawn", "figure_svg is hidden by image_url");
  return drawn;
}

/** The catalog lane for one live row: what fetchCatalogQuestionPool would do with it. */
export function checkDelivery(f: Findings, q: Obj): string {
  const entries = ((q.answer_key_entries ?? []) as Obj[]).filter((k) => {
    const raw = k.raw_model_response as Obj | null;
    const ev = raw && typeof raw === "object" ? ((raw.evidence as Obj) ?? null) : null;
    const tag = (r: Obj | null) => (r?.approved_tags as Obj | undefined)?.catalog_skill_id;
    return Boolean(tag(raw) ?? tag(ev));
  });
  if (
    q.answer_format === "numeric_entry" &&
    parseNumericAnswer(String(q.correct_answer ?? "")) === null
  )
    add(f, "numeric_key_unparseable", `correct_answer ${clip(String(q.correct_answer), 40)}`);
  if (!entries.length) return "no_catalog_tag";
  if (entries.length > 1) {
    add(
      f,
      "delivery_breaks_skill",
      "two answer-key entries tag this question; the skill pool throws"
    );
    return "breaks";
  }
  const raw = entries[0].raw_model_response;
  let scope: ReturnType<typeof readCatalogQuestionScope>;
  try {
    scope = readCatalogQuestionScope(raw);
  } catch (e) {
    add(f, "delivery_breaks_skill", `scope evidence refused: ${(e as Error).message}`);
    return "breaks";
  }
  const skill = scope.skill;
  const inPool =
    scope.publicationAllowed &&
    READY.has(String(q.publish_status)) &&
    q.subject === skill.subject &&
    q.domain === skill.domainId &&
    clusterLabelsForDomain(skill.domainId as SATDomain).includes(String(q.topic_cluster));
  if (!inPool) return scope.publicationAllowed ? "outside_pool" : "publication_not_allowed";
  const row = q as unknown as QuizQuestionWithChoices;
  if (scope.tags.question_payload_sha256 !== catalogQuestionPayloadHash(row)) {
    add(f, "delivery_breaks_skill", "payload seal differs from the row; the skill pool throws");
    return "breaks";
  }
  if (q.answer_format === "numeric_entry") {
    try {
      reviewedNumericAnswers(row, numericAnswerSetFromEvidence(raw));
    } catch (e) {
      add(f, "delivery_breaks_skill", `numeric answer set: ${(e as Error).message}`);
      return "breaks";
    }
  }
  return "served";
}

export function checkRow(q: Obj) {
  const f: Findings = {};
  const math = q.subject === "math";
  for (const field of ["passage_intro", "passage", "passage_a", "passage_b"])
    checkText(f, field, String(q[field] ?? ""), false);
  checkText(f, "question_text", String(q.question_text ?? ""), math);
  for (const c of (q.answer_choices ?? []) as Obj[])
    checkText(f, `choice ${String(c.letter)}`, String(c.choice_text ?? ""), math);
  const figure = checkFigure(f, q);
  const delivery = checkDelivery(f, q);
  const choiceTables = ((q.answer_choices ?? []) as Obj[]).filter(
    (c) => c.choice_table_data != null
  ).length;
  return { checks: f, figure, choice_tables: choiceTables, delivery };
}

if (/qa-check\.ts$/.test(process.argv[1] ?? "")) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: qa-check.ts <live-full.json> <out.json>");
    process.exit(2);
  }
  const doc = JSON.parse(readFileSync(input, "utf8")) as { rows: Obj[] };
  const result: Record<string, ReturnType<typeof checkRow>> = {};
  for (const row of doc.rows) {
    try {
      result[String(row.id)] = checkRow(row);
    } catch (e) {
      result[String(row.id)] = {
        checks: { checker_crashed: [String((e as Error).message)] },
        figure: null,
        choice_tables: 0,
        delivery: "unknown",
      };
    }
  }
  writeFileSync(output, JSON.stringify(result));
  console.log(JSON.stringify({ rows: doc.rows.length }));
}
