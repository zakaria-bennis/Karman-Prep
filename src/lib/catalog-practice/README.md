# Catalog student practice

Recovered from the tested canonical acceptance head `eb4d72e` onto the live
`efbf196` asset release. Normal skill navigation opens `/learn/practice/[skillId]`.
The entry reads the published catalog through the guarded student action, displays
answer-free question previews, and creates no attempt. Starting practice is an
explicit student action. Sessions, first responses and completion use the existing
service-only `catalog_practice_*` RPCs; no legacy attempt/node history is rewritten.

Question admission rechecks the approved skill/domain, publication gate and payload
seal. Grading and answer evidence remain server-side until a response is saved.
Assigned practice rechecks active ownership and immutable question bindings. Existing
canonical backend tables/functions were deployed separately; this UI integration
contains no SQL migrations, grant changes or educator write actions.
