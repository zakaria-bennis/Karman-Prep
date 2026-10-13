// Read-only production metric; writes only the local state file.
// Run every few minutes with a count of independently validated,
// publication-ready questions: --source-pdf exam.pdf --state /tmp/publish-state.json --ready-backlog N
import { createClient } from "@supabase/supabase-js";
import {
  evaluatePublicationProgress,
  readProgress,
  saveProgress,
} from "../lib/publication-stall.mjs";

const args = process.argv.slice(2);
const stateIndex = args.indexOf("--state");
const backlogIndex = args.indexOf("--ready-backlog");
const sourceIndex = args.indexOf("--source-pdf");
const statePath = stateIndex >= 0 ? args[stateIndex + 1] : null;
const readyBacklog = backlogIndex >= 0 ? Number(args[backlogIndex + 1]) : NaN;
const sourcePdf = sourceIndex >= 0 ? args[sourceIndex + 1] : null;
if (
  !statePath ||
  statePath.startsWith("--") ||
  !sourcePdf ||
  sourcePdf.startsWith("--") ||
  !Number.isInteger(readyBacklog) ||
  readyBacklog < 0
) {
  console.error(
    "usage: check-publication-stall.mjs --source-pdf <name> --state <path> --ready-backlog <validated count>"
  );
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase configuration missing");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { count, error } = await supabase
  .from("quiz_questions_live")
  .select("id", { count: "exact", head: true })
  .eq("source_pdf", sourcePdf);
if (error || count == null)
  throw new Error(`student view count failed: ${error?.message ?? "no count"}`);
const progress = evaluatePublicationProgress(readProgress(statePath), {
  sourcePdf,
  approvedCount: count,
  readyBacklog,
  now: Date.now(),
});
saveProgress(statePath, progress);
console.log(JSON.stringify(progress));
if (progress.stalled || progress.regressed) process.exitCode = 2;
