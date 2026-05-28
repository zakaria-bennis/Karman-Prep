// One-shot diagnostic for the current smoke run.
// Prints subject/answer_format breakdown so we can see if the
// extractor caught both Reading & Writing AND Math modules.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: rows, error } = await sb
  .from("quiz_questions")
  .select("id, source_page, subject, answer_format, domain, topic_cluster, question_text")
  .eq("source_pdf", "202406asiav2.pdf")
  .order("source_page", { ascending: true });
if (error) throw error;

console.log(`Total questions imported for 202406asiav2.pdf: ${rows.length}`);
console.log("");

// Subject breakdown
const bySubject = {};
for (const r of rows) bySubject[r.subject] = (bySubject[r.subject] ?? 0) + 1;
console.log("By subject:");
for (const [s, n] of Object.entries(bySubject).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s.padEnd(20)} ${n}`);
}
console.log("");

// Answer format breakdown
const byFormat = {};
for (const r of rows) byFormat[r.answer_format] = (byFormat[r.answer_format] ?? 0) + 1;
console.log("By answer_format:");
for (const [s, n] of Object.entries(byFormat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s.padEnd(20)} ${n}`);
}
console.log("");

// Domain breakdown — shows topic spread
const byDomain = {};
for (const r of rows) byDomain[r.domain ?? "<null>"] = (byDomain[r.domain ?? "<null>"] ?? 0) + 1;
console.log("By domain:");
for (const [s, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s.padEnd(28)} ${n}`);
}
console.log("");

// Page range — gives a sense of whether extraction skipped sections
const pages = rows.map((r) => r.source_page).filter((p) => p != null);
console.log(`Page range: ${Math.min(...pages)} - ${Math.max(...pages)}`);
console.log("");

// Page distribution — gaps reveal where the extractor stopped
const byPage = {};
for (const p of pages) byPage[p] = (byPage[p] ?? 0) + 1;
const allPages = Object.keys(byPage)
  .map(Number)
  .sort((a, b) => a - b);
console.log(`Pages with questions (${allPages.length} unique):`);
console.log(`  ${allPages.join(", ")}`);
console.log("");

// Gap analysis: missing pages between min and max
const gaps = [];
for (let p = Math.min(...pages); p <= Math.max(...pages); p++) {
  if (!byPage[p]) gaps.push(p);
}
console.log(`Pages MISSING within range (potential skipped pages): ${gaps.length}`);
if (gaps.length > 0 && gaps.length < 30) {
  console.log(`  ${gaps.join(", ")}`);
}
console.log("");

// Sample math questions to confirm they're real
const mathRows = rows.filter((r) => r.subject === "math").slice(0, 3);
if (mathRows.length > 0) {
  console.log("Sample math questions:");
  for (const r of mathRows) {
    console.log(`  p${r.source_page}: "${(r.question_text ?? "").slice(0, 80)}…"`);
  }
}
