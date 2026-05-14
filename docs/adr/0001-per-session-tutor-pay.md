# 0001 — Per-session pay model for tutor payouts

- **Status**: Accepted
- **Date**: 2026-05-13
- **Deciders**: @zakaria-bennis

## Context

When the tutor-payout system was first implemented, the database schema treated each `bookings` row (one per enrolled student per session) as a payable unit. For 1:1 (Private/Elite) bookings this is correct: one student, one booking, one session. For group sessions (Small Group, Seminar) it overcounted dramatically — an 8-student seminar would pay the tutor 8× the hourly rate.

The product reality:

- A tutor leads ONE session regardless of how many students are enrolled
- A 1-hour seminar with 12 students = the same hour of tutor work as a 1-hour Private session with 1 student
- Per the founder's directive: _"$35/hour of sessions tutored — there's no multiplier based on the number of students in the class"_

## Decision

Introduce a new top-level `sessions` table representing the actual class meeting. Each booking links to it via `session_id` (FK). All payout fields (`payout_status`, `payout_amount`, `tutor_hours`, `recap_email_sent`, `transcript`, `status_draft`) live on `sessions`, not `bookings`.

For 1:1: one booking ↔ one session.
For group: many bookings → one session.

The tutor earnings view (`tutor_earnings_summary`) aggregates from `sessions` only — bookings are a Stripe-charging concern, not a payout concern.

## Alternatives considered

- **Per-booking pay with `is_primary_session=true` flag** — designate one booking per session as the "payout-bearing" one, others zero. Rejected: hacky, easy to break invariant during inserts, doesn't model reality cleanly.
- **Divide gross fee by N at payout time** — keep per-seat bookings, let the payout calculation normalize. Rejected: still wrong if we want to query "how many sessions has this tutor led?" and would require maintaining a parallel per-session count anyway.
- **Leave it 1:1-only forever** — punt the group-class problem indefinitely. Rejected: small-group + seminar tiers are part of the launch product per pricing memo; can't ship without them.

## Consequences

- ✅ Pay math now matches reality: one session = one $X payment to the tutor regardless of enrollment
- ✅ The `sessions` table becomes the natural anchor for Zoom attendance integration (each session has one Zoom meeting; many bookings can share it)
- ✅ Recap-email idempotency is at the session level — tutor sends one recap that goes to all enrolled students+parents at once, instead of clicking "Send" N times
- ⚠️ Migration cost: 7 SQL migrations (023-029) to add the table, link bookings, backfill, rebuild materialized view, drop the per-seat fields. All applied successfully.
- ⚠️ Frontend complexity: the earnings UI now has to show "cohort name + N enrolled" for group sessions vs single student name for 1:1
- 🔄 Future revisit: if we ever introduce per-student rate adjustments (e.g. premium price for a 1:1 student in a group-class slot), the model will need rethinking
