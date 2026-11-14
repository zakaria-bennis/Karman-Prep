// Reserving a cohort seat from the marketing site (founder, 2026-11-13). Server only.
//   1. startReservation: the family's contact details are saved the moment they are given, and the founder
//      is told, so a reservation left unfinished can be followed up by call or email.
//   2. checkoutReservation: the score, the cohort and the way of paying are added, and Stripe Checkout opens.
//      No account is needed to pay.
//   3. settleReservation: the Stripe webhook marks the seat paid and sends the family their next steps.
//   4. claimReservation: the student creates an account from the link in those steps; the paid seat is
//      attached to it, which opens the platform at once. The founder then places the student in a class
//      by starting score (admin, cohorts).
import type Stripe from "stripe";
import { createReservationCheckoutSession, stripe } from "@/lib/integrations/stripe/client";
import { FROM, resend } from "@/lib/integrations/resend/client";
import { GUARANTEE, MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { recordPurchaseGrant } from "@/lib/plans/resolve";
import { createAdminClient } from "@/lib/supabase/server";
import { openPrograms } from "./programs";
import { contactSchema, seatSchema } from "./schemas";

export type ReserveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "invalid" | "closed" | "server" };

export interface Reservation {
  id: string;
  status: "started" | "paid" | "placed" | "cancelled";
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  student_first_name: string;
  filled_by: "parent" | "student";
  start_score: number | null;
  program_id: string | null;
  payment_option: "full" | "installments" | null;
  claim_token: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  clerk_user_id: string | null;
}

const TABLE = "seat_reservations";
const today = () => new Date().toISOString().slice(0, 10);
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** A plain-text note to the founder. Never throws: a failed email must not fail a reservation. */
async function tellFounder(subject: string, lines: string[], replyTo?: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({ from: FROM, to, replyTo, subject, text: lines.join("\n") });
  } catch (e) {
    console.error("[reserve] founder email failed", e);
  }
}

const describe = (r: Reservation) => [
  `Parent: ${r.parent_name}`,
  `Email: ${r.parent_email}`,
  `Phone: ${r.parent_phone}`,
  `Student: ${r.student_first_name}`,
  `Filled in by: the ${r.filled_by}`,
  `Starting SAT score: ${r.start_score ?? "none yet (needs the placement test)"}`,
  `Cohort: ${r.program_id ?? "not chosen yet"}`,
  `Paying: ${r.payment_option === "installments" ? "deposit and three payments" : r.payment_option === "full" ? "in full" : "not chosen yet"}`,
];

export async function startReservation(input: unknown): Promise<ReserveResult<{ id: string }>> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = parsed.data;
  // a bot filled the hidden field: answer as if it worked, and keep nothing
  if (c.company) return { ok: true, value: { id: crypto.randomUUID() } };
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .insert({
      filled_by: c.filledBy,
      parent_name: `${c.parentFirst} ${c.parentLast}`,
      parent_email: c.parentEmail,
      parent_phone: c.parentPhone,
      student_first_name: c.studentFirst,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[reserve] could not save the reservation", error);
    // the founder still hears about it, so the family is not lost
    await tellFounder("Seat reservation started (NOT saved)", [
      "The database refused this reservation. This email is the only record.",
      `Parent: ${c.parentFirst} ${c.parentLast}`,
      `Email: ${c.parentEmail}`,
      `Phone: ${c.parentPhone}`,
      `Student: ${c.studentFirst}`,
    ]);
    return { ok: false, error: "server" };
  }
  const r = data as Reservation;
  await tellFounder(
    "Seat reservation started, not paid yet",
    [
      "A family began reserving a cohort seat. If no payment follows, reach out.",
      "",
      ...describe(r),
    ],
    r.parent_email
  );
  return { ok: true, value: { id: r.id } };
}

