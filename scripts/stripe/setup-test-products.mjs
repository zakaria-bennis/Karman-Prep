#!/usr/bin/env node
// ============================================================
// scripts/stripe/setup-test-products.mjs — creates the plan
// ladder's products and prices in Stripe TEST mode.
//
// Usage, from the repo root (no npm script needed):
//   node scripts/stripe/setup-test-products.mjs --dry-run   # show what would change, write nothing
//   node scripts/stripe/setup-test-products.mjs             # create what is missing
//   node --env-file=<file> scripts/stripe/setup-test-products.mjs   # use another env file
//
// Reads STRIPE_SECRET_KEY from the environment or .env.local and
// refuses to run unless it is a test key (sk_test_...). The key is
// never printed.
//
// Lookup keys, amounts and terms come from
// src/lib/integrations/stripe/prices.ts, which reads
// src/lib/marketing/offer.ts, so they cannot drift from the site.
// Safe to re-run: each price is found by its lookup key and only
// created when missing. When offer.ts changes an amount or interval,
// a new price takes over the lookup key (transfer_lookup_key) and the
// old price keeps billing the subscriptions already on it. Checkout
// finds prices by lookup key, so no price ids go into env files.
// ============================================================

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { register as registerCjs } from "tsx/cjs/api";
import { register as registerEsm } from "tsx/esm/api";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dryRun = process.argv.includes("--dry-run");

// ── .env.local loader (no dotenv dep; exported vars win) ────
try {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  console.error("⚠  .env.local not found — relying on already-exported env vars");
}

const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
if (!secretKey.startsWith("sk_test_")) {
  console.error(
    "✗ Refusing to run: STRIPE_SECRET_KEY is missing or is not a test key (sk_test_...). This script only writes to Stripe test mode."
  );
  process.exit(1);
}

// Load the TypeScript price table with tsx, resolving the "@/" imports
// through the repo's tsconfig whatever the working directory is.
process.env.TSX_TSCONFIG_PATH = resolve(root, "tsconfig.json");
registerCjs();
registerEsm({ tsconfig: process.env.TSX_TSCONFIG_PATH });
const { STRIPE_PRICES, priceLabel } = await import("../../src/lib/integrations/stripe/prices.ts");

const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });

/** True when an existing Stripe price bills exactly what offer.ts says. */
function matches(price, spec) {
  const months = price.recurring?.interval === "month" ? price.recurring.interval_count : null;
  return (
    price.active &&
    price.unit_amount === spec.amount * 100 &&
    price.currency === "usd" &&
    (spec.intervalMonths ? months === spec.intervalMonths : price.type === "one_time")
  );
}

async function main() {
  const { data: existing } = await stripe.prices.list({
    lookup_keys: STRIPE_PRICES.map((p) => p.lookupKey),
    expand: ["data.product"],
    limit: 100,
  });
  const priceByKey = new Map(existing.map((p) => [p.lookup_key, p]));

  // One product per plan, tagged with metadata.plan_id.
  const productByPlan = new Map();
  for (const price of existing) {
    const product = price.product;
    if (product && typeof product === "object" && !product.deleted && product.metadata?.plan_id) {
      productByPlan.set(product.metadata.plan_id, product.id);
    }
  }
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    const planId = product.metadata?.plan_id;
    if (planId && !productByPlan.has(planId)) productByPlan.set(planId, product.id);
  }

  const rows = [];
  for (const spec of STRIPE_PRICES) {
    const current = priceByKey.get(spec.lookupKey);
    if (current && matches(current, spec)) {
      rows.push([spec.lookupKey, current.id, priceLabel(spec), "exists"]);
      continue;
    }

    const newProduct = !productByPlan.has(spec.planId);
    const verb = current ? `replace ${current.id}` : "create";
    const note = newProduct ? `${verb} (new product "${spec.productName}")` : verb;
    if (dryRun) {
      rows.push([spec.lookupKey, current?.id ?? "-", priceLabel(spec), `would ${note}`]);
      continue;
    }

    if (newProduct) {
      const product = await stripe.products.create({
        name: spec.productName,
        metadata: { plan_id: spec.planId },
      });
      productByPlan.set(spec.planId, product.id);
    }
    const created = await stripe.prices.create({
      product: productByPlan.get(spec.planId),
      currency: "usd",
      unit_amount: spec.amount * 100,
      ...(spec.intervalMonths
        ? { recurring: { interval: "month", interval_count: spec.intervalMonths } }
        : {}),
      lookup_key: spec.lookupKey,
      transfer_lookup_key: true,
      nickname: `${spec.productName}, ${priceLabel(spec)}`,
      metadata: { plan_id: spec.planId, term: spec.term },
    });
    rows.push([spec.lookupKey, created.id, priceLabel(spec), current ? "replaced" : "created"]);
  }

  const header = ["lookup key", "price id", "amount", "result"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(dryRun ? "Dry run: nothing was written.\n" : "");
  console.log(line(header));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) console.log(line(row));
}

main().catch((err) => {
  // Message only: never echo request details.
  console.error(`✗ ${err?.message ?? err}`);
  process.exit(1);
});
