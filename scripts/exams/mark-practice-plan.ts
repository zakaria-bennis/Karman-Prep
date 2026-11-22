/*
 * Marks the Practice plan's fixed set of 5,000 questions (founder, 2026-11-13: drawn from levels 1 to 6,
 * never an exam question; Pro gets everything else) in quiz_questions.practice_plan.
 *
 *   npx tsx --env-file=.env.local scripts/exams/mark-practice-plan.ts            # choose and report only
 *   npx tsx --env-file=.env.local scripts/exams/mark-practice-plan.ts --write    # also mark
 *   ... --pool <file.json>   reuse a pool saved by build-forms.ts (report only, never with --write)
 *
 * Choice: every question that passes practice's checks, is in pool 'practice' (so never held for an
 * exam), original, and at levels 1 to 6. The 5,000 follow the bank's own mix: each skill and level gets
 * its share (largest remainder), confirmed answer keys first, then a seeded order; one question per family.
 * Writing backs up the column first, then sets it by id (column only).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { stableHash } from "@/lib/catalog-practice/picker";
import { db, loadPool, poolWithMeta, type PoolItem } from "./bank-pool";

const SIZE = 5000;
const MAX_LEVEL = 6;
const SEED = "karman-practice-plan-2026-11-22";
const OUT = path.join(process.cwd(), "scripts/exams/out");
const args = process.argv.slice(2);
const write = args.includes("--write");
const poolFile = args.includes("--pool") ? args[args.indexOf("--pool") + 1] : null;

function choose(candidates: readonly PoolItem[]): PoolItem[] {
  const strata = new Map<string, PoolItem[]>();
  for (const item of candidates) {
    const key = `${item.skillId}|${item.difficulty}`;
    strata.set(key, [...(strata.get(key) ?? []), item]);
  }
  const total = candidates.length;
  const shares = [...strata.entries()].map(([key, items]) => ({
    key,
    items,
    exact: (items.length * SIZE) / total,
  }));
  const quota = new Map(shares.map((s) => [s.key, Math.floor(s.exact)]));
  let left = SIZE - [...quota.values()].reduce((sum, n) => sum + n, 0);
  for (const s of [...shares].sort(
    (a, b) => (b.exact % 1) - (a.exact % 1) || a.key.localeCompare(b.key)
  )) {
    if (left-- <= 0) break;
    quota.set(s.key, quota.get(s.key)! + 1);
  }
  const families = new Set<string>();
  const chosen: PoolItem[] = [];
  for (const s of shares) {
    const ordered = [...s.items].sort(
      (a, b) =>
        Number(b.confirmed) - Number(a.confirmed) ||
        stableHash(`${SEED}:${a.id}`) - stableHash(`${SEED}:${b.id}`)
    );
    let need = quota.get(s.key)!;
    for (const item of ordered) {
      if (need <= 0) break;
      if (families.has(item.family)) continue;
      families.add(item.family);
      chosen.push(item);
      need--;
    }
  }
  return chosen;
}

async function setColumn(ids: string[], value: boolean) {
  for (let offset = 0; offset < ids.length; offset += 200) {
    const { error } = await db
      .from("quiz_questions")
      .update({ practice_plan: value } as never)
      .in("id", ids.slice(offset, offset + 200));
    if (error) throw new Error(`practice_plan update failed: ${error.message}`);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (write && poolFile) throw new Error("--write always reads the bank fresh; drop --pool");
  const raw = poolFile
    ? (JSON.parse(readFileSync(poolFile, "utf8")) as Omit<PoolItem, "confirmed" | "original">[])
    : await loadPool();
  const { meta, pool } = await poolWithMeta(raw);
  const candidates = pool.filter(
    (item) =>
      item.original &&
      item.difficulty >= 1 &&
      item.difficulty <= MAX_LEVEL &&
      (meta.get(item.id)?.pool ?? "practice") === "practice"
  );
  const chosen = choose(candidates);
  const byLevel = [1, 2, 3, 4, 5, 6].map((d) => chosen.filter((i) => i.difficulty === d).length);
  const skills = new Set(chosen.map((i) => i.skillId)).size;
  const report = {
    at: new Date().toISOString(),
    candidates: candidates.length,
    chosen: chosen.length,
    confirmed: chosen.filter((i) => i.confirmed).length,
    byLevel,
    bySection: {
      reading: chosen.filter((i) => i.section === "reading").length,
      math: chosen.filter((i) => i.section === "math").length,
    },
    skills,
  };
  writeFileSync(path.join(OUT, "practice-plan-report.json"), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report));
  if (chosen.length !== SIZE) throw new Error(`refused: chose ${chosen.length}, not ${SIZE}`);
  if (!write) return;

  const { data: marked, error } = await db
    .from("quiz_questions")
    .select("id")
    .eq("practice_plan" as never, true as never);
  if (error) throw new Error(`marked rows could not be read: ${error.message}`);
  const before = ((marked ?? []) as unknown as { id: string }[]).map((r) => r.id);
  const backupFile = path.join(OUT, `backup-practice-plan-${report.at.replace(/[:.]/g, "-")}.json`);
  writeFileSync(
    backupFile,
    JSON.stringify({
      at: report.at,
      note: "ids with practice_plan = true before mark-practice-plan.ts --write (all others false)",
      ids: before,
    })
  );
  const keep = new Set(chosen.map((i) => i.id));
  await setColumn(
    before.filter((id) => !keep.has(id)),
    false
  );
  await setColumn([...keep], true);
  const { count } = await db
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("practice_plan" as never, true as never);
  console.log(`backup: ${backupFile} (${before.length} ids); marked now: ${count}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
