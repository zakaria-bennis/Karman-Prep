# Live question QA audit

Checks every live question (is_live = true) for anything a student would meet broken,
misformatted or unanswerable. Read-only on the database: GET requests only.

```
PIPE=/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/pipeline
python3 -I scripts/import-tools/qa-audit.py export --out $PIPE/qa/live-full.json
python3 -I scripts/import-tools/qa-audit.py static --export $PIPE/qa/live-full.json --out $PIPE/qa
QA_RENDER_EXPORT=$PIPE/qa/live-full.json npx next dev --webpack -H 127.0.0.1 -p <free port>
node scripts/import-tools/qa/render-audit.mjs --export $PIPE/qa/live-full.json --out $PIPE/qa --base http://127.0.0.1:<port>
python3 -I scripts/import-tools/qa-audit.py summary --out $PIPE/qa
```

- **export** (`kimport/qa_export.py`): every live row in full (figure data, choices with tables,
  answer-key evidence) through the REST API with the service key in `.env.local`. Written
  only when the live set did not change during the export.
- **static** (`kimport/qa_static.py` plus `ts/qa-check.ts`, which runs the app's own code):
  structure (stem, four choices A to D, identical choices, key), formatting (markdown, leftover
  figure descriptions, header and page-number lines, blank rules, mojibake, `---` dashes,
  markup the parsers refuse, LaTeX outside math, KaTeX on every math span), completeness
  (truncated passage or stem, a figure referenced but not drawn), figures (the import
  validators, what the screen actually draws, image URLs reachable) and the catalog lane
  (scope evidence, payload seal, numeric answer set). Writes `static-report.json`.
- **render** (`qa/render-audit.mjs`, in-page checks in `qa/render-inspect.mjs`): each question
  in the real catalog question screen (`/dev/qa-render`, dev only, 404 in production or
  without `QA_RENDER_EXPORT`), dark, nothing chosen, at 1280x800 and 390x844. Screenshots in
  `render/` and `render-mobile/`; errors, KaTeX error spans, sideways overflow, failed images,
  empty or missing figures, empty figure column and overlapping text in `render-report.json`.
  Resumable: results are appended to `render-results.jsonl`; a rerun renders only what is
  missing (`--redo` renders again, `--ids a,b` picks questions).
- **summary** writes `summary.md`: counts per check and the ids.

Next 16 refuses a second dev server in a folder that already runs one: start this one from a
separate checkout of the branch.

Tests: `python3 -I -m unittest discover -s scripts/import-tools/tests -t scripts/import-tools -p test_qa_static.py`,
`npx vitest run tests/unit/import-tools/qa-check.test.ts src/app/dev/qa-render`,
`node --test scripts/import-tools/qa/render-inspect.test.mjs`.
