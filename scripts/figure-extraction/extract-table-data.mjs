// ============================================================
// extract-table-data — Phase 4a backfill.
//
// For every quiz_question with image_url set AND figure_table_data
// still null, call Gemini vision to detect whether the figure is a
// table. If yes, extract { caption, header_row, rows, footer_note }
// and write it back to figure_table_data + set figure_kind='table'.
// If not a table, mark figure_kind='image' (so we don't re-call on
// re-runs).
//
// Why this exists: replaces raster table screenshots with native HTML
// tables — see src/components/learn/QuestionTable.tsx + migration
// 20260518140651.
//
// USAGE
//   node --env-file=.env.local scripts/figure-extraction/extract-table-data.mjs
//   LIMIT=10 node --env-file=.env.local ...    # cap for testing
//   node --env-file=.env.local ... --dry-run   # don't write, just print
//
// COST
//   Free on Gemini Flash quota. ~1 call per image-bearing row.
//   Skips rows already classified (figure_kind != 'image' or
//   figure_table_data already set).
// ============================================================

import { fetchImageBuffer } from "../lib/fetch-image.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error("Set GEMINI_API_KEY.");
  process.exit(1);
}

const FLASH_MODEL = "gemini-2.5-flash";

async function geminiVision(parts) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${FLASH_MODEL}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 429) throw new Error(`QUOTA: ${errBody.slice(0, 200)}`);
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

const PROMPT = `You are looking at a figure that was extracted from an SAT practice test PDF. Decide whether the figure is a DATA TABLE (rows and columns of values with headers). If it is, transcribe the table contents into structured JSON. If it's any other kind of figure (scatterplot, geometry diagram, coordinate-plane graph, bar chart, 3D solid, etc.), return is_table=false.

For real tables, transcribe FAITHFULLY. Preserve numeric values, currency symbols, units. Wrap math expressions in $...$ for KaTeX rendering (e.g. $x^2$, $\\frac{1}{2}$). Keep header_row text concise (the column labels as printed). The first cell of each body row is usually a row label — preserve it as the first column value.

Return strict JSON:

{
  "is_table": true | false,
  "caption": "<title above the table, or null>",
  "header_row": ["Column 1 label", "Column 2 label", ...] | null,
  "rows": [ ["Row 1 col 1", "Row 1 col 2", ...], ... ],
  "footer_note": "<source note or footnote below the table, or null>",
  "confidence": "high" | "medium" | "low"
}

If is_table=false, return only { "is_table": false } — leave the other fields out.

CRITICAL: do not embed answer choices or question stem text in the table. Only transcribe what's clearly part of the table itself (caption + headers + body + footer note).`;

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function main() {
  console.log("Loading candidates…");
  let q = supabase
    .from("quiz_questions")
    .select("id, source_pdf, source_page, image_url, image_alt, figure_kind, figure_table_data")
    .not("image_url", "is", null);
  // Only rows we haven't classified yet
  q = q.or("figure_kind.is.null,figure_kind.eq.image");
  q = q.is("figure_table_data", null);
  const { data, error } = await q;
  if (error) throw error;

  let rows = data ?? [];
  if (LIMIT) rows = rows.slice(0, LIMIT);
  console.log(`Candidates: ${rows.length}`);
  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let tables = 0;
  let nonTables = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(
      `[${i + 1}/${rows.length}] ${row.source_pdf ?? "(?)"} p${row.source_page ?? "?"}… `
    );
    const fetched = await fetchImageBuffer(row.image_url);
    if (!fetched.ok) {
      console.log("could not fetch image");
      errors++;
      continue;
    }
    const img = { mime: fetched.mime, buf: fetched.buf };
    let raw;
    try {
      raw = await geminiVision([
        { inline_data: { mime_type: img.mime, data: img.buf.toString("base64") } },
        { text: PROMPT },
      ]);
    } catch (err) {
      const msg = String(err).slice(0, 100);
      console.log(`API ERROR: ${msg}`);
      if (msg.includes("QUOTA")) {
        console.log("Stopping due to quota.");
        break;
      }
      errors++;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.log("parse fail");
      errors++;
      continue;
    }
    if (!parsed.is_table) {
      console.log("not a table");
      nonTables++;
      if (!DRY_RUN) {
        await supabase.from("quiz_questions").update({ figure_kind: "image" }).eq("id", row.id);
      }
      continue;
    }
    // Sanity check
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      console.log("table flagged but no rows; skipping");
      errors++;
      continue;
    }
    const tableData = {
      caption: parsed.caption ?? null,
      header_row: Array.isArray(parsed.header_row) ? parsed.header_row : null,
      rows: parsed.rows,
      footer_note: parsed.footer_note ?? null,
    };
    const rowCount = tableData.rows.length;
    const colCount = tableData.header_row?.length ?? tableData.rows[0]?.length ?? 0;
    console.log(
      `TABLE ${rowCount}×${colCount}${parsed.confidence ? ` (${parsed.confidence})` : ""}${tableData.caption ? ` — ${tableData.caption.slice(0, 40)}` : ""}`
    );
    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({
          figure_kind: "table",
          figure_table_data: tableData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.log(`  ✗ write failed: ${upErr.message}`);
        errors++;
        continue;
      }
    }
    tables++;
  }

  console.log("");
  console.log(
    `Done. ${tables} table${tables === 1 ? "" : "s"} extracted, ${nonTables} non-table images marked, ${errors} errors.`
  );
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
