// ============================================================
// GET /checkout/done?s=<Stripe checkout session id>
// Where Stripe sends a visitor who paid before having an account
// (src/lib/checkout/guest.ts). Signed in: the purchase is given to
// that account and the portal opens. Signed out: on to Get started
// (or Sign in, when the email paid with already has an account), and
// back here afterwards.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { claimGuestPurchase, donePath, guestPurchase, sessionIdSchema } from "@/lib/checkout/guest";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, origin), 303);
  const id = sessionIdSchema.safeParse(searchParams.get("s"));
  if (!id.success) return to("/pricing");

  const { userId } = await safeAuth();
  try {
    if (!userId) {
      const purchase = await guestPurchase(id.data);
      if (purchase.state === "missing") return to("/pricing");
      // already opened by an account: signing in is all that is left
      const known = purchase.state === "claimed" || purchase.hasAccount;
      const next = new URL(known ? "/auth/sign-in" : "/auth/sign-up", origin);
      next.searchParams.set("redirect_url", donePath(id.data));
      return NextResponse.redirect(next, 303);
    }
    await ensureUserRow(userId);
    const outcome = await claimGuestPurchase(id.data, userId);
    if (outcome === "ok") return to("/dashboard/student?welcome=1");
    console.warn(`[checkout/done] ${outcome} for a signed-in visitor`);
  } catch (error) {
    console.error("[checkout/done] Error:", error);
  }
  return to("/billing");
}
