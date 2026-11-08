// ============================================================
// Local-only demo data for the cohort scholarship.
//
// Uploads sample score reports for three students of the
// "Summer Cohort 1400 to 1600" (supabase/seeds/overnight/
// admin-scholarship.sql) through the real submit flow, so the
// files land in private storage and the automatic check runs.
// Also creates $995 cohort payments in Stripe TEST mode so the
// payout can be tried. Refuses to run against anything but the
// local database and a Stripe test key.
//
//   npx tsx --env-file=.env.local scripts/scholarship/seed-local-claims.ts
//   (add --pdfs-only <dir> to just write the sample PDFs)
// ============================================================

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Stripe from "stripe";
import { PDFDocument, StandardFonts } from "pdf-lib";

const COHORT_ID = "5c0a1a10-0002-4000-8000-000000000001";

interface Sample {
  clerkId: string;
  userId: string;
  name: string;
  total: number;
  rw: number;
  math: number;
  declared: number;
  editedWith?: string;
  pay: boolean;
}

const SAMPLES: Sample[] = [
  {
    clerkId: "dev_seed_scholar_ella",
    userId: "5c0a1a10-0001-4000-8000-000000000001",
    name: "Ella Brooks",
    total: 1520,
    rw: 750,
    math: 770,
    declared: 1520,
    pay: true,
  },
  {
    clerkId: "dev_seed_scholar_omar",
    userId: "5c0a1a10-0001-4000-8000-000000000002",
    name: "Omar Haddad",
    total: 1490,
    rw: 720,
    math: 770,
    declared: 1490,
    editedWith: "Smallpdf.com",
    pay: true,
  },
  {
    clerkId: "dev_seed_scholar_zoe",
    userId: "5c0a1a10-0001-4000-8000-000000000003",
    name: "Zoe Martin",
    total: 1450,
    rw: 700,
    math: 750,
    declared: 1550,
    pay: false,
  },
];

async function sampleReport(s: {
  name: string;
  total: number;
  rw: number;
  math: number;
  editedWith?: string;
}): Promise<Uint8Array> {
  const created = new Date("2026-10-17T14:05:00Z");
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setProducer("Skia/PDF m131");
  doc.setCreator("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0.0.0 Safari/537.36");
  doc.setTitle("SAT Score Report");
  doc.setCreationDate(created);
  doc.setModificationDate(created);
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const lines: Array<[string, boolean, number]> = [
    ["College Board", true, 14],
    ["SAT Score Report", true, 20],
    [`Name: ${s.name}`, false, 12],
    ["Test Date: October 3, 2026", false, 12],
    ["Total Score", true, 12],
    [String(s.total), true, 28],
    [`Score Range ${s.total - 30}-${s.total + 30}`, false, 10],
    ["Reading and Writing", true, 12],
    [String(s.rw), true, 18],
    ["Math", true, 12],
    [String(s.math), true, 18],
    ["collegeboard.org", false, 9],
  ];
  let y = 730;
  for (const [text, isBold, size] of lines) {
    page.drawText(text, { x: 56, y, size, font: isBold ? bold : font });
    y -= size + 14;
  }
  const bytes = await doc.save({ useObjectStreams: false });
  if (!s.editedWith) return bytes;
  const again = await PDFDocument.load(bytes, { updateMetadata: false });
  again.setProducer(s.editedWith);
  again.setModificationDate(new Date("2026-10-20T09:12:00Z"));
  return again.save();
}

function assertLocal(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error("Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the local database.");
  }
  if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) {
    throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a test key.");
  }
}

async function ensureCohortPayment(stripe: Stripe, s: Sample): Promise<string> {
  const query = `metadata['cohort_id']:'${COHORT_ID}' AND metadata['user_id']:'${s.userId}' AND status:'succeeded'`;
  const found = await stripe.paymentIntents.search({ query, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const customer = await stripe.customers.create({
    email: `${s.clerkId.replace("dev_seed_scholar_", "")}.parent@karman.local`,
    name: `${s.name.split(" ")[1]} family`,
    metadata: { user_id: s.userId, seed: "admin-scholarship" },
  });
  const pi = await stripe.paymentIntents.create({
    amount: 99500,
    currency: "usd",
    customer: customer.id,
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    description: "Summer Cohort 1400 to 1600 (local demo)",
    metadata: {
      cohort_id: COHORT_ID,
      user_id: s.userId,
      plan_id: "cohort",
      seed: "admin-scholarship",
    },
  });
  return pi.id;
}

async function main(): Promise<void> {
  const pdfsOnly = process.argv.indexOf("--pdfs-only");
  if (pdfsOnly !== -1) {
    const dir = process.argv[pdfsOnly + 1] ?? ".";
    await mkdir(dir, { recursive: true });
    const all = [...SAMPLES, { name: "Ben Carter", total: 1430, rw: 700, math: 730 }];
    for (const s of all) {
      const file = path.join(dir, `${s.name.toLowerCase().replace(/\s+/g, "-")}-score-report.pdf`);
      await writeFile(file, await sampleReport(s));
      console.log("wrote", file);
    }
    return;
  }

  assertLocal();
  const { submitClaim } = await import("../../src/lib/scholarship/service");
  for (const s of SAMPLES) {
    const row = await submitClaim({
      clerkId: s.clerkId,
      cohortId: COHORT_ID,
      declaredTotalScore: s.declared,
      declaredTestDate: "2026-10-03",
      fileName: `${s.name.split(" ")[0].toLowerCase()}-sat-score-report.pdf`,
      bytes: await sampleReport(s),
    });
    console.log(`${s.name}: claim ${row.id.slice(0, 8)}, check ${row.check_verdict}`);
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  for (const s of SAMPLES.filter((x) => x.pay)) {
    console.log(
      `${s.name}: cohort payment ${await ensureCohortPayment(stripe, s)} (Stripe test mode)`
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
