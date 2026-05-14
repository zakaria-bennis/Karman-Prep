<!--
Thanks for the PR. Fill in everything below; the boilerplate is here to make
the review fast and the rollback easy if something breaks in prod.
-->

## Summary

<!-- 1-3 sentences: what changes and why. Skip the "what" if it's obvious from the diff. -->

## Test plan

<!--
How did you verify this works?
- For UI: paste a screenshot or describe the click-path
- For backend: which endpoints/scripts/queries did you exercise?
- For migrations: did you run it against a real DB? Was it idempotent?
-->

- [ ]
- [ ]

## Rollback

<!--
If this lands in prod and breaks something, what's the recovery path?
- "git revert this commit + npm run cf:deploy" is the default.
- For migrations: write the inverse SQL inline OR mark this as "no rollback —
  forward fix only" and explain why.
-->

## Affected areas

<!-- Tick what this touches so reviewers know what to focus on. -->

- [ ] Frontend (UI)
- [ ] API routes / server actions
- [ ] Database (migration or schema-affecting query)
- [ ] Stripe / payouts
- [ ] Email / Resend
- [ ] Cron / background jobs
- [ ] Documentation only

## Checklist

- [ ] CI is green (typecheck, lint, build)
- [ ] No new secrets introduced (or `.env.example` updated)
- [ ] No `console.log` left in committed code (use the structured logger)
- [ ] If this changes user-facing copy, the change is intentional
- [ ] Reviewer assigned via CODEOWNERS auto-request

## Screenshots / context

<!-- Optional. Drop screenshots, links to Sentry, related issues, etc. -->
