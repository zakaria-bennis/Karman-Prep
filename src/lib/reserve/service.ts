// Reserving a cohort seat from the marketing site (founder, 2026-11-13). Server only.
//   1. startReservation: the email is saved the moment it is given, and the founder is told, so a
//      reservation left unfinished can be followed up. saveDetails adds the names and the phone.
//      The account comes first (founder, 2026-11-25: nobody pays before they have an account): the
//      reservation keeps the account that is making it (details.buyer).
//   2. checkoutReservation: the cohort and the way of paying are added, and our payment page opens.
//   3. settleReservation: marks the seat paid, attaches it to the buyer's account at once (a student's
//      account gets the seat and the plan; a parent's account becomes the seat's parent account), and
//      sends the family their next steps.
//      saveRegistration: right after paying, the family answers the few questions that get the student
//      started (score, goal, what is hardest, class times). Asked after payment on purpose.
//   4. claimReservation: when a parent bought the seat, the student opens their own link and makes
//      their account; the paid seat is attached to it. The founder then places the student in a class
//      by starting score (admin, cohorts).
import type Stripe from "stripe";
import { createReservationCheckoutSession, stripe } from "@/lib/integrations/stripe/client";
import { recordPurchaseGrant } from "@/lib/plans/resolve";
import { createAdminClient } from "@/lib/supabase/server";
import { monthName } from "@/lib/onboarding/known";
import { knownSatDates } from "@/lib/sat-dates-static";
import {
  appUrl,
  describe,
  later,
  referenceOf,
  tellFounder,
  tellParents,
  welcomeFamily,
} from "./notify";
import { UNDECIDED, openPrograms } from "./programs";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { detailsSchema, emailSchema, registrationSchema, seatSchema } from "./schemas";

export type ReserveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "invalid" | "closed" | "server" | "role" };

/** The account that is making a reservation. */
export interface Buyer {
  clerkId: string;
  email: string;
}

export interface Reservation {
  id: string;
  status: "started" | "paid" | "placed" | "cancelled";
  parent_name: string | null;
  parent_email: string;
  parent_phone: string | null;
  student_first_name: string | null;
  filled_by: "parent" | "student";
  start_score: number | null;
  program_id: string | null;
  payment_option: "full" | "installments" | null;
  claim_token: string;
  details: Record<string, unknown> | null;
  registered_at: string | null;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  clerk_user_id: string | null;
  parent_token: string;
  parent_clerk_ids: string[];
}

const TABLE = "seat_reservations";
const today = () => new Date().toISOString().slice(0, 10);
export { referenceOf };
/** The account that made the reservation, or null for one made before accounts came first. */
export const buyerOf = (r: Pick<Reservation, "details">): string | null =>
  typeof r.details?.buyer === "string" ? r.details.buyer : null;

