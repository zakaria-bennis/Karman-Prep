// An answer key may restart question numbers in each module. Match only
// explicit source identities; page order and database UUIDs are not evidence.
import { createHash } from "node:crypto";
export function normalizeSection(value) {
  const section = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["reading", "reading_writing", "reading and writing", "rw"].includes(section)) {
    return "reading";
  }
  return section === "math" ? "math" : null;
}

export function normalizeModule(value) {
  const module = String(value ?? "")
    .trim()
    .toUpperCase();
  if (module === "1" || module === "M1" || module === "MODULE 1") return "M1";
  if (module === "2" || module === "M2" || module === "MODULE 2") return "M2";
  return null;
}

function positiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function identityKey(value) {
  const version = String(value.source_version ?? "")
    .trim()
    .toLowerCase();
  const section = normalizeSection(value.source_section ?? value.section);
  const module = normalizeModule(value.source_module ?? value.module ?? value.module_number);
  const number = positiveInteger(value.source_question_number ?? value.question_number);
  const occurrence = positiveInteger(
    value.source_occurrence ?? value.occurrence_index ?? value.occurrence ?? 1
  );
  if (!/^[a-f0-9]{64}$/.test(version) || !section || !module || !number || !occurrence) {
    return null;
  }
  return JSON.stringify([version, section, module, number, occurrence]);
}

/** Stable primary key for a uniquely matched Phase 2 answer-key row.
 * Unmatched/ambiguous entries deliberately do not receive this ID. */
export function answerKeyEntryId(value) {
  const key = identityKey(value);
  if (!key) return null;
  const h = createHash("sha256").update(`phase2-answer-key:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Each key must occur exactly once on both sides. Any missing or
 * duplicate identity stays unmatched, including repeated key rows on retry. */
export function matchAnswerEntries(entries, questions) {
  const questionBuckets = new Map();
  const entryBuckets = new Map();
  for (const q of questions) {
    const key = identityKey(q);
    if (key) questionBuckets.set(key, [...(questionBuckets.get(key) ?? []), q]);
  }
  for (const entry of entries) {
    const key = identityKey(entry);
    if (key) entryBuckets.set(key, [...(entryBuckets.get(key) ?? []), entry]);
  }
  const result = new Map();
  for (const entry of entries) {
    const key = identityKey(entry);
    const candidates = key ? (questionBuckets.get(key) ?? []) : [];
    const repeated = key ? (entryBuckets.get(key) ?? []) : [];
    result.set(entry, candidates.length === 1 && repeated.length === 1 ? candidates[0].id : null);
  }
  return result;
}
