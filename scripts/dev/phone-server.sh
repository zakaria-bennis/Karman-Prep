#!/bin/sh
# The test copy of the site for a phone on a cable (and this computer's own browser), on port 3440.
# It runs against the local practice database as a made-up Cohort student, so nothing real is
# touched (docs/overnight/local-db.md). On the phone, open http://karman.local:3440
#
#   sh scripts/dev/phone-server.sh
cd "$(dirname "$0")/../.." || exit 1
trap 'kill 0' EXIT
set -a
eval "$(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' /Users/zakariabennis/Karman-Prep-wt/overnight.env.local)"
set +a
node scripts/dev/phone-bridge.mjs 3440 &
SLACK_BOT_TOKEN= RESEND_API_KEY= DEV_IMPERSONATE_CLERK_ID=dev_seed_student_cohort \
  DEV_ORIGINS='karman.local,*.local,169.254.*.*' NEXT_PUBLIC_APP_URL=http://localhost:3440 \
  npx next dev -H 127.0.0.1 -p 3440
