// /join/[code]: a tutor's shared link. A signed-in student joins the tutor's group on arrival and
// lands on the portal's home. If the code can't be used as it is (wrong code, a full group, already
// in another tutor's group), they land in Settings (Parent, tutor and class) with the code filled in,
// where the reason is shown. Signed out, they sign up first and come back to the same link.
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { toSettings } from "@/lib/portal/settings-redirects";
import { redeemCodeSchema } from "@/lib/tutor-affiliate/schemas";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { redeemAffiliateCode } from "@/lib/tutor-affiliate/service";

export const dynamic = "force-dynamic";

/** True when this account is in the tutor's group now (just joined, or already was). A brand-new
 *  account gets its student record first, so the code works on the way back from sign-up. */
async function joinOnArrival(clerkId: string, code: string): Promise<boolean> {
  const parsed = redeemCodeSchema.safeParse({ code });
  if (!parsed.success) return false;
  try {
    await ensureUserRow(clerkId);
    const result = await redeemAffiliateCode(affiliateDeps, {
      studentClerkId: clerkId,
      rawCode: parsed.data.code,
    });
    return result.ok;
  } catch (error) {
    console.error("[join] joining on arrival failed:", error);
    return false;
  }
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = decodeURIComponent(code).slice(0, 20);
  const { userId } = await safeAuth();
  if (userId && (await joinOnArrival(userId, clean))) redirect("/dashboard/student");
  return toSettings("people", { code: clean }, "/join/" + encodeURIComponent(clean));
}
