#!/usr/bin/env tsx
/*
 * Load generated questions into the question bank (Generator stream, overnight build 2026-11-22).
 *
 *   # Math: generate and load up to N new questions per skill
 *   npx tsx scripts/generator/load.ts --target local --math --skills all --per-skill 50 --batch gen-math-test
 *   # or bring every Math skill up to 900 stored generated questions
 *   npx tsx scripts/generator/load.ts --target production --math --skills all --top-up-to 900 --batch gen-math-r2
 *   # Reading and Writing: load checked items from the workflow's output (JSON Lines)
 *   npx tsx scripts/generator/load.ts --target production --rw-file out/rw.jsonl --batch gen-rw-1
 *   # Undo a batch (questions nobody has answered are deleted; answered ones are hidden)
 *   npx tsx scripts/generator/load.ts --target production --remove-batch gen-math-1
 *
 * --target local writes to the overnight local database (Docker); --target production writes
 * to the live bank with the main folder's .env.local (the founder approved live writes tonight).
 * --dry-run builds and checks everything and writes nothing.
 *
 * Before any write it backs up: the full rows of every generated question already stored, the
 * table counts, and the whole batch about to be written (with the ids it will use), in
 * /Users/zakariabennis/Karman-Prep-wt/generator-backups/<batch>/. Questions go in chunks; each
 * chunk is read back, sealed (catalogQuestionPayloadHash of the stored rows), given its evidence
 * row and its 72-skill binding, then every question of the chunk is run through the same gate the
 * student pools use (buildCatalogDeliverySnapshot). A chunk that fails part way is deleted.
 * Generated questions always go to the practice pool, never an exam pool.
 * --max-db-mb (default 400 for production) stops the run when the database grows past it.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildItem, isItem } from "@/lib/generator/math/core/build";
import { templatesFor } from "@/lib/generator/math/registry";
import { HIDE, insertQuestions, withIds } from "@/lib/generator/persist";
import {
  batchManifestSha,
  fingerprint,
  fromMathItem,
  rowsFor,
  type StorableQuestion,
} from "@/lib/generator/store";
import { SKILLS72 } from "@/lib/skills/ids72";

const BACKUP_ROOT = "/Users/zakariabennis/Karman-Prep-wt/generator-backups";
const LOCAL_ENV = "/Users/zakariabennis/Karman-Prep-wt/overnight.env.local";
const CHUNK = 200;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const arg = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function client(target: string): SupabaseClient {
  const env =
    target === "production"
      ? readEnv(join(process.cwd(), ".env.local"))
      : target === "local"
        ? readEnv(LOCAL_ENV)
        : null;
  if (!env) throw new Error("--target must be local or production");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service key missing");
  if (target === "local" && !/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error("the local env file does not point at the local database");
  }
  if (target === "production" && /127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(".env.local points at a local database, not production");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Database size in MB, from Postgres itself (local) or the Supabase CLI (production). */
