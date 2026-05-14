-- ============================================================
-- Migration: add Stripe Connect support for tutor payouts.
--
-- Locked decisions (2026-05-10):
--   B1 — fully self-serve, no admin approval gate
--   C1 — Instant + ACH both in v1
--   D1 — Express Connect accounts
--   A1 — 2.5% app fee on instant; ACH free
--
-- Adds Stripe identifiers + per-payout method tracking. Keeps
-- the existing zelle_* columns intact for now (harmless, will
-- drop in a follow-up cleanup migration once we're sure no
-- code references them).
--
-- Idempotent. Run in Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- 1. users — Stripe Connect account tracking
-- ──────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_at TIMESTAMPTZ;

COMMENT ON COLUMN users.stripe_connect_account_id   IS 'acct_xxx — Stripe Express Connect account id';
COMMENT ON COLUMN users.stripe_payouts_enabled      IS 'True after Stripe verifies the account is ready to receive transfers';
COMMENT ON COLUMN users.stripe_connect_onboarded_at IS 'When the tutor finished Stripe onboarding (charges_enabled becomes true)';

-- Update the payment_method default for new tutors
ALTER TABLE users ALTER COLUMN payment_method SET DEFAULT 'stripe';
COMMENT ON COLUMN users.payment_method IS 'stripe | manual (zelle deprecated — keep column for backfill but new rows default to stripe)';

-- ──────────────────────────────────────────────────────────
-- 2. payout_requests — Stripe transfer + per-payout method
-- ──────────────────────────────────────────────────────────
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS payout_method          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS stripe_transfer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payout_id       TEXT,
  ADD COLUMN IF NOT EXISTS application_fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount             NUMERIC(10,2);

COMMENT ON COLUMN payout_requests.payout_method          IS 'instant | standard';
COMMENT ON COLUMN payout_requests.stripe_transfer_id     IS 'tr_xxx — platform → Connect account transfer';
COMMENT ON COLUMN payout_requests.stripe_payout_id       IS 'po_xxx — Connect account → tutor bank/card';
COMMENT ON COLUMN payout_requests.application_fee_amount IS 'USD deducted from gross before transfer (instant only)';
COMMENT ON COLUMN payout_requests.net_amount             IS 'total_amount − application_fee_amount = what tutor receives';

-- Backfill: any pre-Stripe rows are zelle/manual; mark them
-- so the new code can ignore them in self-serve flows.
UPDATE payout_requests
   SET payout_method = COALESCE(payout_method, payment_method)
 WHERE payout_method IS NULL;

-- Default new rows to standard ACH (most common)
ALTER TABLE payout_requests ALTER COLUMN payment_method SET DEFAULT 'stripe';

-- ──────────────────────────────────────────────────────────
-- 3. Index for Stripe webhook lookups
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payout_requests_stripe_transfer
  ON payout_requests(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_requests_stripe_payout
  ON payout_requests(stripe_payout_id)   WHERE stripe_payout_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect
  ON users(stripe_connect_account_id)    WHERE stripe_connect_account_id IS NOT NULL;

COMMIT;

-- ──────────────────────────────────────────────────────────
-- Sanity check (run separately):
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name='users'
--     AND column_name IN ('stripe_connect_account_id','stripe_payouts_enabled','payment_method');
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name='payout_requests'
--     AND column_name IN ('payout_method','stripe_transfer_id','application_fee_amount','net_amount');
-- ──────────────────────────────────────────────────────────
