# Question import pipeline: duplicates, problem lane and speed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared, tested Python toolkit that removes duplicates before review, makes a duplicate impossible to publish, sets problem questions aside without stopping a batch, and lets several reviewers feed one writer.

**Architecture:** Pure, offline Python modules (package `kimport`) that read JSON files and write JSON reports and `.sql` files. The agent session runs the generated SQL against production through the Supabase connector, exactly as today, and saves the results as JSON for the next tool. A `comparison_key` column on `quiz_questions` plus a partial unique index is the database backstop.

**Tech Stack:** Python 3.15 standard library only (`unicodedata`, `hashlib`, `json`, `fractions`, `unittest`; pytest is not installed). Postgres SQL (Supabase). One TypeScript change in the importer (vitest).

**Spec:** `docs/superpowers/specs/2026-10-20-question-import-dedup-and-holds-design.md`

## Global Constraints

- **Box Drive is read-only.** Never write, rename, move or delete anything under `/Users/zakariabennis/Library/CloudStorage/Box-Box`. Every output path must be outside it. A global hook blocks violations; do not try to work around it.
- **No paid model APIs.** No AI calls from any tool.
- **Never hard-delete questions.** Un-publish only, using the existing rollback shape (`publish_status='needs_human_review'`, `import_status='needs_review'`).
- **No question labels (D4).** Questions with agent-solved answers carry no label: `answer_source` stays null for `reviewed_answer.kind === "independently_confirmed_generated"`.
- **Founder go-ahead is required before each of these live writes:** the un-publish of live duplicates, migration A plus the key backfill, migration B, and each publish batch (CLAUDE.md: "Live question writes need the founder's go-ahead for each batch").
- **Never alter approved source bytes** or stored question text. The normalizer is for comparison only.
- **One normalizer.** Every comparison (sweep, corpus, lint, publish guard, backfill) imports `kimport.normalize`. `NORMALIZER_VERSION = "kn-1"`.
- **Typo rule defaults:** at most 2 differing spots, at most 3 characters per spot, never in an answer choice, never inside `<u>…</u>` or a blank (`______`), and no digit, sign or math token differs.
- **Files:** no file over about 700 lines (`npm run check:sizes`).
- **Where code lives:** source of truth is `scripts/import-tools/` in this repo (branch `claude/import-dedup-spec`). It runs from task-3 with `python3 -I <repo>/scripts/import-tools/kimport-cli.py <command> …`. Working files go in `/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/pipeline/`.
- **Replace, don't accumulate:** once Task 6 is in use, the 124 `build_*publish_sql.py` generators move to `task-3/retired/` and are not used again. task-6 `dedup.py` gets a README line saying `kimport.corpus` replaces it.
- **Test command:** `python3 -I -m unittest discover -s scripts/import-tools/tests -t scripts/import-tools -v`

## Review Focus

1. **Passages are embedded in `question_text`.** None of the 4,518 reviewed rows uses the `passage*` columns, so two R&W questions on the same passage differ only in the trailing question. Expected: different keys, never a typo match. Test in Task 2 (`test_shared_passage_different_question_not_typo`).
2. **Numeric-entry questions have no choices.** The key must use the normalized answer value (`0.5` = `1/2`), and `2.4` vs `4.8` must differ. Test in Task 2.
3. **Mixed Unicode and LaTeX in one question** (`x²` in the stem, `x^{2}` in a choice). Expected: same key as the all-Unicode copy, while `x2` stays different. Test in Task 1.
4. **An interrupted session** (writer killed between publish and readback). Expected: resume finds the open intent and refuses a second publish until a readback closes it. Test in Task 3.
5. **Repeated choice texts** (two identical choices). Expected: they count twice in the sorted choice list, and do not collapse to one. Test in Task 2.

---

## File structure

