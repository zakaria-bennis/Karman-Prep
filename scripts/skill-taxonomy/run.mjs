// Skill taxonomy + explanation runner.
//
// For each question in bank.jsonl (a read-only export, see export-bank.mjs):
//   1. Blind solve + classify (no answer key shown). Picks one approved skill.
//   2. If the blind answer differs from the key, a second, stronger blind solve.
//      Still different: held for the founder. Figure missing: held, no explanation.
//   3. Explanation written to docs/content/explanation-guide.md, with the key.
//   4. Automatic checks from the guide.
// One result file per question in <out>/run/<id>.json; existing files are skipped,
// so the run resumes. Never writes to the database.
//
// Usage: node run.mjs --ids <file with one id per line> [--concurrency 6] [--explain-model claude-sonnet-5-5]

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const OUT = path.resolve(process.env.SKILL_OUT ?? path.join(repo, "../Karman-Prep/audit-out/skill-taxonomy"));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const CONCURRENCY = Number(args.concurrency ?? 6);
const SOLVE_MODEL = args["solve-model"] ?? "claude-sonnet-5-5";
const CHECK_MODEL = args["check-model"] ?? "claude-opus-5-5";
const EXPLAIN_MODEL = args["explain-model"] ?? "claude-sonnet-5-5";
const RUN_DIR = path.join(OUT, args["run-dir"] ?? "run");
mkdirSync(RUN_DIR, { recursive: true });

// Key from .env.local without printing it.
if (!process.env.ANTHROPIC_API_KEY) {
  const line = readFileSync(path.join(repo, ".env.local"), "utf8").split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="));
  if (line) process.env.ANTHROPIC_API_KEY = line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
}
const client = new Anthropic({ maxRetries: 4 });

const SKILLS = JSON.parse(readFileSync(path.join(repo, "src/data/skills/skills.json"), "utf8")).skills;
const GUIDE = readFileSync(path.join(repo, "docs/content/explanation-guide.md"), "utf8");
const bank = new Map(readFileSync(path.join(OUT, "bank.jsonl"), "utf8").trim().split("\n").map((l) => { const q = JSON.parse(l); return [q.id, q]; }));

// ── Question rendering ─────────────────────────────────────
function questionContent(q) {
  const parts = [];
  if (q.passage_intro) parts.push(`INTRO: ${q.passage_intro}`);
  if (q.passage) parts.push(`PASSAGE:\n${q.passage}`);
  if (q.passage_a) parts.push(`TEXT 1:\n${q.passage_a}`);
  if (q.passage_b) parts.push(`TEXT 2:\n${q.passage_b}`);
  parts.push(`QUESTION:\n${q.question_text}`);
  if (q.figure_table_data) parts.push(`TABLE (JSON):\n${JSON.stringify(q.figure_table_data)}`);
  if (q.figure_chart_data) parts.push(`CHART (JSON):\n${JSON.stringify(q.figure_chart_data)}`);
  if (q.figure_graph_data) parts.push(`GRAPH (JSON):\n${JSON.stringify(q.figure_graph_data)}`);
  if (q.figure_geometry_data) parts.push(`FIGURE (JSON):\n${JSON.stringify(q.figure_geometry_data)}`);
  if (q.figure_svg) parts.push(`FIGURE (SVG):\n${q.figure_svg}`);
  if (q.image_alt) parts.push(`FIGURE DESCRIPTION: ${q.image_alt}`);
  if (q.answer_format === "multiple_choice") {
    parts.push("CHOICES:\n" + q.answer_choices.map((c) => `${c.letter}) ${c.choice_text || (c.choice_table_data ? JSON.stringify(c.choice_table_data) : "")}`).join("\n"));
  } else parts.push("FORMAT: student-produced response (the student types a number).");
  const blocks = [];
  if (q.image_url) blocks.push({ type: "image", source: { type: "url", url: q.image_url } });
  blocks.push({ type: "text", text: parts.join("\n\n") });
  return blocks;
}

// ── Step 1: blind solve + classify ─────────────────────────
function catalogText(subject) {
  return SKILLS.filter((s) => s.subject === subject)
    .map((s) => `${s.id} | ${s.label} | ${s.recognize ?? ""}${s.excludes?.length ? ` | not: ${s.excludes.join("; ")}` : ""}`)
    .join("\n");
}
const CATALOG = { math: catalogText("math"), reading: catalogText("reading") };
const SOLVE_SYSTEM = (subject) => `You solve SAT ${subject === "math" ? "math" : "Reading and Writing"} questions and classify them into a fixed skill list.
You are not given the answer key. Work the question yourself, using SAT-level methods.

Set figure_missing to true only if the question depends on a figure, graph, table or passage text that is not provided to you, so it cannot be answered from what you see. Then give your best guess as the answer.

Pick exactly one skill_id from this list (id | name | how to spot it | what is excluded). Choose by how the question is solved and what it asks for. Math: classify by the decisive method, not the last operation. Reading: the topic in the id is the field of the passage claim (a study of soil naming laws is social studies; a computing award is science).
${CATALOG[subject]}`;

