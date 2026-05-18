// ============================================================
// audit-summary — print quality-dashboard stats from the terminal.
//
// Read-only snapshot of question_findings: total open, by severity,
// top 10 codes, by source_pdf, by domain. Same data as
// /admin/questions/dashboard, just terminal-formatted for quick
// "how clean is the bank?" check + future cron-piped notifications.
//
// USAGE
//   node --env-file=.env.local scripts/question-audit/audit-summary.mjs
//
//   # JSON output for piping into Slack / email / another tool:
//   node --env-file=.env.local \
//     scripts/question-audit/audit-summary.mjs --json
//
//   # Scope to one source_pdf (test batch):
//   node --env-file=.env.local \
//     scripts/question-audit/audit-summary.mjs --source-pdf=2024-08usv2.pdf
//
// EXIT CODES
//   0  Always (read-only, never fails on data state).
// ============================================================

import process from "node:process";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const pdfArg = args.find((a) => a.startsWith("--source-pdf="));
const SOURCE_PDF = pdfArg ? pdfArg.split("=")[1] : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ── Pull data ───────────────────────────────────────────────
const findingsQ = supa
  .from("question_findings")
  .select("question_id, source, severity, category, code, resolved_at");
const { data: findings, error: fErr } = await findingsQ;
if (fErr) {
  console.error("question_findings query failed:", fErr.message);
  process.exit(1);
}

const { data: allQuestions, error: aqErr } = await supa
  .from("quiz_questions")
  .select("id, source_pdf, domain");
if (aqErr) {
  console.error("quiz_questions query failed:", aqErr.message);
  process.exit(1);
}

// Build the source_pdf scope ── if --source-pdf is set, restrict to
// the questions in that batch.
const scopedQuestions = SOURCE_PDF
  ? (allQuestions ?? []).filter((q) => q.source_pdf === SOURCE_PDF)
  : (allQuestions ?? []);
const qById = new Map(
  scopedQuestions.map((q) => [q.id, { source_pdf: q.source_pdf, domain: q.domain }])
);
const scopedFindings = SOURCE_PDF
  ? (findings ?? []).filter((f) => qById.has(f.question_id))
  : (findings ?? []);

// ── Aggregate ───────────────────────────────────────────────
let open = 0,
  resolved = 0,
  blockingOpen = 0,
  warningOpen = 0,
  noticeOpen = 0;
const questionsAffected = new Set();
const uniqueCodes = new Set();
const byCode = new Map(); // code → {category, severity, open, resolved}
const byPdf = new Map(); // pdf → {open, blocking, qids}
const byDomain = new Map();
const bySource = new Map();

for (const f of scopedFindings) {
  const isOpen = !f.resolved_at;
  uniqueCodes.add(f.code);
  if (isOpen) {
    open++;
    questionsAffected.add(f.question_id);
    if (f.severity === "BLOCKING") blockingOpen++;
    else if (f.severity === "WARNING") warningOpen++;
    else noticeOpen++;
  } else {
    resolved++;
  }
  if (!byCode.has(f.code))
    byCode.set(f.code, {
      code: f.code,
      category: f.category,
      severity: f.severity,
      open: 0,
      resolved: 0,
    });
  const c = byCode.get(f.code);
  if (isOpen) c.open++;
  else c.resolved++;
  if (!bySource.has(f.source)) bySource.set(f.source, { open: 0, resolved: 0 });
  const s = bySource.get(f.source);
  if (isOpen) s.open++;
  else s.resolved++;
  if (isOpen) {
    const q = qById.get(f.question_id);
    const pdf = q?.source_pdf ?? "(no source_pdf)";
    if (!byPdf.has(pdf)) byPdf.set(pdf, { open: 0, blocking: 0, qids: new Set() });
    const pa = byPdf.get(pdf);
    pa.open++;
    if (f.severity === "BLOCKING") pa.blocking++;
    pa.qids.add(f.question_id);
    const domain = q?.domain ?? "(no domain)";
    if (!byDomain.has(domain)) byDomain.set(domain, { open: 0, blocking: 0, qids: new Set() });
    const da = byDomain.get(domain);
    da.open++;
    if (f.severity === "BLOCKING") da.blocking++;
    da.qids.add(f.question_id);
  }
}