```
scripts/import-tools/
  kimport-cli.py              entry point: dispatches subcommands
  kimport/__init__.py
  kimport/normalize.py        text + math normalizer (comparison only)
  kimport/keys.py             comparison key, question record shape
  kimport/typo.py             typo-level match rule
  kimport/writer.py           writer lock + intent log
  kimport/sweep.py            live-bank duplicate sweep + un-publish SQL
  kimport/backfill.py         comparison_key backfill SQL
  kimport/publish.py          shared publish + rollback SQL builder
  kimport/lint.py             batch-start checks
  kimport/corpus.py           corpus clustering + canonical election
  kimport/pairs_page.py       founder yes/no HTML page
  kimport/lane.py             problem-question lane + reviewer slice picker
  sql/live_export.sql         read-only export query
  tests/test_*.py             one test file per module
  README.md                   runbook (commands in order)
supabase/migrations/20261021000000_question_comparison_key.sql
supabase/migrations/20261021000100_question_comparison_key_unique.sql
src/lib/question-bank/import-core.ts      (D4 change)
```

The shared record shape every module uses (defined in `keys.py`):

```python
@dataclass(frozen=True)
class QuestionRecord:
    ref: str                 # live: quiz_questions.id; corpus: occurrence id e.g. "2025-10_US_V1_MATH_M1_Q06"
    text: str                # stem (passage embedded, as stored)
    choices: tuple[str, ...] # () for numeric entry
    answer: str              # correct choice TEXT for MC, value for numeric
    answer_format: str       # "mc" | "numeric"
    table_cells: tuple[tuple[str, ...], ...] = ()
    figure_signature: str | None = None   # reviewed figure signature, never an image hash
    is_live: bool = False
    meta: dict = field(default_factory=dict, compare=False)
```

---

### Task 1: Normalizer

**Files:**

- Create: `scripts/import-tools/kimport/__init__.py`, `scripts/import-tools/kimport/normalize.py`
- Test: `scripts/import-tools/tests/test_normalize.py`

**Interfaces:**

- Produces: `NORMALIZER_VERSION: str = "kn-1"`; `normalize_text(s: str) -> str`; `strip_markup(s: str) -> tuple[str, tuple[tuple[int, int, str], ...]]` (plain text plus the `(start, end, kind)` spans of `u`, `i` and `blank`); `math_tokens(s: str) -> tuple[str, ...]` (digits, signs, variables, operators after normalization, in order).

- [ ] **Step 1: Write failing tests** in `test_normalize.py`:
  - `test_fraction_forms_equal`: `normalize_text("½ of 18") == normalize_text("1/2 of 18") == normalize_text(r"\frac{1}{2} of 18") == normalize_text(r"\dfrac{1}{2} of 18")`
  - `test_superscript_forms_equal_but_x2_differs`: `normalize_text("x²") == normalize_text("x^{2}") == normalize_text("$x^2$")`, and `!= normalize_text("x2")`
  - `test_mixed_unicode_latex`: `normalize_text("x² + 3 \\times 4") == normalize_text("x^{2} + 3 × 4")`
  - `test_minus_and_dashes`: `normalize_text("−3") == normalize_text("-3")`
  - `test_quotes_case_whitespace`: `normalize_text("“The  Study”\n") == normalize_text('"the study"')`
  - `test_idempotent`: for 10 sample strings, `normalize_text(normalize_text(s)) == normalize_text(s)`
  - `test_strip_markup_spans`: `strip_markup("a <u>bc</u> d ______")` returns text `"a bc d ______"` with spans `((2, 4, "u"), (7, 13, "blank"))`
  - `test_math_tokens`: `math_tokens("slope is −3") == ("-", "3")` and `math_tokens("slope is 3") == ("3",)`
- [ ] **Step 2: Run** the test command. Expected: FAIL, `ModuleNotFoundError: kimport`.
- [ ] **Step 3: Implement `normalize.py`.** The order is fixed (spec §5.1): (1) map superscripts, subscripts, vulgar fractions, `−`, `×`, `÷` to tokens; (2) map LaTeX to the same tokens (`\times`/`\cdot` → `*`, `\div` → `/`, `\frac|\dfrac|\tfrac{a}{b}` → `(a)/(b)`, `^{n}` → `^n`, `\sqrt{x}` → `√(x)`, `\le`/`\ge`/`\ne` → `≤ ≥ ≠`); remove `$`, `\( \)`, `\left`, `\right`, thin spaces; (3) apply NFKC, then casefold, straight quotes, unified dashes, `…` → `...`; (4) collapse whitespace. Bare `a/b` and `(a)/(b)` for single tokens normalize to `(a)/(b)`.
- [ ] **Step 4: Run** the test command. Expected: all `test_normalize` tests pass.
- [ ] **Step 5: Commit** `feat(import-tools): comparison normalizer kn-1`