function solveSchema(subject) {
  const ids = SKILLS.filter((s) => s.subject === subject).map((s) => s.id);
  return z.object({
    answer: z.string().describe("A, B, C or D for multiple choice; the number in simplest form otherwise"),
    confidence: z.enum(["high", "medium", "low"]),
    figure_missing: z.boolean(),
    skill_id: z.enum(ids),
    note: z.string().describe("Empty unless something is wrong with the question (broken text, ambiguous, missing piece)"),
  });
}

async function call({ model, effort, system, content, schema, maxTokens = 16000 }) {
  const res = await client.beta.messages.parse({
    model,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: zodOutputFormat(schema) },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error(`refusal: ${res.stop_details?.category ?? "unknown"}`);
  if (!res.parsed_output) throw new Error(`unparsed output (stop: ${res.stop_reason})`);
  return { out: res.parsed_output, usage: { model: res.model, ...res.usage } };
}

// ── Answer comparison ──────────────────────────────────────
const norm = (s) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/^\$|\$$/g, "").replace(/,/g, "");
const asNum = (s) => { const t = norm(s); if (/^-?\d*\.?\d+\/-?\d*\.?\d+$/.test(t)) { const [a, b] = t.split("/"); return +a / +b; } return /^-?\d*\.?\d+$/.test(t) ? +t : null; };
function sameAnswer(a, key) {
  if (norm(a) === norm(key)) return true;
  const options = String(key).split(/\s*(?:,|;|\bor\b|\|)\s*/i).filter(Boolean);
  return options.some((k) => { if (norm(a) === norm(k)) return true; const x = asNum(a), y = asNum(k); return x !== null && y !== null && Math.abs(x - y) <= 1e-3 * Math.max(1, Math.abs(y)); });
}

// ── Step 3: explanation ────────────────────────────────────
const wrongLetters = z.object({ A: z.string().optional(), B: z.string().optional(), C: z.string().optional(), D: z.string().optional() });
const EXPLAIN_SCHEMA = {
  math: z.object({ problem: z.string().nullable(), steps: z.array(z.string()), desmos: z.string().nullable(), wrong_choices: wrongLetters.nullable(), common_slip: z.string().nullable(), takeaway: z.string() }),
  reading: z.object({ problem: z.string().nullable(), evidence: z.string(), reasoning: z.string(), wrong_choices: wrongLetters, takeaway: z.string() }),
  grammar: z.object({ problem: z.string().nullable(), rule: z.string(), test: z.string(), applied: z.string(), wrong_choices: wrongLetters, takeaway: z.string() }),
};
const EXPLAIN_SYSTEM = `You write the student-facing explanation for one SAT question at Karman, following this guide exactly. The guide is the whole job; read it as the rules you must meet.

${GUIDE}`;

function explainContent(q, kind, skill) {
  const keyText = q.answer_format === "multiple_choice"
    ? `${q.key}) ${q.answer_choices.find((c) => c.letter === q.key)?.choice_text ?? ""}`
    : q.key;
  return [...questionContent(q), { type: "text", text: `CORRECT ANSWER: ${keyText}\nDIFFICULTY: ${q.difficulty_level} of 7\nSKILL: ${skill.label} — ${skill.method ?? ""}\nWRITE: the ${kind} schema from the guide.` }];
}