function dbSizeMb(target: string): number | null {
  try {
    if (target === "local") {
      const out = execFileSync(
        "docker",
        [
          "exec",
          "supabase_db_karman-local",
          "psql",
          "-U",
          "postgres",
          "-At",
          "-c",
          "select pg_database_size('postgres')",
        ],
        { encoding: "utf8", timeout: 30_000 }
      );
      return Math.round(Number(out.trim()) / 1048576);
    }
    const out = execFileSync("npx", ["supabase", "inspect", "db", "db-stats", "--linked"], {
      encoding: "utf8",
      timeout: 120_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = out.match(/postgres\s*\|\s*([\d.]+)\s*(kB|MB|GB)/);
    if (!m) return null;
    const v = Number(m[1]);
    return Math.round(m[2] === "GB" ? v * 1024 : m[2] === "kB" ? v / 1024 : v);
  } catch {
    return null;
  }
}

async function selectAll<T extends { id: string }>(
  db: SupabaseClient,
  table: string,
  columns: string,
  eq?: [string, string]
): Promise<T[]> {
  const rows: T[] = [];
  let last: string | null = null;
  let size = 500;
  for (;;) {
    let q = db.from(table).select(columns).order("id", { ascending: true }).limit(size);
    if (eq) q = q.eq(eq[0], eq[1]);
    if (last) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) {
      if (size <= 25) throw new Error(`${table}: ${error.message}`);
      size = Math.floor(size / 2);
      continue;
    }
    const page = (data ?? []) as unknown as T[];
    rows.push(...page);
    if (page.length < size) break;
    last = page[page.length - 1].id;
  }
  return rows;
}

type StoredGenerated = {
  id: string;
  generator: { stable_id?: string; template?: string; seed?: number; batch?: string };
};

async function existingState(db: SupabaseClient) {
  const generated = await selectAll<
    StoredGenerated & {
      question_text: string;
      answer_choices: { choice_text: string; letter: string }[];
    }
  >(db, "quiz_questions", "id, generator, question_text, answer_choices(choice_text, letter)", [
    "origin",
    "generated",
  ]);
  const stable = new Set<string>();
  const prints = new Set<string>();
  const maxSeed = new Map<string, number>();
  const perSkill = new Map<string, number>();
  for (const row of generated) {
    if (row.generator?.stable_id) stable.add(row.generator.stable_id);
    const t = row.generator?.template;
    const s = row.generator?.seed;
    if (t && typeof s === "number") maxSeed.set(t, Math.max(maxSeed.get(t) ?? 0, s));
    const k = (row.generator as { skill72?: string })?.skill72;
    if (k) perSkill.set(k, (perSkill.get(k) ?? 0) + 1);
    prints.add(
      fingerprint({
        questionText: row.question_text,
        choices: row.answer_choices.map((c) => ({
          letter: c.letter as "A",
          text: c.choice_text,
          correct: false,
        })),
      })
    );
  }
  return { generated, stable, prints, maxSeed, perSkill };
}

async function originalPrints(db: SupabaseClient): Promise<Set<string>> {
  const rows = await selectAll<{
    id: string;
    question_text: string;
    answer_choices: { choice_text: string; letter: string }[];
  }>(db, "quiz_questions", "id, question_text, answer_choices(choice_text, letter)", [
    "origin",
    "original",
  ]);
  return new Set(
    rows.map((r) =>
      fingerprint({
        questionText: r.question_text,
        choices: r.answer_choices.map((c) => ({
          letter: c.letter as "A",
          text: c.choice_text,
          correct: false,
        })),
      })
    )
  );
}

function mathQuestions(
  skills: string[],
  perSkill: number | ((skill: string) => number),
  seen: { stable: Set<string>; prints: Set<string>; maxSeed: Map<string, number> },
  originals: Set<string>
): { questions: StorableQuestion[]; perSkillCount: Record<string, number>; failures: number } {
  const questions: StorableQuestion[] = [];
  const perSkillCount: Record<string, number> = {};
  let failures = 0;
  for (const skill of skills) {
    const templates = templatesFor(skill);
    perSkillCount[skill] = 0;
    if (!templates.length) continue;
    const nextSeed = new Map(templates.map((t) => [t.id, (seen.maxSeed.get(t.id) ?? 0) + 1]));
    const misses = new Map(templates.map((t) => [t.id, 0]));
    let made = 0;
    let index = 0;
    const goal = typeof perSkill === "number" ? perSkill : perSkill(skill);
    while (made < goal) {
      const live = templates.filter((t) => (misses.get(t.id) ?? 0) < 200);
      if (!live.length) break;
      const t = live[index++ % live.length];
      const seed = nextSeed.get(t.id)!;
      nextSeed.set(t.id, seed + 1);
      const result = buildItem(t, seed);
      if (!isItem(result)) {
        failures++;
        misses.set(t.id, (misses.get(t.id) ?? 0) + 1);
        continue;
      }
      const q = fromMathItem(result);
      const print = fingerprint(q);
      if (seen.stable.has(q.stableId) || seen.prints.has(print) || originals.has(print)) {
        misses.set(t.id, (misses.get(t.id) ?? 0) + 1);
        continue;
      }
      seen.stable.add(q.stableId);
      seen.prints.add(print);
      questions.push(q);
      made++;
    }
    perSkillCount[skill] = made;
  }
  return { questions, perSkillCount, failures };
}

function rwQuestions(
  file: string,
  seen: { stable: Set<string>; prints: Set<string> },
  originals: Set<string>
) {
  const questions: StorableQuestion[] = [];
  let skipped = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const q = JSON.parse(line) as StorableQuestion;
    const print = fingerprint(q);
    if (
      q.kind !== "rw-helper" ||
      seen.stable.has(q.stableId) ||
      seen.prints.has(print) ||
      originals.has(print)
    ) {
      skipped++;
      continue;
    }
    seen.stable.add(q.stableId);
    seen.prints.add(print);
    questions.push(q);
  }
  return { questions, skipped };
}

async function removeBatch(db: SupabaseClient, batch: string, dryRun: boolean) {
  const rows = await selectAll<{ id: string }>(db, "quiz_questions", "id", [
    "generator->>batch",
    batch,
  ]);
  console.log(`batch ${batch}: ${rows.length} questions`);
  if (dryRun || !rows.length) return;
  let deleted = 0;
  let hidden = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const ids = rows.slice(i, i + CHUNK).map((r) => r.id);
    const { error } = await db.from("quiz_questions").delete().in("id", ids);
    if (!error) {
      deleted += ids.length;
      continue;
    }
    // Answered questions cannot be deleted (their answers point at them): hide them instead.
    for (const id of ids) {
      const one = await db.from("quiz_questions").delete().eq("id", id);
      if (one.error) {
        await db.from("quiz_questions").update(HIDE).eq("id", id);
        hidden++;
      } else deleted++;
    }
  }
  console.log(`deleted ${deleted}, hidden ${hidden}`);
}

