# Read-only educator briefing

This slice starts from live `5143993f9c9d313ba76e9ed7db4df72e9eed50e7`. It reuses the existing tutor relationship boundary, canonical practice snapshots, recorded answers and assignment headers. It does not change schema, grants, auth settings, student attempts, scoring, booking or email behavior.

## Available workflow

- `/tutor` → **Daily briefing** lists the real educator's scheduled sessions on a chosen day in their recorded account timezone, including sessions earlier that day. Only students in their current roster are shown. Missing timezone or read errors are explicit, not a guessed date or empty day.
- Each student link opens `/tutor/[studentId]/briefing`. The current relationship is checked again before any private student or practice read. This shows the most recent 30 skill-practice sessions, original recorded misses, assignment labels where matching metadata exists, and an exact historical review link. Earlier quiz history remains at the existing student record. A cap is labeled; this is not an exhaustive archive.
- `/tutor/[studentId]/practice/[sessionId]` checks the current relationship, exact student and session again. It renders the frozen question display through the same `CatalogQuestion` component used by canonical student practice. Original answers/results are in native disclosure controls. Educator selections remain in component state, are not graded, and call no start/resume/submit/complete service. Stored keys, explanations and private source evidence are omitted from client data.
- Admins retain the existing real-account permission. Impersonation/preview does not turn into practice access for a different real account. No preview persona's history is silently substituted.

The daily page loads schedule and roster metadata only. Snapshot/answer reads happen when an authorized educator opens a particular student's briefing, rather than fetching every student's question payload at once. The daily candidate search has an explicit 200-row envelope limit and fails visibly if it would truncate.

## Existing schema, unchanged

The saved production receipt at `private21-production-execution-20261008/EXECUTION_RECEIPT.json` records the approved canonical backend migration `20261008032508`; `schema-postflight.json` records service-role-only access for the four canonical tables. This reader uses only existing `users`, `bookings`, `catalog_practice_sessions`, `catalog_practice_responses`, and `catalog_assignments` columns. No live schema or learner-data query was made to prepare this patch. Fresh authenticated runtime acceptance is separate from that saved schema evidence.

## Session homework remains dependent

Do not infer a booking link from an assignment's free-form `due_at`, or turn unlinked practice into session-homework completion. The earlier `336e97f`/`80ade8f`/`62b580c` educator proposals were reviewed as inputs, not wholesale integrated.

The existing pure `session-homework-policy` and `homework-notice-policy` contracts/tests are carried forward from task-10 `62b580c`:

- Due at **23:59 on the prior calendar day in the student's pinned IANA timezone**.
- Separate grace until **08:00 on the session's local calendar day** before considering a parent notice. Completion observed before the final send decision suppresses it, including a later completion observed before send.
- Missing/invalid timezone, cancelled/rescheduled booking, inactive assignment and cross-student inputs cannot become a send authorization. Original attempts remain untouched. DST and quarter-hour offsets are tested.

These pure functions are not connected to a scheduler, sender, student deadline display, or transaction. The booking-to-assignment link, pinned timezone/deadline storage, atomic create/link operation, fresh completion and exact `parent_student_links` recipient recheck, idempotent audited outbox and notification delivery remain dependent on their exact schema/security approval and rehearsal. This patch adds no migration, grants, sender or parent email. The student portal must continue to say linked session homework is unavailable until that independent workflow is ready.

## Validation scope

Synthetic tests exercise positive and negative authorization, owner/ordinal/question binding, missing/error/capped data, unavailable results, timezone day grouping, original answers and local-only interaction. No student activity or fake production records are created. A release requires independent candidate acceptance and the normal production build/runtime checks. An anonymous login redirect does not establish authenticated educator behavior.

Supabase's current [select documentation](https://supabase.com/docs/reference/javascript/select) and [changelog](https://supabase.com/changelog) were checked; this uses the installed client query API without changing dependencies or database behavior.