// ── Step 4: automatic checks ───────────────────────────────
const BANNED = /\b(simply|just|obviously|clearly|easy|trivially|of course|note that|it is important to|answer key|verified|blind solve|college board|the model|the solver)\b/i;
function checks(q, kind, e) {
  const issues = [];
  if (e.problem) return [`problem: ${e.problem}`];
  const all = JSON.stringify(e);
  if (BANNED.test(all)) issues.push(`banned word: ${all.match(BANNED)[0]}`);
  if (/\\\(|sqrt\(|²/.test(all)) issues.push("bad math notation");
  const texts = Object.values(e).flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []));
  for (const t of texts) if (typeof t === "string" && (t.replace(/\\\$/g, "").match(/\$/g) || []).length % 2) issues.push("unbalanced $");
  if (e.wrong_choices && q.key in e.wrong_choices && e.wrong_choices[q.key]) issues.push("wrong_choices includes the correct letter");
  if (kind === "math") {
    const last = e.steps.at(-1) ?? "";
    if (q.answer_format === "multiple_choice" && !new RegExp(`\\b${q.key}\\b`).test(last)) issues.push("last step does not name the letter");
    if (e.steps.length > 5) issues.push("more than 5 steps");
    const words = [...e.steps, e.desmos ?? "", e.takeaway].join(" ").split(/\s+/).length;
    const max = q.difficulty_level <= 3 ? 75 : q.difficulty_level <= 5 ? 110 : 150;
    if (words > max) issues.push(`long: ${words} words`);
  } else {
    const source = [q.passage, q.passage_a, q.passage_b, q.question_text, ...q.answer_choices.map((c) => c.choice_text)].join(" ").replace(/<\/?[iu]>/g, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");
    if (kind === "reading") for (const piece of e.evidence.replace(/^["“]|["”]$/g, "").split(/…|\.\.\./)) {
      const p = piece.trim().replace(/^["“]|["”]$/g, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");
      if (p.length > 3 && !source.includes(p)) issues.push(`evidence not found: "${p.slice(0, 50)}"`);
    }
    const n = Object.values(e.wrong_choices).filter(Boolean).length;
    if (n < 3) issues.push(`only ${n} wrong-choice lines`);
  }
  return issues;
}

// ── One question ───────────────────────────────────────────
async function processOne(id) {
  const file = path.join(RUN_DIR, `${id}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const q = bank.get(id);
  if (!q) throw new Error(`unknown id ${id}`);
  const subject = q.subject;
  const usage = [];
  const result = { id, subject, cb_skill: q.cb_skill, key: q.key, difficulty: q.difficulty_level, format: q.answer_format };

  const s1 = await call({ model: SOLVE_MODEL, effort: "medium", system: SOLVE_SYSTEM(subject), content: questionContent(q), schema: solveSchema(subject) });
  usage.push(s1.usage);
  result.solve = s1.out;
  let agrees = sameAnswer(s1.out.answer, q.key);

  if (!agrees && !s1.out.figure_missing) {
    const s2 = await call({ model: CHECK_MODEL, effort: "high", system: SOLVE_SYSTEM(subject), content: questionContent(q), schema: solveSchema(subject) });
    usage.push(s2.usage);
    result.second_solve = s2.out;
    agrees = sameAnswer(s2.out.answer, q.key);
    if (agrees) result.solve.skill_id = s2.out.skill_id;
  }

  result.skill_id = result.solve.skill_id;
  const skill = SKILLS.find((s) => s.id === result.skill_id);
  const kind = skill.kind;
  result.kind = kind;

  if (s1.out.figure_missing && !agrees) result.status = "held_missing_figure";
  else if (!agrees) result.status = "held_key_disagreement";
  else {
    const ex = await call({ model: EXPLAIN_MODEL, effort: "medium", system: EXPLAIN_SYSTEM, content: explainContent(q, kind, skill), schema: EXPLAIN_SCHEMA[kind] });
    usage.push(ex.usage);
    result.explanation = ex.out;
    result.check_issues = checks(q, kind, ex.out);
    result.status = ex.out.problem ? "held_explainer_problem" : result.check_issues.length ? "explained_with_issues" : "explained";
  }
  result.usage = usage;
  writeFileSync(file, JSON.stringify(result, null, 1));
  return result;
}

// ── Pool + progress ────────────────────────────────────────
const ids = readFileSync(args.ids, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
let done = 0, failed = 0;
const progress = () => {
  try {
    const p = JSON.parse(readFileSync(path.join(OUT, "progress.json"), "utf8"));
    const name = args["progress-name"] ?? "Pilot run";
    const ph = p.phases.find((x) => x.name === name) ?? (p.phases.push({ name }), p.phases.at(-1));
    Object.assign(ph, { status: done + failed >= ids.length ? "done" : "active", done: done + failed, total: ids.length, note: failed ? `${failed} failed (will retry on rerun)` : undefined });
    p.updatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    writeFileSync(path.join(OUT, "progress.json"), JSON.stringify(p, null, 2));
  } catch { /* panel is optional */ }
};
const queue = [...ids];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const id = queue.shift();
    try { await processOne(id); done++; } catch (err) { failed++; console.error(id, err?.message ?? err); }
    if ((done + failed) % 3 === 0 || !queue.length) progress();
  }
}));
progress();
console.log(`done ${done}, failed ${failed}`);