const topCodes = [...byCode.values()].sort((a, b) => b.open - a.open).slice(0, 10);
const bySourcePdfArr = [...byPdf.entries()]
  .map(([pdf, v]) => ({
    source_pdf: pdf,
    open: v.open,
    blocking: v.blocking,
    questions_affected: v.qids.size,
  }))
  .sort((a, b) => b.open - a.open);
const byDomainArr = [...byDomain.entries()]
  .map(([d, v]) => ({
    domain: d,
    open: v.open,
    blocking: v.blocking,
    questions_affected: v.qids.size,
  }))
  .sort((a, b) => b.open - a.open);
const bySourceArr = [...bySource.entries()].map(([source, v]) => ({ source, ...v }));

const totalQuestions = scopedQuestions.length;
const cleanQuestions = Math.max(0, totalQuestions - questionsAffected.size);
const cleanPct = totalQuestions > 0 ? Math.round((cleanQuestions / totalQuestions) * 100) : 0;
const resolvedPct =
  scopedFindings.length > 0 ? Math.round((resolved / scopedFindings.length) * 100) : 0;

const summary = {
  generated_at: new Date().toISOString(),
  scope: SOURCE_PDF ?? "all",
  totals: {
    total_findings: scopedFindings.length,
    open,
    resolved,
    resolved_pct: resolvedPct,
    blocking_open: blockingOpen,
    warning_open: warningOpen,
    notice_open: noticeOpen,
    questions_total: totalQuestions,
    questions_affected: questionsAffected.size,
    questions_clean: cleanQuestions,
    clean_pct: cleanPct,
    unique_codes: uniqueCodes.size,
  },
  top_codes: topCodes,
  by_source: bySourceArr,
  by_source_pdf: bySourcePdfArr,
  by_domain: byDomainArr,
};

// ── Render ──────────────────────────────────────────────────
if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const bar = "═".repeat(72);
console.log(bar);
console.log(`Question-bank quality summary — ${summary.generated_at}`);
if (SOURCE_PDF) console.log(`Scope: source_pdf = ${SOURCE_PDF}`);
else console.log("Scope: entire bank");
console.log(bar);

console.log("");
console.log("TOTALS");
console.log(`  Open findings        : ${open}`);
console.log(`  Resolved             : ${resolved} (${resolvedPct}% of all findings)`);
console.log(`  Blocking (open)      : ${blockingOpen}`);
console.log(`  Warning  (open)      : ${warningOpen}`);
console.log(`  Notice   (open)      : ${noticeOpen}`);
console.log(
  `  Questions affected   : ${questionsAffected.size} / ${totalQuestions} (${cleanPct}% clean)`
);
console.log(`  Unique codes         : ${uniqueCodes.size}`);

if (topCodes.length > 0) {
  console.log("");
  console.log("TOP 10 CODES");
  for (const c of topCodes) {
    console.log(
      `  ${c.severity.padEnd(9)} ${c.code.padEnd(36)} ${String(c.open).padStart(5)}  ${c.category}`
    );
  }
}

if (bySourceArr.length > 0) {
  console.log("");
  console.log("BY SOURCE");
  for (const s of bySourceArr) {
    console.log(
      `  ${s.source.padEnd(10)} open=${String(s.open).padStart(5)}  resolved=${s.resolved}`
    );
  }
}

if (bySourcePdfArr.length > 0 && !SOURCE_PDF) {
  console.log("");
  console.log("BY TEST BATCH (source_pdf, top 10)");
  for (const p of bySourcePdfArr.slice(0, 10)) {
    const pdfShort = p.source_pdf.length > 36 ? "…" + p.source_pdf.slice(-35) : p.source_pdf;
    console.log(
      `  ${pdfShort.padEnd(36)}  open=${String(p.open).padStart(4)}  blocking=${String(p.blocking).padStart(4)}  qs_aff=${p.questions_affected}`
    );
  }
}

if (byDomainArr.length > 0) {
  console.log("");
  console.log("BY SAT DOMAIN");
  for (const d of byDomainArr) {
    console.log(
      `  ${d.domain.padEnd(20)}  open=${String(d.open).padStart(4)}  blocking=${String(d.blocking).padStart(4)}  qs_aff=${d.questions_affected}`
    );
  }
}

console.log("");
console.log(bar);
if (open === 0) console.log("✓ No open findings. Bank is clean.");
else
  console.log(
    `⚠ ${blockingOpen} BLOCKING + ${warningOpen + noticeOpen} other findings open. See /admin/questions/inspect.`
  );
console.log(bar);
