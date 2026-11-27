// Counts formatting patterns in the text of live real questions (read only).
import { readFileSync, writeFileSync } from "node:fs";
import { selectAll } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/scripts/bank/db.mjs";
const rows = await selectAll(
  "quiz_questions",
  "id,subject,passage_intro,passage,passage_a,passage_b,question_text",
  {
    filter: (q) =>
      q
        .eq("origin", "original")
        .eq("is_live", true)
        .in("publish_status", ["publish_ready", "publish_ready_with_verified_repair"])
        .is("archived_at", null),
  }
);
const fields = ["passage_intro", "passage", "passage_a", "passage_b", "question_text"];
const pats = {
  midSentenceBreak: /[a-z,;]\n(?!\n)[a-z(“"]/, // single newline between lowercase words
  anyNewline: /\n/,
  doubleNewline: /\n\n/,
  starItalic: /(^|[^*])\*[^*\n]+\*(?!\*)/,
  underscoreItalic: /(^|\s)_[^_\n]+_/,
  doubleStarBold: /\*\*[^*]+\*\*/,
  htmlTag: /<\/?(i|em|b|strong|u|br|p|span|sup|sub)\b/i,
  latex: /\$[^$]+\$|\\\(|\\frac/,
  blank: /_{3,}|\\_\\_/,
  bullet: /(^|\n)\s*[•\-–] /,
  doubleSpace: /[^\s]  +[^\s]/,
  trailingSpaceNewline: / \n/,
  curlyVsStraight: /"/,
};
const counts = {},
  examples = {};
for (const r of rows)
  for (const f of fields) {
    const t = r[f];
    if (!t) continue;
    for (const [k, re] of Object.entries(pats))
      if (re.test(t)) {
        const key = `${f}.${k}`;
        counts[key] = (counts[key] || 0) + 1;
        (examples[key] ??= []).length < 4 && examples[key].push({ id: r.id, t: t.slice(0, 400) });
      }
  }
console.log("rows", rows.length);
console.log(
  Object.entries(counts)
    .sort()
    .map(([k, v]) => `${k.padEnd(40)} ${v}`)
    .join("\n")
);
writeFileSync(process.argv[2], JSON.stringify(examples, null, 2));
