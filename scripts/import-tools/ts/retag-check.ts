#!/usr/bin/env -S npx tsx
// `k qa retag`: check every planned label change with the app's own catalog code and seal it.
// For each row: the live row must be served by the catalog lane now (scope evidence reads,
// payload seal matches, subject/domain/cluster fit the skill); then the changed row
// (question_after over the live columns, raw_after as the new answer key evidence) gets the
// seal catalogQuestionPayloadHash computes for it, and must read as the new skill and still
// fit the catalog lane (subject, domain, cluster, difficulty 1-7).
// Usage: npx tsx scripts/import-tools/ts/retag-check.ts <retag-input.json>
// Input {"rows": [{"row": <full live row with answer_choices>, "question_after": {...},
//        "raw_after": {...}}]}; prints {"rows": [{id, ok, error?, seal_before, seal_after,
//        skill_after, raw_after}]} (raw_after carrying the new seal; a refused row still
//        carries its current seal_before).

import { readFileSync } from "node:fs";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";
import { clusterLabelsForDomain, type SATDomain } from "@/lib/question-bank/taxonomy";
import type { QuizQuestionWithChoices } from "@/types/quiz";

type Obj = Record<string, unknown>;

const root = (raw: Obj): Obj =>
  raw?.kind === "independently_confirmed_generated" ? ((raw.evidence ?? {}) as Obj) : raw;

function fits(q: Obj, raw: Obj) {
  const scope = readCatalogQuestionScope(raw);
  const skill = scope.skill;
  const level = q.difficulty_level;
  const ok =
    q.subject === skill.subject &&
    q.domain === skill.domainId &&
    clusterLabelsForDomain(skill.domainId as SATDomain).includes(String(q.topic_cluster)) &&
    typeof level === "number" &&
    Number.isInteger(level) &&
    level >= 1 &&
    level <= 7;
  return { scope, ok };
}

export function checkOne(item: { row: Obj; question_after: Obj; raw_after: Obj }) {
  const row = item.row;
  const keys = (row.answer_key_entries ?? []) as Obj[];
  if (keys.length !== 1) throw new Error("expected exactly one answer key entry");
  const before = fits(row, keys[0].raw_model_response as Obj);
  const sealBefore = catalogQuestionPayloadHash(row as unknown as QuizQuestionWithChoices);
  if (!before.ok || before.scope.tags.question_payload_sha256 !== sealBefore)
    throw new Error("the live row is not served by the catalog lane now (scope, seal or columns)");
  const after = { ...row, ...item.question_after };
  const sealAfter = catalogQuestionPayloadHash(after as unknown as QuizQuestionWithChoices);
  const raw = JSON.parse(JSON.stringify(item.raw_after)) as Obj;
  const tags = root(raw).approved_tags as Obj;
  tags.question_payload_sha256 = sealAfter;
  const checked = fits(after, raw);
  if (!checked.ok)
    throw new Error("the changed row would not fit the catalog lane for its new skill");
  if (checked.scope.tags.stable_question_id !== before.scope.tags.stable_question_id)
    throw new Error("the stable question id changed");
  return {
    seal_before: sealBefore,
    seal_after: sealAfter,
    skill_after: checked.scope.skill.id,
    raw_after: raw,
  };
}

function main() {
  const [input] = process.argv.slice(2);
  if (!input) throw new Error("usage: retag-check.ts <retag-input.json>");
  const doc = JSON.parse(readFileSync(input, "utf8")) as {
    rows: Array<{ row: Obj; question_after: Obj; raw_after: Obj }>;
  };
  const rows = doc.rows.map((item) => {
    try {
      return { id: item.row.id, ok: true, ...checkOne(item) };
    } catch (error) {
      let sealBefore: string | null = null;
      try {
        sealBefore = catalogQuestionPayloadHash(item.row as unknown as QuizQuestionWithChoices);
      } catch {
        /* the row cannot be sealed at all */
      }
      return {
        id: item.row.id,
        ok: false,
        error: (error as Error).message,
        seal_before: sealBefore,
      };
    }
  });
  process.stdout.write(JSON.stringify({ rows }) + "\n");
}

if (process.argv[1] && /retag-check\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`retag-check: ${(error as Error).message}\n`);
    process.exit(2);
  }
}
