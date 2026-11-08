// ============================================================
// Admin question bank: read-only data helpers for /admin/bank.
// Reads quiz_questions, answer_choices and answer_key_entries and
// never writes to them; the bank pages only write
// question_import_flags (src/app/admin/bank/actions.ts).
// The catalog skill is the approved tag stored in
// answer_key_entries.raw_model_response: approved_tags, or
// evidence.approved_tags for generated questions.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Tone } from "@/components/admin/workbench";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { createAdminClient } from "@/lib/supabase/server";

// ── Flags ────────────────────────────────────────────────────

const FLAG_REASON_LABELS = {
  wrong_answer: "Wrong answer",
  typo: "Typo",
  figure: "Figure problem",
  explanation: "Explanation problem",
  duplicate: "Duplicate",
  skill_tag: "Wrong skill tag",
  difficulty: "Wrong difficulty",
  other: "Something else",
} as const;
export type FlagReason = keyof typeof FLAG_REASON_LABELS;
const FLAG_REASON_VALUES = Object.keys(FLAG_REASON_LABELS) as [FlagReason, ...FlagReason[]];

export const FLAG_REASONS = FLAG_REASON_VALUES.map((value) => ({
  value,
  label: FLAG_REASON_LABELS[value],
}));

export function flagReasonLabel(reason: string): string {
  return (FLAG_REASON_LABELS as Record<string, string>)[reason] ?? humanize(reason);
}

export const flagInputSchema = z.object({
  questionId: z.guid({ error: "That question id is not valid." }),
  reason: z.enum(FLAG_REASON_VALUES, { error: "Pick a reason." }),
  note: z
    .string()
    .trim()
    .max(2000, { error: "Keep the note under 2,000 characters." })
    .nullish()
    .transform((note) => note || null),
});

export const resolveFlagInputSchema = z.object({
  flagId: z.guid({ error: "That flag id is not valid." }),
  questionId: z.guid({ error: "That question id is not valid." }),
});

// ── Labels and small pure helpers ────────────────────────────

const SKILL_BY_ID = new Map(CATALOG_SKILLS.map((skill) => [skill.id, skill]));
const DOMAIN_LABELS = new Map(SKILL_DOMAINS.map((domain) => [domain.id, domain.label]));

