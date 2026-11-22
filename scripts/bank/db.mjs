// Bank stream helper (overnight build, 2026-11-22): a service-role Supabase client read from
// .env.local. Never prints the key. Used only by scripts run on purpose from scripts/bank/.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv(resolve(process.cwd(), ".env.local"));
export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !key) throw new Error("Supabase URL or service key missing from .env.local");

export const db = createClient(SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Every row of a select, read in pages keyed on `id` (keyset, so late pages stay fast); a page
 *  that times out is retried smaller. */
export async function selectAll(table, columns, { pageSize = 1000, filter } = {}) {
  const rows = [];
  let last = null;
  let size = pageSize;
  for (;;) {
    let q = db.from(table).select(columns).order("id", { ascending: true }).limit(size);
    if (filter) q = filter(q);
    if (last !== null) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) {
      if (size <= 10) throw new Error(`${table}: ${error.message}`);
      size = Math.max(10, Math.floor(size / 2));
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    rows.push(...data);
    if (data.length < size) break;
    last = data[data.length - 1].id;
    size = Math.min(pageSize, size * 2);
  }
  return rows;
}
