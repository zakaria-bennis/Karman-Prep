// Diagnose what the /admin/questions/review page is counting and
// whether archived rows are slipping through.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function c(label, qb) {
  const { count, error } = await qb;
  if (error) return console.log(`  ${label.padEnd(60)} ERROR: ${error.message}`);
  const mark = count === 73 ? " ★★★" : "";
  console.log(`  ${label.padEnd(60)} ${count}${mark}`);
}

console.log("Flagged-queue diagnostic");
console.log("");

console.log("import_flag_type distribution (no archive filter):");
const { data: ift } = await sb
  .from("quiz_questions")
  .select("import_flag_type, source_pdf, archived_at");
const tally = {};
for (const r of ift ?? []) {
  const k = r.import_flag_type ?? "<null>";
  tally[k] = (tally[k] ?? 0) + 1;
}
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}

console.log("");
console.log("import_flag_type=partial_emit details:");
const { data: pe } = await sb
  .from("quiz_questions")
  .select("source_pdf, archived_at")
  .eq("import_flag_type", "partial_emit");
const archCount = pe?.filter((r) => r.archived_at).length ?? 0;
const activeCount = (pe?.length ?? 0) - archCount;
const bySrc = {};
for (const r of pe ?? [])
  bySrc[r.source_pdf ?? "<null>"] = (bySrc[r.source_pdf ?? "<null>"] ?? 0) + 1;
console.log(`  Total:               ${pe?.length ?? 0}`);
console.log(`  Active (archived_at IS NULL): ${activeCount}`);
console.log(`  Archived:            ${archCount}`);
console.log(`  Per-PDF:`);
for (const [k, v] of Object.entries(bySrc)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)) {
  console.log(`    ${k.padEnd(40)} ${v}`);
}

console.log("");
console.log("Flagged queue counts (matching how admin page might filter):");
await c(
  "import_flag_type NOT NULL (any)",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .not("import_flag_type", "is", null)
);
await c(
  "import_flag_type NOT NULL + archived_at IS NULL (active only)",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .not("import_flag_type", "is", null)
    .is("archived_at", null)
);
await c(
  "import_flag_type NOT NULL + is_live=true",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .not("import_flag_type", "is", null)
    .eq("is_live", true)
);
await c(
  "import_flag_type NOT NULL + is_live=false (the 'flagged' set if filter is correct)",
  sb
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .not("import_flag_type", "is", null)
    .eq("is_live", false)
);