export async function startReservation(
  input: unknown,
  buyer: Buyer
): Promise<ReserveResult<{ id: string }>> {
  // a parent's own account email is the parent's email: it is never asked for
  const given = (input ?? {}) as { filledBy?: unknown; email?: unknown };
  const parsed = emailSchema.safeParse(
    given.filledBy === "parent" ? { ...given, email: buyer.email } : input
  );
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = parsed.data;
  // a bot filled the hidden field: answer as if it worked, and keep nothing
  if (c.company) return { ok: true, value: { id: crypto.randomUUID() } };
  // a parent who is reserving has a parent account from here on (a brand-new account becomes one;
  // an account already in use as a student's cannot)
  if (c.filledBy === "parent") {
    const { becomeParent } = await import("@/lib/parent/account");
    const parent = await becomeParent(buyer.clerkId).catch(() => ({ ok: false as const }));
    if (!parent.ok) return { ok: false, error: "role" };
  }
  const db = createAdminClient();
  // one unfinished reservation per account: coming back carries on with it
  const { data: open } = await db
    .from(TABLE)
    .select("id")
    .eq("status", "started")
    .eq("details->>buyer", buyer.clerkId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    await db
      .from(TABLE)
      .update({ filled_by: c.filledBy, parent_email: c.email })
      .eq("id", (open as { id: string }).id);
    return { ok: true, value: { id: (open as { id: string }).id } };
  }
  const { data, error } = await db
    .from(TABLE)
    .insert({
      filled_by: c.filledBy,
      parent_email: c.email,
      details: { buyer: buyer.clerkId },
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[reserve] could not save the reservation", error);
    // the founder still hears about it, so the family is not lost
    await tellFounder("Seat reservation started (NOT saved)", [
      "The database refused this reservation. This email is the only record.",
      `Email: ${c.email}`,
      `Filled in by: the ${c.filledBy}`,
    ]);
    return { ok: false, error: "server" };
  }
  const r = data as Reservation;
  await tellFounder(
    "Seat reservation started, not paid yet",
    [
      "A family began reserving a cohort seat. If no payment follows, reach out. Sooner is better.",
      "",
      ...describe(r),
    ],
    r.parent_email
  );
  return { ok: true, value: { id: r.id } };
}

/** The account's unfinished reservation, so coming back (or Back from the payment page) carries on
 *  where it was. Null when there is none. */
export async function openReservation(clerkId: string): Promise<Reservation | null> {
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("*")
    .eq("status", "started")
    .eq("details->>buyer", clerkId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Reservation | null) ?? null;
}

/** The names step: added to the saved reservation, so a follow-up can use them. */
export async function saveDetails(input: unknown): Promise<ReserveResult<null>> {
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .update({
      parent_name: d.parentName,
      student_first_name: d.studentFirst,
      parent_phone: d.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.reservationId)
    .eq("status", "started")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[reserve] could not save the details", error);
    return { ok: false, error: "server" };
  }
  // no row: the id came from the bot trap, or the seat is already paid; either way nothing to do
  return data ? { ok: true, value: null } : { ok: false, error: "invalid" };
}

export async function checkoutReservation(input: unknown): Promise<ReserveResult<{ url: string }>> {
  const parsed = seatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const s = parsed.data;
  if (s.programId !== UNDECIDED && !openPrograms(today()).some((p) => p.id === s.programId))
    return { ok: false, error: "closed" };
  const db = createAdminClient();
  const { data: row } = await db.from(TABLE).select("*").eq("id", s.reservationId).maybeSingle();
  const r = row as Reservation | null;
  if (!r || r.status !== "started" || !r.parent_name || !r.student_first_name)
    return { ok: false, error: "invalid" };
  try {
    const customerId =
      r.stripe_customer_id ??
      (
        await stripe.customers.create({
          email: r.parent_email,
          name: r.parent_name,
          ...(r.parent_phone ? { phone: r.parent_phone } : {}),
          metadata: { reservationId: r.id },
        })
      ).id;
    const session = await createReservationCheckoutSession({
      customerId,
      reservationId: r.id,
      programId: s.programId,
      payment: s.payment,
      returnUrl: returnTo(r),
    });
    if (!session.client_secret) return { ok: false, error: "server" };
    await db
      .from(TABLE)
      .update({
        program_id: s.programId,
        payment_option: s.payment,
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    // our own payment page, which opens this session's fields
    return { ok: true, value: { url: `/reserve/pay?id=${r.id}` } };
  } catch (e) {
    console.error("[reserve] checkout could not start", e);
    return { ok: false, error: "server" };
  }
}

/** Where Stripe sends the family after a way of paying that leaves the site (a pay-later plan, a
 *  wallet): back to the payment page, which then shows "paid". Stripe fills in the session id, so the
 *  page can confirm the payment itself. */
const returnTo = (r: Reservation) => `${appUrl()}/reserve/pay?id=${r.id}&s={CHECKOUT_SESSION_ID}`;

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
  // the account that reserved gets its seat now, before anything else can fail
  await attachBuyer(r);
  await later(async () => {
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
  });
  return "paid";
}

/** The seat goes to the account that paid for it, the moment it is paid: a student's account takes the
 *  seat and its plan; a parent's account becomes the seat's parent account (the student still gets
 *  their own link). Never fails the payment: the links in the email do the same job by hand. */
async function attachBuyer(r: Reservation) {
  const buyer = buyerOf(r);
  if (!buyer) return;
  try {
    const outcome =
      r.filled_by === "student"
        ? await claimReservation(r.claim_token, buyer)
        : await joinAsParent(r.parent_token, buyer);
    console.log(`[reserve] buyer attached to ${referenceOf(r.id)}: ${outcome}`);
  } catch (e) {
    console.error("[reserve] could not attach the buyer's account", e);
  }
}

/** What the payment page (/reserve/pay) needs: the open checkout's client secret, and what is being
 *  paid for. "paid" when the seat is already paid (the page then sends the family on to the welcome
 *  page); null when there is nothing to pay (no such reservation, or its checkout ran out). */
export async function paymentFor(
  reservationId: string,
  /** Back from a way of paying that left the site: the checkout Stripe says was just finished. */
  returned = ""
): Promise<
  | { state: "open"; clientSecret: string; tapSecret: string; seat: Reservation }
  | { state: "paid" | "clearing"; seat: Reservation }
  | null
> {
  if (!/^[0-9a-f-]{36}$/i.test(reservationId)) return null;
  const read = async () =>
    (await createAdminClient().from(TABLE).select("*").eq("id", reservationId).maybeSingle())
      .data as Reservation | null;
  let seat = await read();
  if (!seat) return null;
  if (seat.status === "started" && returned) {
    const now = await confirmPaid(seat, returned);
    if (now === "clearing") return { state: "clearing", seat };
    if (now) seat = (await read()) ?? seat;
  }
  if (seat.status === "paid" || seat.status === "placed") return { state: "paid", seat };
  if (seat.status !== "started" || !seat.stripe_checkout_session_id) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(seat.stripe_checkout_session_id);
    if (session.status === "complete")
      return { state: session.payment_status === "unpaid" ? "clearing" : "paid", seat };
    if (session.status !== "open" || !session.client_secret) return null;
    // the one-tap buttons have a checkout of their own (see createReservationCheckoutSession)
    const tap =
      seat.program_id && seat.stripe_customer_id && seat.payment_option
        ? await createReservationCheckoutSession({
            customerId: seat.stripe_customer_id,
            reservationId: seat.id,
            programId: seat.program_id,
            payment: seat.payment_option,
            returnUrl: returnTo(seat),
            tap: true,
          }).catch(() => null)
        : null;
    return {
      state: "open",
      clientSecret: session.client_secret,
      // if it could not be made the page shows the list alone, which still takes a card
      tapSecret: tap?.client_secret ?? "",
      seat,
    };
  } catch (e) {
    console.error("[reserve] could not open the payment", e);
    return null;
  }
}

/** Our own check, the moment a payment is made, without waiting for Stripe's message (which may be
 *  seconds behind, or unable to arrive at all): asks Stripe whether this reservation's checkout is paid,
 *  and settles it if so. The session must be the one made for this reservation, so a made-up address
 *  settles nothing. "clearing": a bank payment was accepted and takes a few working days to arrive;
 *  the seat is settled when it does (Stripe's async_payment_succeeded). */
export async function confirmPaid(
  r: Reservation,
  sessionId: string
): Promise<boolean | "clearing"> {
  if (r.status !== "started" || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.reservationId !== r.id || session.status !== "complete") return false;
    if (session.payment_status !== "paid") return "clearing";
    return (await settleReservation(session)) !== "missing";
  } catch (e) {
    console.error("[reserve] could not confirm the payment with Stripe", e);
    return false;
  }
}