### Task 2: Comparison key and typo rule

**Files:**

- Create: `scripts/import-tools/kimport/keys.py`, `scripts/import-tools/kimport/typo.py`
- Test: `scripts/import-tools/tests/test_keys.py`, `scripts/import-tools/tests/test_typo.py`

**Interfaces:**

- Consumes: Task 1 functions.
- Produces: `QuestionRecord` (above); `comparison_key(r: QuestionRecord) -> str` (`"kn-1:" + sha256 hex` of a JSON list: normalized text, sorted normalized choices with repeats kept, markup spans, answer_format, normalized answer, table cells, figure_signature; subject and domain are never inputs); `answer_value(r) -> str` (normalized choice text, or for numeric a canonical `Fraction` string when parseable); `typo_match(a: QuestionRecord, b: QuestionRecord) -> TypoResult` where `TypoResult = NamedTuple("TypoResult", [("same", bool), ("spots", tuple[tuple[str, str], ...]), ("reason", str)])`, plus `MAX_SPOTS = 2` and `MAX_SPOT_CHARS = 3`.

- [ ] **Step 1: Write failing tests.** The six founder examples are fixtures in `tests/fixtures/founder_examples.json` (made-up text, copied from the widget shown to the founder):
  - `test_shuffled_choices_same_key`: example 1 → keys equal
  - `test_fraction_notation_same_key`: example 2 → keys equal
  - `test_sign_change_different`: example 3 → keys differ, and `typo_match(...).same is False` with reason `"math_token_differs"`
  - `test_shared_passage_different_question_not_typo`: example 4 → keys differ, `typo_match` not same (reason `"too_many_spots"` or `"spot_too_long"`)
  - `test_grammar_punctuation_different`: example 5 (`;` vs `,` before "however") → keys differ. `typo_match` is not same, reason `"in_tested_span"` when the punctuation is inside a blank or underline span. When it isn't, the reason is `"punctuation_differs"`: a spot that differs only by punctuation never counts as a typo.
  - `test_ocr_typo_same`: example 6 ("it took" vs "in took") → `typo_match(...).same is True`, `spots == (("it", "in"),)`
  - `test_typo_in_choice_never_same`: one choice "effect" vs "affect" → not same, reason `"choice_differs"`
  - `test_numeric_answer_equivalence`: numeric answers `"0.5"` and `"1/2"` → equal keys; `"2.4"` vs `"4.8"` → differ
  - `test_repeated_choice_multiplicity`: choices `("5","5","6","7")` vs `("5","6","6","7")` → keys differ
  - `test_domain_not_in_key`: two records differing only in `meta={"domain": ...}` → keys equal
- [ ] **Step 2: Run** the test command. Expected: FAIL (import errors).
- [ ] **Step 3: Implement.** `typo_match` works in this order: if the answer values or sorted choice lists differ → `choice_differs`; if `math_tokens` of the texts differ → `math_token_differs`; then build a word-level diff with `difflib.SequenceMatcher` on normalized words. Any spot that overlaps a tested span → `in_tested_span`. A spot that differs only by punctuation → `punctuation_differs`. More than `MAX_SPOTS` spots → `too_many_spots`. Any side longer than `MAX_SPOT_CHARS` characters of edit distance → `spot_too_long`. Otherwise `same=True`, reason `"ocr_typo"`.
- [ ] **Step 4: Run.** Expected: all pass.
- [ ] **Step 5: Commit** `feat(import-tools): comparison key and OCR typo rule`

### Task 3: Writer lock and intent log

**Files:**

- Create: `scripts/import-tools/kimport/writer.py`
- Test: `scripts/import-tools/tests/test_writer.py`

**Interfaces:**

