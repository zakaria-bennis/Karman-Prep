/*
 * Bank stream (2026-11-22): prove that questions are still served to students after a write, with
 * the app's own pool reader (fetchCatalogQuestionPool: publication gates, evidence and the payload
 * seal). Read only.
 *   npx tsx scripts/bank/verify-pool.ts <question-id>...
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
}

async function main(): Promise<void> {
  const ids = process.argv.slice(2);
  const { createAdminClient } = await import("../../src/lib/supabase/server");
  const { fetchCatalogQuestionPool } =
    await import("../../src/lib/supabase/queries/catalog-question-pool");
  const { readCatalogQuestionScope } =
    await import("../../src/lib/question-bank/catalog-question-scope");
  const db = createAdminClient();
  const { data: keys, error } = await db
    .from("answer_key_entries")
    .select("question_id, raw_model_response")
    .in("question_id", ids);
  if (error) throw new Error(error.message);
  const bySkill = new Map<string, string[]>();
  for (const k of keys ?? []) {
    const skill = readCatalogQuestionScope(k.raw_model_response).skill.id;
    bySkill.set(skill, [...(bySkill.get(skill) ?? []), k.question_id as string]);
  }
  let served = 0;
  for (const [skill, list] of bySkill) {
    let found: { id: string }[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        found = await fetchCatalogQuestionPool({ skillId: skill });
        break;
      } catch (e) {
        console.log(`${skill}: try ${attempt} failed (${(e as Error).message})`);
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    const pool = new Set(found.map((q) => q.id));
    for (const id of list) {
      const ok = pool.has(id);
      if (ok) served++;
      console.log(`${id} ${skill} ${ok ? "served" : "NOT SERVED"}`);
    }
  }
  console.log(`${served}/${ids.length} served`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