async function main() {
  const target = arg("target");
  if (!target) throw new Error("--target local|production is required");
  const db = client(target);
  const dryRun = flag("dry-run");

  const removing = arg("remove-batch");
  if (removing) return removeBatch(db, removing, dryRun);

  const batch = arg("batch");
  if (!batch || !/^[a-z0-9-]{3,60}$/.test(batch))
    throw new Error("--batch name (a-z, 0-9, dashes) is required");
  const maxDb = Number(arg("max-db-mb", target === "production" ? "400" : "100000"));

  const probe = await db.from("quiz_questions").select("id, origin, generator").limit(1);
  if (probe.error) throw new Error(`origin/generator columns missing: ${probe.error.message}`);
  const probe72 = await db.from("question_skills72").select("question_id").limit(1);
  if (probe72.error) throw new Error(`question_skills72 missing: ${probe72.error.message}`);

  console.log("reading what is already stored ...");
  const seen = await existingState(db);
  const originals = await originalPrints(db);
  console.log(
    `stored: ${seen.generated.length} generated, ${originals.size} original fingerprints`
  );

  let questions: StorableQuestion[] = [];
  if (flag("math")) {
    const list = arg("skills", "all")!;
    const skills =
      list === "all"
        ? SKILLS72.filter((s) => s.section === "Math").map((s) => s.id)
        : list.split(",").map((s) => s.trim());
    // --top-up-to N: bring every skill up to N stored generated questions; else add --per-skill each.
    const topUp = arg("top-up-to");
    const perSkill = topUp
      ? (skill: string) => Math.max(0, Number(topUp) - (seen.perSkill.get(skill) ?? 0))
      : Number(arg("per-skill", "10"));
    const made = mathQuestions(skills, perSkill, seen, originals);
    questions = made.questions;
    console.log(
      `built ${questions.length} Math questions (${made.failures} seeds refused by the checks)`
    );
    console.log(JSON.stringify(made.perSkillCount));
  } else if (arg("rw-file")) {
    const made = rwQuestions(arg("rw-file")!, seen, originals);
    questions = made.questions;
    console.log(
      `read ${questions.length} Reading and Writing questions (${made.skipped} duplicates or invalid skipped)`
    );
  } else {
    throw new Error("--math or --rw-file is required");
  }
  if (!questions.length) return console.log("nothing to load");

  const before = dbSizeMb(target);
  console.log(`database size before: ${before ?? "unknown"} MB (cap ${maxDb} MB)`);
  if (before !== null && before >= maxDb) throw new Error("database is already at the cap");

  const planned = questions.map(withIds);
  const manifest = batchManifestSha(batch, questions);
  const dir = join(BACKUP_ROOT, batch);
  if (!dryRun) {
    if (existsSync(join(dir, "batch.jsonl")))
      throw new Error(`batch ${batch} already has a backup folder; use a new name`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "existing-generated.jsonl"),
      seen.generated.map((r) => JSON.stringify(r)).join("\n") + "\n"
    );
    writeFileSync(
      join(dir, "batch.jsonl"),
      planned.map((p) => JSON.stringify(p)).join("\n") + "\n"
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify(
        {
          batch,
          target,
          manifest,
          questions: planned.length,
          db_mb_before: before,
          at: new Date().toISOString(),
        },
        null,
        2
      )
    );
    console.log(`backup written to ${dir}`);
  } else {
    console.log("dry run: nothing written");
    return;
  }

  let admitted = 0;
  const hiddenAll: string[] = [];
  const perSkill: Record<string, number> = {};
  for (let i = 0; i < planned.length; i += CHUNK) {
    const chunk = planned.slice(i, i + CHUNK);
    for (let attempt = 1; ; attempt++) {
      try {
        const result = await insertQuestions(db, chunk, batch, manifest);
        admitted += result.admitted;
        hiddenAll.push(...result.hidden);
        for (const { q, ids } of chunk) {
          if (!result.hidden.includes(ids.question))
            perSkill[q.skill72] = (perSkill[q.skill72] ?? 0) + 1;
        }
        appendFileSync(
          join(dir, "written.log"),
          `${new Date().toISOString()} chunk ${i / CHUNK}: ${result.admitted} live, ${result.hidden.length} hidden\n`
        );
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appendFileSync(
          join(dir, "written.log"),
          `${new Date().toISOString()} chunk ${i / CHUNK} attempt ${attempt} failed: ${message}\n`
        );
        if (attempt >= 3) throw new Error(`chunk ${i / CHUNK} failed three times: ${message}`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    if ((i / CHUNK) % 15 === 14) {
      const size = dbSizeMb(target);
      console.log(`  ${admitted} live so far; database ${size ?? "?"} MB`);
      if (size !== null && size >= maxDb) {
        console.log(`stopping: the database reached the ${maxDb} MB cap`);
        break;
      }
    }
  }
  const after = dbSizeMb(target);
  const summary = {
    batch,
    target,
    admitted,
    hidden: hiddenAll.length,
    perSkill,
    db_mb_before: before,
    db_mb_after: after,
  };
  writeFileSync(
    join(dir, "result.json"),
    JSON.stringify({ ...summary, hiddenIds: hiddenAll }, null, 2)
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