- Produces: `acquire_lock(lock_path: Path, holder: str, now: str) -> None` (raises `LockHeld(holder, since)` if a lock file exists; there is no automatic expiry, and `release_lock(lock_path, holder)` removes it only when the holder matches); `write_intent(log_path: Path, batch: str, action: str, question_ids: list[str], sql_sha256: str, now: str) -> str` (appends a JSONL line and returns `intent_id`); `close_intent(log_path, intent_id, outcome: str, readback_sha256: str, now: str) -> None` (outcome is `"verified"`, `"rolled_back"` or `"not_applied"`); `open_intents(log_path) -> list[dict]`; `require_no_open_intents(log_path) -> None` (raises `OpenIntent` listing them).
- All writes use temp-file-then-rename (the same pattern as `import-queue.mjs`). The log is append-only and never rewritten; `close_intent` appends a closing line.

- [ ] **Step 1: Write failing tests:** `test_second_holder_refused`, `test_release_wrong_holder_refused`, `test_intent_open_until_closed`, `test_resume_blocks_on_open_intent` (write an intent, simulate a crash by not closing it, then `require_no_open_intents` raises naming the batch), `test_log_append_only` (after open and close the file has 2 lines and the first is unchanged).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with `json` and `os.replace`.
- [ ] **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Commit** `feat(import-tools): writer lock and intent log`

### Task 4: Live export and duplicate sweep

**Files:**

- Create: `scripts/import-tools/sql/live_export.sql`, `scripts/import-tools/kimport/sweep.py`
- Test: `scripts/import-tools/tests/test_sweep.py`

**Interfaces:**

- Consumes: `QuestionRecord`, `comparison_key`, `typo_match`.
- Produces:
  - `live_export.sql`: a read-only `SELECT` returning one JSON row per `quiz_questions` row, with `id, question_text, correct_answer, question_format, figure_kind, figure_table_data, publish_status, import_status, is_live, archived_at, source_version, source_section, source_module, source_question_number, content_hash_v2, created_at`, plus `choices` (`jsonb_agg` of `letter, choice_text ORDER BY letter` from `answer_choices`) and `raw_model_response` from `answer_key_entries`. It covers all rows, live or not.
  - `load_export(path: Path) -> list[QuestionRecord]`: MC `answer` is the text of the choice whose letter is `correct_answer`; `is_live` = `is_live and publish_status in ('publish_ready','publish_ready_with_verified_repair')`.
  - `find_live_duplicates(records) -> list[DuplicateGroup]` with `DuplicateGroup = {keep: str, remove: list[str], relation: "exact"|"ocr_typo"|"typo_review"|"figure_review", evidence: list[dict], keeper_tie: bool}`. It groups only live records; `records` is the whole export, because rows outside a group are the word evidence. Exact-only groups keep the earliest `created_at`. In a typo group the keeper is the copy whose spot words are more common in rows outside the group (ruling R8). Outside is decided on text alone (ruling R9): every exported row, of any status, answer or choices, whose words equal or are within the typo spot limits of a candidate's words is left out of the count. If that is a tie, the relation is `"typo_review"`, `keeper_tie` is true and nothing is removed. Any figure-bearing group is reported with relation `"figure_review"` and has no `remove` list.
  - `unpublish_sql(groups, export_by_id) -> str`: one `DO` block per removed row. It locks the row `FOR UPDATE` and raises `'published state changed'` unless `publish_status`, `import_status`, `is_live` and `content_hash_v2` equal the exported values. It then sets `publish_status='needs_human_review'`, `import_status='needs_review'`, `import_flag_reason='duplicate of <keep id>; un-published by sweep'`, and `answer_key_entries.raw_model_response->'student_publication_allowed'` to `false`. The shape matches the existing `*-rollback.sql`.
  - `republish_sql(groups, export_by_id) -> str`: the exact inverse, for undo.
- CLI: `kimport-cli.py sweep --export live.json --out pipeline/sweep/` writes `groups.json`, `report.md` (counts plus a table of pairs), `unpublish.sql` and `republish.sql`.