export async function checkoutReservation(input: unknown): Promise<ReserveResult<{ url: string }>> {
  const parsed = seatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const s = parsed.data;
  if (!openPrograms(today()).some((p) => p.id === s.programId))
    return { ok: false, error: "closed" };
  const db = createAdminClient();
  const { data: row } = await db.from(TABLE).select("*").eq("id", s.reservationId).maybeSingle();
  const r = row as Reservation | null;
  if (!r || r.status !== "started") return { ok: false, error: "invalid" };
  try {
    const customerId =
      r.stripe_customer_id ??
      (
        await stripe.customers.create({
          email: r.parent_email,
          name: r.parent_name,
          phone: r.parent_phone,
          metadata: { reservationId: r.id },
        })
      ).id;
    const session = await createReservationCheckoutSession({
      customerId,
      reservationId: r.id,
      programId: s.programId,
      payment: s.payment,
      successUrl: `${appUrl()}/reserve/welcome?r=${r.claim_token}`,
      cancelUrl: `${appUrl()}/reserve?back=${r.id}`,
    });
    if (!session.url) return { ok: false, error: "server" };
    await db
      .from(TABLE)
      .update({
        start_score: s.startScore ? Number(s.startScore) : null,
        program_id: s.programId,
        payment_option: s.payment,
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    return { ok: true, value: { url: session.url } };
  } catch (e) {
    console.error("[reserve] checkout could not start", e);
    return { ok: false, error: "server" };
  }
}

/** The family's next steps, by email. Plain text, so nothing typed into the form can run anywhere. */
async function welcomeFamily(r: Reservation) {
  if (!process.env.RESEND_API_KEY) return;
  const link = `${appUrl()}/reserve/welcome?r=${r.claim_token}`;
  const lines = [
    `${r.student_first_name}'s seat is reserved. Thank you.`,
    "",
    "What happens next:",
    `1. Create ${r.student_first_name}'s account here, so the platform opens today: ${link}`,
    r.start_score
      ? `2. Email ${r.student_first_name}'s official SAT score report (the PDF from the College Board account) to ${GUARANTEE.claimEmail}. That sets the starting score for the guarantee.`
      : `2. We'll email you a time for ${r.student_first_name}'s placement test. It sets the starting score for the guarantee.`,
    "3. We place your student in a class with others at the same score, and send the class times before the first week.",
    "",
    r.payment_option === "installments"
      ? `You paid the ${formatPrice(MP.depositAmount)} deposit today. The ${MP.installments.count} payments of ${formatPrice(MP.installments.amount)} follow monthly from the first class.`
      : `You paid ${formatPrice(MP.price)} in full.`,
    "",
    "Reply to this email with any question. A person answers.",
  ];
  try {
    await resend.emails.send({
      from: FROM,
      to: r.parent_email,
      subject: `${r.student_first_name}'s seat at Karman is reserved`,
      text: lines.join("\n"),
    });
  } catch (e) {
    console.error("[reserve] family email failed", e);
  }
}

/** The Stripe webhook's call when a reservation's checkout is paid. Safe to run twice. */
export async function settleReservation(
  session: Pick<Stripe.Checkout.Session, "id" | "metadata" | "customer">
): Promise<"paid" | "already" | "missing"> {
  const id = session.metadata?.reservationId;
  if (!id) return "missing";
  const db = createAdminClient();
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "started")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: seen } = await db.from(TABLE).select("id").eq("id", id).maybeSingle();
    return seen ? "already" : "missing";
  }
  const r = data as Reservation;
  await tellFounder(
    `PAID: cohort seat for ${r.student_first_name}`,
    [
      "A cohort seat was paid for. Place the student in a class in Admin, Cohorts.",
      "",
      ...describe(r),
    ],
    r.parent_email
  );
  await welcomeFamily(r);
  return "paid";
}

export async function findReservation(token: string): Promise<Reservation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("*")
    .eq("claim_token", token)
    .maybeSingle();
  return (data as Reservation | null) ?? null;
}

/** Attaches a paid seat to the student's new account and opens the platform. One account per seat. */
export async function claimReservation(
  token: string,
  clerkUserId: string
): Promise<"claimed" | "yours" | "taken" | "unpaid" | "missing"> {
  const r = await findReservation(token);
  if (!r) return "missing";
  if (r.clerk_user_id) return r.clerk_user_id === clerkUserId ? "yours" : "taken";
  if (r.status !== "paid" && r.status !== "placed") return "unpaid";
  const { data } = await createAdminClient()
    .from(TABLE)
    .update({ clerk_user_id: clerkUserId, claimed_at: new Date().toISOString() })
    .eq("id", r.id)
    .is("clerk_user_id", null)
    .select("id")
    .maybeSingle();
  if (!data) return "taken";
  await recordPurchaseGrant({
    userId: clerkUserId,
    planId: "cohort",
    checkoutSessionId: r.stripe_checkout_session_id ?? `reservation:${r.id}`,
  });
  await tellFounder(`Account created for ${r.student_first_name}`, [
    "The student's account now holds the paid seat. Place them in a class in Admin, Cohorts.",
    "",
    ...describe(r),
  ]);
  return "claimed";
}
