// ============================================================
// /api/schedule/hours
//
// POST   opens a payment for extra tutoring hours and answers with what the Schedule tab needs to
//        place Stripe's own buttons and fields on the page, and the family's card on file if any.
// PATCH  changes how many hours that payment is for; answers with the new price.
// GET    ?intent=pi_...  says whether that payment went through, and for how many hours.
//
// Card details never touch this site: they are typed into Stripe's frames. The price is always
// worked out here.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { hoursPaid, hoursSalesOpen, openHoursPayment, setHours } from "@/lib/schedule/hours";
import { hoursBodySchema, hoursChangeBodySchema } from "@/lib/schedule/hours-shared";
import { createAdminClient } from "@/lib/supabase/server";

const shut = () => NextResponse.json({ error: "Buying hours is not open yet." }, { status: 503 });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hoursSalesOpen(process.env)) return shut();
  const parsed = hoursBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { data: user } = await createAdminClient()
    .from("users")
    .select("email")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user?.email) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  try {
    const { intent, card } = await openHoursPayment({
      clerkId: userId,
      email: user.email,
      hours: parsed.data.hours,
    });
    return NextResponse.json({
      clientSecret: intent.client_secret,
      intentId: intent.id,
      amountCents: intent.amount,
      card,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    });
  } catch (error) {
    console.error("[api/schedule/hours] could not open a payment:", error);
    return NextResponse.json({ error: "The payment could not be opened." }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hoursSalesOpen(process.env)) return shut();
  const parsed = hoursChangeBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  try {
    const amountCents = await setHours(parsed.data.intentId, userId, parsed.data.hours);
    if (amountCents === null)
      return NextResponse.json({ error: "That payment cannot be changed." }, { status: 409 });
    return NextResponse.json({ amountCents });
  } catch (error) {
    console.error("[api/schedule/hours] could not change a payment:", error);
    return NextResponse.json({ error: "The amount could not be changed." }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const intentId = req.nextUrl.searchParams.get("intent") ?? "";
  if (!/^pi_[A-Za-z0-9]+$/.test(intentId))
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
  try {
    const paid = await hoursPaid(intentId, userId);
    return NextResponse.json(paid ? { paid: true, hours: paid.hours } : { paid: false });
  } catch (error) {
    console.error("[api/schedule/hours] could not read a payment:", error);
    return NextResponse.json({ error: "The payment could not be read." }, { status: 502 });
  }
}