- [ ] **Step 1: Write failing tests** using a hand-built export fixture `tests/fixtures/export_small.json` (6 rows: an exact pair, a reordered pair, a typo pair, a sign-change non-pair, one non-live copy of a live row):
  - `test_exact_and_reordered_grouped` (2 groups, keep = earlier `created_at`)
  - `test_typo_pair_grouped_keep_clean_copy`
  - `test_sign_change_not_grouped`
  - `test_non_live_not_removed`
  - `test_unpublish_sql_has_guard_per_row` (one `RAISE EXCEPTION 'published state changed'` per removed id, and no `DELETE` anywhere)
  - `test_republish_inverts_unpublish` (same ids, opposite status values)
  - `test_sweep_deterministic` (running twice gives byte-identical `groups.json`)
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Group by `comparison_key` first, then run `typo_match` only on pairs that share `blocking_key(r) = normalized first 40 characters of the text + answer_value` (keeps it under a second for about 3,000 rows).
- [ ] **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Commit** `feat(import-tools): live-bank duplicate sweep`

### Task 5: Migration A and key backfill

**Files:**

- Create: `supabase/migrations/20261021000000_question_comparison_key.sql`, `scripts/import-tools/kimport/backfill.py`
- Test: `scripts/import-tools/tests/test_backfill.py`

**Interfaces:**

- Migration A: `ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS comparison_key text;` plus a plain index `quiz_questions_comparison_key_idx`. There is no uniqueness yet.
- Produces: `backfill_sql(records: list[QuestionRecord], export_by_id: dict) -> str`: batched `UPDATE … SET comparison_key = v.key FROM (VALUES …) v(id, key, hash) WHERE q.id = v.id AND q.content_hash_v2 IS NOT DISTINCT FROM v.hash AND q.comparison_key IS NULL`, in chunks of 500. Rows whose content changed since the export are skipped, not overwritten. A final `SELECT count(*)` reports how many rows are still null.
- CLI: `kimport-cli.py backfill --export live.json --out pipeline/backfill.sql`

