# Scripts

CLI scripts that run **outside the deployed app** — admin tasks, seed data,
maintenance, and one-off pipeline tooling. Most are `node --env-file=.env.local …`.

## Layout

| Folder                                 | Purpose                                                                          | Safety                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **[`admin/`](./admin/)**               | User / role management (one-shot, run as needed)                                 | Safe — narrow scope                                        |
| **[`seed/`](./seed/)**                 | Seed test data into the dev database                                             | Safe — but use `--reset` carefully                         |
| **[`maintenance/`](./maintenance/)**   | Wipe / recover / requeue / migrate                                               | **Destructive** — read each script's header before running |
| **[`pdf-pipeline/`](./pdf-pipeline/)** | Old SAT PDF ingestion daemon (mostly deprecated; replaced by ChatGPT Custom GPT) | Read-mostly                                                |
| **[`build/`](./build/)**               | Build-time helpers invoked by `npm run cf:build`                                 | Don't run by hand                                          |
| **[`tests/`](./tests/)**               | Manual smoke-test scripts                                                        | Safe — exercise specific paths                             |
| **[`launchd/`](./launchd/)**           | macOS launchd plist + installer for the now-paused PDF-watch daemon              | Don't reinstall unless you also restart the daemon         |

---

## When to run what

### Admin onboarding

```bash
# Promote a user to admin (after they sign up at karmanprep.com/auth/sign-up)
node --env-file=.env.local scripts/admin/grant-admin.mjs <email>
```

### Seed test data (dev)

```bash
# Create 7 fake sessions (5 1:1 + 1 small_group + 1 seminar) for the admin tutor.
# --reset clears existing test data first.
node --env-file=.env.local scripts/seed/seed-test-payout-data.mjs [--reset]
```

### Maintenance — destructive

| Command                                                                   | What it wipes                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `node --env-file=.env.local scripts/maintenance/wipe-bank.mjs`            | Every `quiz_questions` + `quiz_attempts` row (preserves curriculum tree + PDF jobs) |
| `node --env-file=.env.local scripts/maintenance/wipe-image-questions.mjs` | Only image-bearing questions (text-only ones survive)                               |
| `node --env-file=.env.local scripts/maintenance/reset-diagnostics.mjs`    | All diagnostic attempts + responses                                                 |

**Read each script's top-of-file comment before running.** They're idempotent but they delete real data.

### Maintenance — recovery (very rarely needed)

| Command                                        | When                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `scripts/maintenance/recover-answerkeys.mjs`   | A batch of CSVs imported with bad answer keys — re-runs answer-key extraction against the original PDFs |
| `scripts/maintenance/recover-domain-bug.mjs`   | Older bug where 48 rows got domain-normalized incorrectly                                               |
| `scripts/maintenance/requeue-failed-jobs.mjs`  | Reset failed `pdf_processing_jobs` rows back to queued status                                           |
| `scripts/maintenance/fix-smoke-test-rows.mjs`  | One-off fixup from an earlier smoke test                                                                |
| `scripts/maintenance/migrate-images-to-r2.mjs` | One-off migration of inline-base64 images to R2 storage                                                 |

### PDF pipeline (mostly deprecated)

The old PDF → CSV pipeline used `scripts/pdf-pipeline/pull-pdf-job.mjs` (running as a launchd daemon) to invoke Claude on each PDF. **This flow is now superseded by the ChatGPT Custom GPT** — see [`/question-imports/chatgpt/KarmanGPT.txt`](../question-imports/chatgpt/KarmanGPT.txt).

The scripts below still work but are not part of the day-to-day flow:

```bash
npm run pdf:pull       # poll once
npm run pdf:watch      # run as foreground daemon
npm run pdf:finalize   # finalize a specific job after a CSV upload
```

For one-off CSV → bank imports outside the admin UI:

```bash
node --env-file=.env.local scripts/pdf-pipeline/import-csv-direct.mjs <path/to/file.csv>
```

### Build (called automatically by `cf:build`)

```bash
# This runs as part of `npm run cf:build` — don't invoke directly.
node scripts/build/patch-cf-worker.mjs
```

It injects a `scheduled()` handler into `.open-next/worker.js` so Cloudflare Cron Triggers reach our `/api/cron/*` routes.

### Tests

```bash
node --env-file=.env.local scripts/tests/test-dm-reply.mjs
node --env-file=.env.local scripts/tests/test-reply.mjs
```

These exercise specific code paths during development; safe to run anytime.
