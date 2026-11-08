#!/usr/bin/env -S npx tsx
// Applies decisions made on the hosted figure-check page (a Claude Artifact whose db holds one
// doc per figure round) to the local figure queue, through the same decide() the /dev/figure-review
// page uses, so the same round and figure.json hash checks apply.
//
// Usage: npx tsx --conditions=react-server scripts/import-tools/ts/apply-shared-decisions.ts <decisions.json> [figures-dir]
// decisions.json: [{ "doc": "<id>.r<round>", "qid": "<id>", "round": 1, "sha": "<figure.json sha256>",
//                    "verdict": "approve" | "reject", "note": "..." }]
// Prints [{ "doc", "result": "applied" | "error", "message"? }] as JSON.

import { readFileSync } from "node:fs";
import { decide, DecisionError } from "@/app/dev/figure-review/review-data";

type Row = { doc: string; qid: string; round: number; sha: string; verdict: string; note?: string };

async function main() {
  const [file, dir] = process.argv.slice(2);
  if (!file) {
    console.error("usage: apply-shared-decisions.ts <decisions.json> [figures-dir]");
    process.exit(2);
  }
  const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];
  const out: { doc: string; result: string; message?: string }[] = [];
  for (const r of rows) {
    if (r.verdict !== "approve" && r.verdict !== "reject") {
      out.push({ doc: r.doc, result: "error", message: `unknown verdict ${r.verdict}` });
      continue;
    }
    try {
      await decide(
        {
          id: r.qid,
          round: r.round,
          fileSha256: r.sha,
          decision: r.verdict === "approve" ? "approved" : "rejected",
          note: r.note ?? "",
        },
        new Date().toISOString(),
        ...(dir ? [dir] : [])
      );
      out.push({ doc: r.doc, result: "applied" });
    } catch (e) {
      const message = e instanceof DecisionError || e instanceof Error ? e.message : String(e);
      out.push({ doc: r.doc, result: "error", message });
    }
  }
  process.stdout.write(JSON.stringify(out, null, 1) + "\n");
}

void main();
