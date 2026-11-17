// ============================================================
// /api/schedule/hours
//
// POST  opens a payment for extra tutoring hours and answers with what the Schedule tab needs to
//       place Stripe's own buttons and fields on the page.
// GET   ?session=cs_...  says whether that payment went through, and for how many hours.
//
// Card details never touch this site: they are typed into Stripe's frames.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { createHoursCheckout, hoursPaid, hoursSalesOpen } from "@/lib/schedule/hours";
import { hoursCheckoutBodySchema } from "@/lib/schedule/hours-shared";
import { createAdminClient } from "@/lib/supabase/server";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hoursSalesOpen(process.env))
    return NextResponse.json({ error: "Buying hours is not open yet." }, { status: 503 });
  const parsed = hoursCheckoutBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { data: user } = await createAdminClient()
    .from("users")
    .select("email")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user?.email) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  try {
    const session = await createHoursCheckout({
      clerkId: userId,
      email: user.email,
      hours: parsed.data.hours,
      // only followed by ways to pay that leave the page (a bank's own screen, say)
      returnUrl: `${appUrl()}/dashboard/student?hours={CHECKOUT_SESSION_ID}`,
    });
    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    });
  } catch (error) {
    console.error("[api/schedule/hours] could not open a payment:", error);
    return NextResponse.json({ error: "The payment could not be opened." }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionId = req.nextUrl.searchParams.get("session") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId))
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  try {
    const paid = await hoursPaid(sessionId, userId);
    return NextResponse.json(paid ? { paid: true, hours: paid.hours } : { paid: false });
  } catch (error) {
    console.error("[api/schedule/hours] could not read a payment:", error);
    return NextResponse.json({ error: "The payment could not be read." }, { status: 502 });
  }
}