export function humanize(value: string): string {
  const text = value.replace(/_/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : value;
}

export function domainLabel(id: string | null): string {
  return id ? (DOMAIN_LABELS.get(id) ?? humanize(id)) : "No domain";
}

export function skillLabel(id: string | null): string {
  return id ? (SKILL_BY_ID.get(id)?.label ?? id) : "No skill tag";
}

export const shortId = (id: string) => id.slice(0, 8);

/** Core is difficulty 1 to 5, mastery is 6 and 7. Anything else is unrated. */
export function difficultyBand(level: number | null): "core" | "mastery" | null {
  if (level === null || !Number.isInteger(level)) return null;
  if (level >= 1 && level <= 5) return "core";
  return level === 6 || level === 7 ? "mastery" : null;
}

export function publishTone(status: string | null): Tone {
  if (status === "publish_ready") return "ok";
  if (status?.startsWith("blocked")) return "fail";
  if (status === "needs_human_review" || status === "duplicate_detected") return "warn";
  return "neutral";
}

// ── Search planning ──────────────────────────────────────────

export const SEARCH_LIMIT = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type IdRange = { lo: string; hi: string };

/** The smallest and largest ids that start with a hex prefix (uuids sort by their hex). */
export function uuidPrefixRange(prefix: string): IdRange {
  const hex = prefix.replace(/-/g, "").toLowerCase().slice(0, 32);
  const format = (h: string) =>
    `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  return { lo: format(hex.padEnd(32, "0")), hi: format(hex.padEnd(32, "f")) };
}

/** A full id finds one question; 4+ hex characters also try the id prefix; text searches the stem. */
export function planSearch(raw: string): {
  id: string | null;
  range: IdRange | null;
  text: string | null;
} {
  const q = raw.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!q) return { id: null, range: null, text: null };
  if (UUID_RE.test(q)) return { id: q.toLowerCase(), range: null, text: null };
  const hex = q.replace(/-/g, "");
  const range =
    /^[0-9a-f-]+$/i.test(q) && /^[0-9a-f]{4,32}$/i.test(hex) ? uuidPrefixRange(hex) : null;
  const text = q.replace(/\*/g, "").length >= 2 ? q : null;
  return { id: null, range, text };
}

/** ILIKE pattern for a literal substring. PostgREST reads * as a wildcard, so it is dropped. */
export function likePattern(text: string): string {
  return `%${text.replace(/\*/g, "").replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// ── Counting ─────────────────────────────────────────────────

export interface BandCount {
  core: number;
  mastery: number;
  unrated: number;
}
export interface DomainCount extends BandCount {
  id: string | null;
  label: string;
}
export interface SkillCount extends DomainCount {
  domainLabel: string;
}
export interface CountRow {
  domain: string | null;
  level: number | null;
  skillId: string | null;
  archived: boolean;
}

const zero = (): BandCount => ({ core: 0, mastery: 0, unrated: 0 });
const sum = (c: BandCount) => c.core + c.mastery + c.unrated;
const addBand = (target: BandCount, level: number | null) => {
  target[difficultyBand(level) ?? "unrated"] += 1;
};

/** Counts questions that are not archived, by domain and by skill, split core / mastery. */
export function summarizeBank(rows: CountRow[]) {
  const totals = zero();
  const domains = new Map<string | null, DomainCount>(
    SKILL_DOMAINS.map((d) => [d.id, { id: d.id, label: d.label, ...zero() }])
  );
  const skills = new Map<string | null, SkillCount>(
    CATALOG_SKILLS.map((s) => [
      s.id,
      { id: s.id, label: s.label, domainLabel: s.domainLabel, ...zero() },
    ])
  );
  let archived = 0;
  for (const { domain, level, skillId, ...row } of rows) {
    if (row.archived) {
      archived += 1;
      continue;
    }
    addBand(totals, level);
    if (!domains.has(domain))
      domains.set(domain, { id: domain, label: domainLabel(domain), ...zero() });
    addBand(domains.get(domain)!, level);
    if (!skills.has(skillId)) {
      const group = skillId ? "Unknown skill id" : "—";
      skills.set(skillId, {
        id: skillId,
        label: skillLabel(skillId),
        domainLabel: group,
        ...zero(),
      });
    }
    addBand(skills.get(skillId)!, level);
  }
  // Keep the untagged row last so the catalog order stays readable.
  const untagged = skills.get(null);
  skills.delete(null);
  return {
    ...totals,
    total: sum(totals),
    archived,
    untagged: untagged ? sum(untagged) : 0,
    domains: [...domains.values()],
    skills: untagged ? [...skills.values(), untagged] : [...skills.values()],
  };
}

/** partial is true when fewer rows came back than the tables hold. */
export type BankSummary = ReturnType<typeof summarizeBank> & { partial: boolean };

// ── Database reads ───────────────────────────────────────────

type Row = Record<string, unknown>;
const PAGE_SIZE = 1000;
const TAG_SELECT =
  "question_id, tag:raw_model_response->approved_tags->>catalog_skill_id, generated_tag:raw_model_response->evidence->approved_tags->>catalog_skill_id";

const db = () => createAdminClient() as unknown as SupabaseClient;

function asRows(data: unknown): Row[] {
  return Array.isArray(data)
    ? data.filter((row): row is Row => !!row && typeof row === "object")
    : [];
}

function str(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(row: Row, key: string): number | null {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function countRows(client: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`Could not count ${table}.`);
  return count ?? 0;
}

/** Reads every row in parallel pages of 1000 (the API's per-request cap). */
async function readAll(client: SupabaseClient, table: string, columns: string, total: number) {
  const pages = Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i * PAGE_SIZE);
  const results = await Promise.all(
    pages.map(async (from) => {
      const { data, error } = await client
        .from(table)
        .select(columns)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Could not read ${table}.`);
      return asRows(data);
    })
  );
  return results.flat();
}

function tagMap(rows: Row[]): Map<string, string> {
  const tags = new Map<string, string>();
  for (const row of rows) {
    const questionId = str(row, "question_id");
    const tag = str(row, "tag") ?? str(row, "generated_tag");
    if (questionId && tag && !tags.has(questionId)) tags.set(questionId, tag);
  }
  return tags;
}

async function loadTags(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await client
    .from("answer_key_entries")
    .select(TAG_SELECT)
    .in("question_id", ids);
  if (error) throw new Error("Could not read skill tags.");
  return tagMap(asRows(data));
}

export async function loadBankSummary(): Promise<BankSummary> {
  const client = db();
  const [questionTotal, keyTotal] = await Promise.all([
    countRows(client, "quiz_questions"),
    countRows(client, "answer_key_entries"),
  ]);
  const [questions, keys] = await Promise.all([
    readAll(client, "quiz_questions", "id, domain, difficulty_level, archived_at", questionTotal),
    readAll(client, "answer_key_entries", TAG_SELECT, keyTotal),
  ]);
  const tags = tagMap(keys);
  const rows = questions.map((row) => ({
    domain: str(row, "domain"),
    level: num(row, "difficulty_level"),
    skillId: tags.get(str(row, "id") ?? "") ?? null,
    archived: str(row, "archived_at") !== null,
  }));
  const partial = questions.length < questionTotal || keys.length < keyTotal;
  return { ...summarizeBank(rows), partial };
}

const SEARCH_COLUMNS = "id, question_text, domain, difficulty_level, publish_status, archived_at";

export async function searchBank(raw: string) {
  const plan = planSearch(raw);
  const client = db();
  const base = () => client.from("quiz_questions").select(SEARCH_COLUMNS);
  const queries: Array<PromiseLike<{ data: unknown; error: unknown }>> = [];
  if (plan.id) queries.push(base().eq("id", plan.id).limit(1));
  if (plan.range) {
    const { lo, hi } = plan.range;
    queries.push(
      base()
        .gte("id", lo)
        .lte("id", hi)
        .order("id")
        .limit(SEARCH_LIMIT + 1)
    );
  }
  if (plan.text) {
    const pattern = likePattern(plan.text);
    queries.push(
      base()
        .ilike("question_text", pattern)
        .order("id")
        .limit(SEARCH_LIMIT + 1)
    );
  }
  const rows = new Map<string, Row>();
  for (const result of await Promise.all(queries)) {
    if (result.error) throw new Error("Search failed.");
    for (const row of asRows(result.data)) {
      const id = str(row, "id");
      if (id && !rows.has(id)) rows.set(id, row);
    }
  }
  const page = [...rows.entries()].slice(0, SEARCH_LIMIT);
  const tags = await loadTags(
    client,
    page.map(([id]) => id)
  );
  const hits = page.map(([id, row]) => {
    const stem = (str(row, "question_text") ?? "").replace(/\s+/g, " ").trim();
    return {
      id,
      stem: stem.length > 140 ? `${stem.slice(0, 139)}…` : stem,
      domain: str(row, "domain"),
      skillId: tags.get(id) ?? null,
      level: num(row, "difficulty_level"),
      publishStatus: str(row, "publish_status"),
      archived: str(row, "archived_at") !== null,
    };
  });
  return { hits, more: rows.size > SEARCH_LIMIT };
}

export type SearchHit = Awaited<ReturnType<typeof searchBank>>["hits"][number];

/** Text fields of one question, keyed by the name the page uses. */
const QUESTION_TEXT = {
  id: "id",
  stem: "question_text",
  passageIntro: "passage_intro",
  passage: "passage",
  passageA: "passage_a",
  passageB: "passage_b",
  questionType: "question_type",
  answerFormat: "answer_format",
  domain: "domain",
  /** quiz_questions.skill_id, shown when it disagrees with the approved tag. */
  rowSkillId: "skill_id",
  correctAnswer: "correct_answer",
  explanation: "explanation_text",
  publishStatus: "publish_status",
  importStatus: "import_status",
  archivedAt: "archived_at",
  answerKeyStatus: "answer_key_status",
  answerCheckStatus: "answer_verification_status",
  figureKind: "figure_kind",
  imageUrl: "image_url",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

const QUESTION_COLUMNS = [
  ...Object.values(QUESTION_TEXT),
  "difficulty_level, is_live, answer_choices(letter, choice_text, is_correct)",
].join(", ");

export type BankQuestion = Record<keyof typeof QUESTION_TEXT, string | null> & {
  id: string;
  level: number | null;
  /** From the approved tags. */
  skillId: string | null;
  isLive: boolean;
  choices: Array<{ letter: string; text: string; isCorrect: boolean }>;
};

export async function getBankQuestion(id: string): Promise<BankQuestion | null> {
  if (!z.guid().safeParse(id).success) return null;
  const client = db();
  const [{ data, error }, tags] = await Promise.all([
    client.from("quiz_questions").select(QUESTION_COLUMNS).eq("id", id).maybeSingle(),
    loadTags(client, [id]),
  ]);
  if (error) throw new Error("Could not read the question.");
  const row = asRows([data])[0];
  if (!row) return null;
  const text = Object.fromEntries(
    Object.entries(QUESTION_TEXT).map(([field, column]) => [field, str(row, column)])
  ) as Record<keyof typeof QUESTION_TEXT, string | null>;
  const choices = asRows(row.answer_choices)
    .map((choice) => ({
      letter: str(choice, "letter") ?? "?",
      text: str(choice, "choice_text") ?? "",
      isCorrect: choice.is_correct === true,
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter));
  return {
    ...text,
    id: text.id ?? id,
    level: num(row, "difficulty_level"),
    skillId: tags.get(id) ?? null,
    isLive: row.is_live === true,
    choices,
  };
}

const FLAG_COLUMNS = "id, question_id, reason, note, status, created_at, resolved_at";

function toFlags(data: unknown) {
  return asRows(data).flatMap((row) => {
    const id = str(row, "id");
    const questionId = str(row, "question_id");
    if (!id || !questionId) return [];
    const reason = str(row, "reason") ?? "other";
    const status = str(row, "status") ?? "open";
    const dates = { createdAt: str(row, "created_at"), resolvedAt: str(row, "resolved_at") };
    return [{ id, questionId, reason, note: str(row, "note"), status, ...dates }];
  });
}

export type ImportFlag = ReturnType<typeof toFlags>[number];

export async function listOpenFlags(limit = 100): Promise<{ flags: ImportFlag[]; total: number }> {
  const { data, error, count } = await db()
    .from("question_import_flags")
    .select(FLAG_COLUMNS, { count: "exact" })
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not read the open flags.");
  return { flags: toFlags(data), total: count ?? 0 };
}

export async function listQuestionFlags(questionId: string): Promise<ImportFlag[]> {
  const { data, error } = await db()
    .from("question_import_flags")
    .select(FLAG_COLUMNS)
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not read the flags for this question.");
  return toFlags(data);
}