- [ ] **Step 1: Write failing tests:** `test_backfill_guards_on_hash`, `test_backfill_chunks_500` (1,201 records give 3 `UPDATE` statements), `test_backfill_never_overwrites` (the SQL contains `comparison_key IS NULL`).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** and write the migration file.
- [ ] **Step 4: Run** the tests, plus `npx tsc --noEmit` and `npm test` (the migration doesn't touch TypeScript; this confirms the repo is still clean).
- [ ] **Step 5: Commit** `feat(db): comparison_key column and backfill generator`

### Task 6: Shared publish builder

**Files:**

- Create: `scripts/import-tools/kimport/publish.py`
- Test: `scripts/import-tools/tests/test_publish.py`

**Interfaces:**

- Consumes: `comparison_key`, `typo_match`, `load_export`, `require_no_open_intents`.
- Produces: `build_publish(private_readback: Path, sealed_preview: Path, export: Path, intents: Path, batch: str) -> PublishBundle`, where `PublishBundle = {publish_sql: str, rollback_sql: str, keys: dict[id, key], precheck: dict}`. It generalizes `build_oct25usv2_rw_m2q11_native_table_publish_sql.py` to N rows, with the same inputs and assertions (hash, status and table data match the private readback). Per row it adds:
  - **Python precheck against the fresh export:** fail if any other row has the same `comparison_key`, or if `typo_match` is same against any row (live or staged).
  - **Inside the `DO` block, before the status update:** `IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.comparison_key = '<key>' AND o.id <> q.id) THEN RAISE EXCEPTION 'duplicate comparison key: %', q.id; END IF;` then `UPDATE … SET comparison_key = '<key>'` together with the existing `publish_status='publish_ready'` update.
  - Everything else in the existing guard is kept as is: the `FOR UPDATE` locks, the payload `jsonb` equality, the source-tuple count, the `approved_tags` manifest hash, and the `student_publication_allowed` flip.
- `build_publish` raises `RefuseToBuild(reason)` when there's an open intent, the export is older than the private readback, any precheck fails, or the batch has more than 27 rows (one module).
- The rollback SQL also resets `comparison_key` to null.
- CLI: `kimport-cli.py publish --batch <name> --readback … --sealed … --export … --intents pipeline/intents.jsonl --out pipeline/batches/<name>/`

- [ ] **Step 1: Write failing tests** with fixtures copied from the real Oct 16 batch `oct25usv2-rw-m2q11-native-table` (`-private-readback.json`, `-sealed-preview.json`):
  - `test_matches_legacy_guard`: generated SQL has the same guard clauses as the legacy `-publish.sql`. Compare after removing whitespace and the new key lines.
  - `test_key_guard_present_per_row`
  - `test_refuses_on_export_duplicate` (add a reordered copy to the export → `RefuseToBuild("duplicate…")`)
  - `test_refuses_on_typo_duplicate`
  - `test_refuses_with_open_intent`
  - `test_refuses_stale_export`
  - `test_rollback_clears_key`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Retire the old generators.** Move `task-3/build_*publish_sql.py` into `task-3/retired/` (a move inside task-3, not Box) and add `retired/README.md` with one line pointing to `kimport-cli.py publish`. Commit the repo change: `feat(import-tools): shared publish builder with duplicate guard`

### Task 7: Batch-start lint

**Files:**

- Create: `scripts/import-tools/kimport/lint.py`
- Test: `scripts/import-tools/tests/test_lint.py`

**Interfaces:**

- Produces: `lint_batch(reviewed: Path, frozen: Path | None, clusters: Path) -> LintResult` with `LintResult = {passed: list[str], pulled: list[{id, code, detail}]}`. Codes (each names one Oct 16 rework class):
  - `PF_FIGURE`: `figure_kind` not in (null, `"table"`); or `"table"` with null `figure_table_data`; or the text references a visual (regex: `\b(figure|graph|table|scatterplot|diagram|shown|chart)\b` with no reviewed asset, unless `figure_kind == "table"`).
  - `PF_ENVELOPE`: `reviewed_answer.evidence.approved_tags` missing, or `approved_tags` present at the top level as well. This mirrors `readCatalogQuestionScope`'s "Reviewed skill evidence is ambiguous".
  - `PF_BINDING`: when `frozen` is given, a row whose `row_sha256` or `content_sha256` isn't in the frozen manifest, or evidence missing `tag_binding_manifest_sha256`.
  - `PF_DIFFICULTY`: `difficulty_level` not an int in 1..7, `difficulty_rubric_version != "karman-legacy-1-7-v1"`, `difficulty_uncertain` true, or an empty `difficulty_rationale`.
  - `PF_DEDUP_STALE`: the row's cluster entry is missing, its `normalizer_version != NORMALIZER_VERSION`, or its role isn't `canonical`.
- Pulled rows go to the problem lane (Task 10) with code `extraction_repair` (for PF_FIGURE or PF_BINDING), `classification_review` (PF_DIFFICULTY or PF_ENVELOPE) or `variant_review` (PF_DEDUP_STALE). The rest of the batch continues.
- CLI: `kimport-cli.py lint --reviewed … --frozen … --clusters pipeline/corpus/clusters.json --lane pipeline/lane.json`

- [ ] **Step 1: Write failing tests:** one fixture row per code that fails only that code, plus `test_clean_row_passes`, plus `test_pulled_rows_dont_block_others` (3 rows with 1 bad → passed has 2).
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(import-tools): batch-start lint`

### Task 8: Corpus clustering

**Files:**

- Create: `scripts/import-tools/kimport/corpus.py`
- Test: `scripts/import-tools/tests/test_corpus.py` (port every case from task-6 `test_dedup.py` and `parallel-g/test_matching_boundary.py`, plus the boundary cases in `parallel-g/matching-boundary-cases.json`)

**Interfaces:**

- Consumes: Tasks 1–2, `load_export`.
- Produces:
  - `load_corpus(c_index: Path, ledger: Path) -> list[QuestionRecord]`. It reads the same inputs as task-6 `dedup.load_current` and keeps its version checks: raise on "C content changed" or "B pointer changed". It also ports `parse_text` and `classify`'s choice parsing and review reasons verbatim, but uses `kimport.normalize` in place of dedup's own `normalize`.
  - `cluster(corpus, live) -> ClusterResult`. Every occurrence gets exactly one role: `canonical | member | pending_answer_dispute | figure_review | founder_review | unparsed`.
    - Edges come from equal `comparison_key` or `typo_match.same`. Union-find runs over those edges only; close matches never chain.
    - `founder_review` covers pairs with the same `answer_value`, no figure, and `difflib` ratio ≥ 0.90 that are neither of the above.
    - Canonical election: a live member always wins. Otherwise pick, in order: a printed key (`reviewed_answer.kind == "official"`), no typo against the cluster's majority text, the fewest `holds` in the ledger, then the lowest occurrence id.
  - `write_outputs(result, out_dir)` writes `clusters.json` (`normalizer_version`, `export_sha256`, `roles`, `clusters`), `founder_pairs.json` and `report.md` with: total occurrences, unique questions, unique questions not yet live, and a line comparing `live + unique_not_live` with 10,000.
- CLI: `kimport-cli.py corpus --c-index … --ledger …/current-readiness-ledger.json --export live.json --out pipeline/corpus/`

- [ ] **Step 1: Write failing tests:** the ported cases, plus `test_one_role_per_occurrence`, `test_no_cluster_two_canonicals`, `test_live_member_is_canonical`, `test_near_never_chains` (A≈B, B≈C, A≉C gives 3 separate founder pairs and no merge), `test_key_conflict_goes_to_dispute`.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Acceptance on real data (read-only):** run `corpus` on the real inputs. Every one of the ledger's 36 `CERTIFIED_DUPLICATE` items must come out as a `member` of the cluster holding its certified live row. Any mismatch is listed in `report.md` with its reason, and each needs an explanation before the corpus output is used.
- [ ] **Step 6: Commit** `feat(import-tools): corpus clustering replaces task-6 dedup.py`

### Task 9: Founder yes/no page

**Files:**

- Create: `scripts/import-tools/kimport/pairs_page.py`
- Test: `scripts/import-tools/tests/test_pairs_page.py`

**Interfaces:**

- Produces: `render_pairs(pairs_json: Path, out_html: Path) -> int` (returns the pair count). It writes a self-contained HTML page with numbered pairs side by side and the differences highlighted with `<mark>`. Each pair has "Same" and "Different" buttons, and an "Copy my answers" button copies `{"pair_id": "same"|"different", …}` as JSON. No network calls, and all text is HTML-escaped. Light and dark mode come from `prefers-color-scheme`.
- `apply_decisions(pairs_json: Path, decisions_json: Path, clusters_json: Path) -> None`: "same" makes the member join the canonical's cluster; "different" makes each its own canonical. Undecided pairs stay `founder_review`, which `PF_DEDUP_STALE` blocks.

- [ ] **Step 1: Write failing tests:** `test_escapes_html` (a stem containing `<script>` is escaped), `test_count`, `test_apply_same_and_different`, `test_undecided_stays_blocked`.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(import-tools): founder close-match review page`

### Task 10: Problem lane and reviewer slices

**Files:**

- Create: `scripts/import-tools/kimport/lane.py`
- Test: `scripts/import-tools/tests/test_lane.py`

**Interfaces:**

- Produces (all on `pipeline/lane.json`, written with temp-file-then-rename):
  - `REASONS = ("needs_figure","asset_hold","no_answer_key","answer_dispute","extraction_repair","skill_unclear","difficulty_unclear","classification_review","variant_review","broken_or_excluded")`
  - `set_aside(lane, occ_id, reason, detail, now)` raises on an unknown reason.
  - `record_attempt(lane, occ_id, method: str, ok: bool, now)`. A second failed attempt with a different `method` makes the item `parked`. A repeat of the same method does not count toward parking.
  - `requeue(lane, reason) -> list[str]` moves every parked or open item with that reason back to `open` (used when a campaign starts).
  - `promote_next_member(clusters, occ_id) -> str | None` makes the next member canonical when a canonical is parked or broken.
  - `next_slice(clusters, lane, ledger, reviewer: str, size: int = 27) -> list[str]` returns canonicals only. It skips anything in the lane or claimed by another reviewer, and picks the oldest unreviewed first (ledger bucket `awaiting_evidence`), staying within one exam module. Claims are recorded in `pipeline/claims.json` so two reviewers never get the same item.
  - `summary(lane) -> dict` gives counts by reason and status, with the oldest age per reason.
- CLI: `kimport-cli.py lane {set-aside|attempt|requeue|summary}` and `kimport-cli.py slice --reviewer r1`.

- [ ] **Step 1: Write failing tests:** `test_unknown_reason_rejected`, `test_two_different_methods_park`, `test_same_method_twice_does_not_park`, `test_requeue_returns_parked`, `test_parked_canonical_promotes_member`, `test_slices_disjoint_between_reviewers`, `test_slice_canonicals_only`.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(import-tools): problem lane and reviewer slices`

### Task 11: No label on agent-solved answers (D4)

**Files:**

- Modify: `src/lib/question-bank/import-core.ts:466-469` (this repo) and the same lines in `task-3/karman-release/src/lib/question-bank/import-core.ts`
- Test: `src/lib/question-bank/import-core.test.ts`

- [ ] **Step 1: Write a failing test** `does not label independently confirmed answers`: a row with `reviewed_answer.kind = "independently_confirmed_generated"` and no `answer_source` gives an insert payload with `answer_source === null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/question-bank/import-core.test.ts`. Expected: FAIL (currently `"inferred"`).
- [ ] **Step 3: Change** the expression to `answer_source: row.answer_source ?? null`, and drop the `kind` branch.
- [ ] **Step 4: Run** the same test (PASS), then the full gates: `npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run check:sizes && npm run cf:build`, plus `npm run sync:taxonomy` and `git diff --exit-code`.
- [ ] **Step 5:** Apply the identical change in karman-release and run its `npx vitest run src/lib/question-bank/import-core.test.ts`. Commit the repo change: `fix(import): no answer-source label on independently confirmed answers`

### Task 12: Migration B and runbook

**Files:**

- Create: `supabase/migrations/20261021000100_question_comparison_key_unique.sql`, `scripts/import-tools/README.md`, `scripts/import-tools/kimport-cli.py` (if not created earlier; it dispatches every subcommand above)
- Modify: `docs/ingestion/reviewed-import-rules.md` (one section: "Duplicate and publish tooling", pointing to the README)
- Test: `scripts/import-tools/tests/test_cli.py`

**Interfaces:**

- Migration B: `CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_live_comparison_key_uniq ON public.quiz_questions (comparison_key) WHERE comparison_key IS NOT NULL AND archived_at IS NULL AND publish_status IN ('publish_ready','publish_ready_with_verified_repair');`
- The README lists the operations sequence below as commands in order, each with the file it produces and its approval point.

- [ ] **Step 1: Write a failing test** `test_cli_lists_all_commands` (`kimport-cli.py --help` names sweep, backfill, publish, lint, corpus, pairs, lane, slice and lock).
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(import-tools): unique live comparison key, CLI and runbook`

---

## Operations sequence (after the code tasks; each live write waits for the founder)

| #   | Action                                                                                                               | Kind                 | Approval                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| O1  | `acquire_lock`; run `live_export.sql` through the connector → `pipeline/live-<date>.json`; refresh the ledger counts | read                 | none                                                                    |
| O2  | Read back US V2 RW M2 Q11 and record the outcome in the intent log                                                   | read                 | none                                                                    |
| O3  | `sweep` → show the founder `report.md`                                                                               | read                 | **founder approves the un-publish list**                                |
| O4  | Run `unpublish.sql`, re-export, confirm the groups are gone                                                          | live write           | from O3                                                                 |
| O5  | Apply migration A, run `backfill.sql`, confirm the null count is 0 for live rows                                     | live write           | **founder go-ahead**                                                    |
| O6  | Apply migration B (fails safely if any live duplicate remains)                                                       | live write           | **founder go-ahead**                                                    |
| O7  | `corpus` → report the unique count against 10,000 (feeds D6)                                                         | read                 | founder sees the number                                                 |
| O8  | `pairs` → send the founder the HTML page; `apply_decisions`                                                          | local                | founder answers                                                         |
| O9  | Reviewers take slices; `lint`; existing stage path; `publish`                                                        | live write per batch | **founder go-ahead per batch** (or a standing approval if he gives one) |
| O10 | After 3 batches: measure q/hour, rework share, lane summary                                                          | read                 | none                                                                    |
