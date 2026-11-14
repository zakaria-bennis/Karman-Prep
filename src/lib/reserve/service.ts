// Reserving a cohort seat from the marketing site (founder, 2026-11-13). Server only.
//   1. startReservation: the email is saved the moment it is given, and the founder is told, so a
//      reservation left unfinished can be followed up. saveDetails adds the names and the phone.
//   2. checkoutReservation: the score, the cohort and the way of paying are added, and Stripe Checkout opens.
//      No account is needed to pay.
//   3. settleReservation: the Stripe webhook marks the seat paid and sends the family their next steps.
//      saveRegistration: right after paying, the family answers the few questions that get the student
//      started (score, goal, what is hardest, class times). Asked after payment on purpose.
//   4. claimReservation: the student creates an account from the link in those steps; the paid seat is
//      attached to it, which opens the platform at once. The founder then places the student in a class
//      by starting score (admin, cohorts).
import type Stripe from "stripe";
import { createReservationCheckoutSession, stripe } from "@/lib/integrations/stripe/client";
import { FROM, resend } from "@/lib/integrations/resend/client";
import { GUARANTEE, MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { recordPurchaseGrant } from "@/lib/plans/resolve";
import { createAdminClient } from "@/lib/supabase/server";
import { UNDECIDED, openPrograms } from "./programs";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { detailsSchema, emailSchema, registrationSchema, seatSchema } from "./schemas";

export type ReserveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "invalid" | "closed" | "server" };

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

/** "A1B2C3D4": the short reference a family can quote. */
export const referenceOf = (id: string) => id.slice(0, 8).toUpperCase();

const describe = (r: Reservation) => [
  `Reference: ${referenceOf(r.id)}`,
  `Parent: ${r.parent_name ?? "not given yet"}`,
  `Email: ${r.parent_email}`,
  `Phone: ${r.parent_phone ?? "not given"}`,
  `Student: ${r.student_first_name ?? "not given yet"}`,
  `Filled in by: the ${r.filled_by}`,
  `Starting SAT score: ${r.start_score ?? "none yet (needs the placement test)"}`,
  `Cohort: ${r.program_id === UNDECIDED ? "NOT SURE of the SAT date: agree it with them" : (r.program_id ?? "not chosen yet")}`,
  `Paying: ${r.payment_option === "installments" ? "deposit and three payments" : r.payment_option === "full" ? "in full" : "not chosen yet"}`,
];

export async function startReservation(input: unknown): Promise<ReserveResult<{ id: string }>> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = parsed.data;
  // a bot filled the hidden field: answer as if it worked, and keep nothing
  if (c.company) return { ok: true, value: { id: crypto.randomUUID() } };
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .insert({ filled_by: c.filledBy, parent_email: c.email })
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
      // Stripe fills in the session id, so the welcome page can confirm the payment itself
      successUrl: `${appUrl()}/reserve/welcome?r=${r.claim_token}&s={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl()}/reserve?back=${r.id}`,
    });
    if (!session.url) return { ok: false, error: "server" };
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
  const portal = `${appUrl()}/reserve/parent?p=${r.parent_token}`;
  const lines = [
    `${r.student_first_name}'s seat is reserved. Welcome to Karman.`,
    `Your reference is ${referenceOf(r.id)}.`,
    "",
    "Get started, in this order:",
    `1. Answer five quick questions about ${r.student_first_name}. At the end you get ${r.student_first_name}'s own link to send. ${r.student_first_name} opens it to set up the student account, and it works once, for one account: ${link}`,
    `2. Open your parent portal. It shows attendance, homework, practice test scores and where the guarantee stands. You make your own sign-in: ${portal}`,
    "3. Add a second parent, if you like: forward them the parent portal link above. It opens for two parent accounts, yours and theirs.",
    `4. Before the first class, email ${r.student_first_name}'s official SAT score report (the PDF from the College Board account) to ${GUARANTEE.claimEmail}. No SAT yet? ${r.student_first_name} takes a first full-length test with us instead. Either one sets the starting score for the guarantee.`,
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

/** The welcome page's own check, for the seconds before Stripe's message arrives (or when it cannot
 *  arrive at all): asks Stripe whether this reservation's checkout is paid, and settles it if so. The
 *  session must be the one made for this reservation, so a made-up address settles nothing. */
export async function confirmPaid(r: Reservation, sessionId: string): Promise<boolean> {
  if (r.status !== "started" || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.reservationId !== r.id || session.payment_status !== "paid") return false;
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
  if (!id) return;
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
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .update({
      start_score: a.startScore ? Number(a.startScore) : null,
      details: {
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
 *  it, and the buyer is told by email. Never fails the claim. */
async function tellParents(r: Reservation, clerkUserId: string) {
  try {
    const studentId = await ensureUserRow(clerkUserId);
    if (studentId)
      for (const parent of r.parent_clerk_ids) {
        const parentId = await userIdOf(parent);
        if (parentId) await linkParent(parentId, studentId);
      }
    if (!process.env.RESEND_API_KEY) return;
    await resend.emails.send({
      from: FROM,
      to: r.parent_email,
      subject: `${r.student_first_name}'s account is ready`,
      text: [
        `${r.student_first_name} has set up the student account, and the seat is attached to it.`,
        "",
        `Your parent portal: ${appUrl()}/reserve/parent?p=${r.parent_token}`,
        `It shows ${r.student_first_name}'s attendance, homework, practice test scores and where the guarantee stands.`,
        "To add a second parent, forward them that link. It opens for two parent accounts.",
        "",
        "Reply to this email with any question. A person answers.",
      ].join("\n"),
    });
  } catch (e) {
    console.error("[reserve] telling the parents failed", e);
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

/** Attaches a paid seat to the student's new account and opens the platform. One account per seat. */
export async function claimReservation(
  token: string,
  clerkUserId: string
): Promise<"claimed" | "yours" | "taken" | "unpaid" | "missing" | "parent"> {
  const r = await findReservation(token);
  if (!r) return "missing";
  // a parent opened the student's link while signed in to the parent account: the seat stays unclaimed
  if (r.parent_clerk_ids.includes(clerkUserId)) return "parent";
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
  await tellParents(r, clerkUserId);
  await tellFounder(`Account created for ${r.student_first_name}`, [
    "The student's account now holds the paid seat. Place them in a class in Admin, Cohorts.",
    "",
    ...describe(r),
  ]);
  return "claimed";
}