/** The Stripe webhook's call when a reservation's checkout ran out unpaid: the founder gets the link
 *  that reopens it, to send with a plain reminder. */
export async function reservationExpired(
  session: Pick<Stripe.Checkout.Session, "id" | "metadata" | "after_expiration">
): Promise<void> {
  const id = session.metadata?.reservationId;
  // the one-tap buttons' own checkout says nothing: the seat's first one speaks for it
  if (!id || session.metadata?.way) return;
  const { data } = await createAdminClient().from(TABLE).select("*").eq("id", id).maybeSingle();
  const r = data as Reservation | null;
  if (!r || r.status !== "started") return;
  await tellFounder(
    `Payment not finished: ${r.student_first_name ?? r.parent_email}`,
    [
      "This family reached the payment page and left without paying.",
      "A short, friendly reminder works better than a discount. This link reopens their payment for 30 days:",
      session.after_expiration?.recovery?.url ?? `${appUrl()}/reserve`,
      "",
      ...describe(r),
    ],
    r.parent_email
  );
}

/** The questions asked right after payment, saved to the paid seat, and sent on to the founder. */
export async function saveRegistration(input: unknown): Promise<ReserveResult<null>> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const a = parsed.data;
  const before = await findReservation(a.token);
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .update({
      start_score: a.startScore ? Number(a.startScore) : null,
      details: {
        ...(before?.details ?? {}),
        goalScore: Number(a.goalScore),
        hardest: a.hardest,
        times: a.times,
        note: a.note,
      },
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("claim_token", a.token)
    .in("status", ["paid", "placed"])
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[reserve] could not save the registration", error);
    return { ok: false, error: "server" };
  }
  if (!data) return { ok: false, error: "invalid" };
  const r = data as Reservation;
  // the student's account already holds the seat: it learns the answers too
  if (r.clerk_user_id) await rememberOnAccount(r, r.clerk_user_id);
  await tellFounder(
    `Registered: ${r.student_first_name ?? r.parent_email}`,
    [
      "The family answered the questions that get the student started.",
      "",
      ...describe(r),
      `Goal score: ${a.goalScore}`,
      `Hardest right now: ${a.hardest}`,
      `Can make classes: ${a.times.join(", ")}`,
      a.note ? `Note: ${a.note}` : "",
    ].filter((l, i) => l !== "" || i === 1),
    r.parent_email
  );
  return { ok: true, value: null };
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

const userIdOf = async (clerkId: string) =>
  (await createAdminClient().from("users").select("id").eq("clerk_id", clerkId).maybeSingle()).data
    ?.id ?? null;

/** Joins a parent account to a student account in the parent portal (the same table an invite fills). */
async function linkParent(parentUserId: string, studentUserId: string) {
  const { untypedAdmin } = await import("@/lib/school/db");
  const { error } = await untypedAdmin()
    .from("parent_student_links")
    .upsert(
      { parent_user_id: parentUserId, student_user_id: studentUserId },
      { onConflict: "parent_user_id,student_user_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

/** Once the student's account holds the seat: the parents who already have their portal are joined to
 *  it. Never fails the claim. */
async function linkParents(r: Reservation, clerkUserId: string) {
  try {
    const studentId = await ensureUserRow(clerkUserId);
    if (!studentId) return;
    for (const parent of r.parent_clerk_ids) {
      const parentId = await userIdOf(parent);
      if (parentId) await linkParent(parentId, studentId);
    }
  } catch (e) {
    console.error("[reserve] linking the parents failed", e);
  }
}

/** The parents' link (/reserve/parent): turns a new account into a parent account, keeps it on the seat
 *  (two at most), and joins it to the student once the student's account exists. */
export async function joinAsParent(
  parentToken: string,
  clerkUserId: string
): Promise<"joined" | "full" | "not-a-parent" | "unpaid" | "missing"> {
  if (!/^[0-9a-f-]{36}$/i.test(parentToken)) return "missing";
  const db = createAdminClient();
  const { data } = await db.from(TABLE).select("*").eq("parent_token", parentToken).maybeSingle();
  const r = data as Reservation | null;
  if (!r) return "missing";
  if (r.status !== "paid" && r.status !== "placed") return "unpaid";
  if (r.clerk_user_id === clerkUserId) return "not-a-parent";
  const known = r.parent_clerk_ids.includes(clerkUserId);
  if (!known && r.parent_clerk_ids.length >= 2) return "full";
  const { becomeParent } = await import("@/lib/parent/account");
  const parent = await becomeParent(clerkUserId);
  if (!parent.ok) return "not-a-parent";
  if (!known) {
    const { error } = await db
      .from(TABLE)
      .update({ parent_clerk_ids: [...r.parent_clerk_ids, clerkUserId] })
      .eq("id", r.id);
    if (error) throw error;
  }
  const studentId = r.clerk_user_id ? await userIdOf(r.clerk_user_id) : null;
  if (studentId) await linkParent(parent.userId, studentId);
  return "joined";
}

/** What the reservation already knows goes onto the student's account, and the account counts as set
 *  up: the SAT the cohort ends on, the goal, the parent's email and phone. So the portal asks none of
 *  it again, and the older questionnaire (which would also place the student in a class by a date typed
 *  there) is never shown: the founder places a reserved seat by hand. Never fails the claim. */
async function rememberOnAccount(r: Reservation, clerkUserId: string) {
  try {
    await ensureUserRow(clerkUserId);
    // "March 6" as the College Board's own date for that SAT, after the cohort's first class
    const program = openPrograms("2000-01-01").find((p) => p.id === r.program_id);
    const satDate = program
      ? knownSatDates([], program.startDate).find((d) => monthName(d) === program.month)
      : undefined;
    const goal = Number(r.details?.goalScore);
    const { untypedAdmin } = await import("@/lib/school/db");
    const db = untypedAdmin();
    const { data: me } = await db
      .from("users")
      .select("sat_test_date, onboarding_completed_at")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();
    const { error } = await db
      .from("users")
      .update({
        ...(satDate && !me?.sat_test_date ? { sat_test_date: satDate, test_type: "sat" } : {}),
        ...(goal >= 400 && goal <= 1600 ? { goal_sat_score: goal } : {}),
        parent_email_collected: r.parent_email,
        ...(r.parent_phone ? { parent_phone_collected: r.parent_phone } : {}),
        ...(me?.onboarding_completed_at
          ? {}
          : { onboarding_completed_at: new Date().toISOString() }),
      })
      .eq("clerk_id", clerkUserId);
    if (error) throw error;
  } catch (e) {
    console.error("[reserve] could not copy the reservation onto the account", e);
  }
}

/** Attaches a paid seat to the student's new account and opens the platform. One account per seat. */
export async function claimReservation(
  token: string,
  clerkUserId: string
): Promise<"claimed" | "yours" | "taken" | "unpaid" | "missing" | "parent"> {
  const r = await findReservation(token);
  if (!r) return "missing";
  // a parent opened the student's link while signed in to a parent account: the seat stays unclaimed
  if (r.parent_clerk_ids.includes(clerkUserId)) return "parent";
  const { data: who } = await createAdminClient()
    .from("users")
    .select("role")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();
  if (who?.role === "parent") return "parent";
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
  await rememberOnAccount(r, clerkUserId);
  await linkParents(r, clerkUserId);
  await later(async () => {
    // a student who reserved for themselves needs no "your student's account is ready" email
    if (buyerOf(r) !== clerkUserId) await tellParents(r);
    await tellFounder(`Account created for ${r.student_first_name}`, [
      "The student's account now holds the paid seat. Place them in a class in Admin, Cohorts.",
      "",
      ...describe(r),
    ]);
  });
  return "claimed";
}
