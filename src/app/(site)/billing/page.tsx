// /billing: choosing or managing a renewing plan, for an account that is not a student's (a student's
// plan lives in the portal's Settings). It is the Pricing page's own cards (PricingPage.tsx), in the
// same world, so the prices here can never differ from the ones a visitor was shown (founder,
// 2026-11-25). A plan carried in the address (?plan=pro&term=month, from checkout when it could not
// start) opens on its side with its term picked. An account that already has a plan sees it named
// above the cards, with the way into Stripe's portal (PlanNow.tsx).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SitePage from "@/components/site/SitePage";
import PlanNow from "@/components/site/deal/PlanNow";
import PricingPage from "@/components/site/deal/PricingPage";
import { pricingData } from "@/components/site/deal/pricing-data";
import { fraunces } from "@/components/site/display-font";
import { litFonts } from "@/components/site/home/fonts";
import { safeAuth } from "@/lib/auth/dev-auth";
import {
  BILLING_TERMS,
  findStripePrice,
  priceLabel,
  type BillingTerm,
} from "@/lib/integrations/stripe/prices";
import { CONTACT, PRACTICE_PLAN, PRO_PLAN, TUTOR_AFFILIATE_PLAN } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";
import { settingsHref } from "@/lib/portal/settings-rules";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";

export const metadata: Metadata = {
  title: { absolute: "Your plan | Karman" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const NAMES: Record<string, string> = {
  [PRACTICE_PLAN.id]: PRACTICE_PLAN.name,
  [PRO_PLAN.id]: PRO_PLAN.name,
  [TUTOR_AFFILIATE_PLAN.id]: TUTOR_AFFILIATE_PLAN.name,
};
/** The self-study cards list 3 months first, then monthly (pricing-data.ts). */
const TERM_AT: Record<string, number> = { quarter: 0, month: 1 };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const plan = typeof params.plan === "string" && params.plan in NAMES ? params.plan : null;
  const term =
    typeof params.term === "string" && (BILLING_TERMS as readonly string[]).includes(params.term)
      ? params.term
      : "month";

  const { userId } = await safeAuth();
  if (!userId) {
    const back = plan ? `/billing?plan=${plan}&term=${term}` : "/billing";
    redirect(`/auth/sign-in?redirect_url=${encodeURIComponent(back)}`);
  }

  // A student's plan and billing live in the portal's Settings (Plan and billing).
  const { clerkId } = await resolveEffectiveClerkId(userId);
  if ((await resolveEffectiveRole(clerkId)) === "student") redirect(settingsHref("plan"));

  const { data: sub } = await createAdminClient()
    .from("subscriptions")
    .select("plan_id, billing_term, status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const live = sub && ["active", "trialing", "past_due"].includes(sub.status) ? sub : null;
  const price = live ? findStripePrice(live.plan_id, live.billing_term as BillingTerm) : null;

  const s = section(58);
  const selfStudy = plan === PRACTICE_PLAN.id || plan === PRO_PLAN.id;
  return (
    <SitePage
      kind="lit"
      noTheme
      route={[0.56, 0.72]}
      className={`${litFonts} ${fraunces.variable}`}
    >
      <PricingPage
        {...pricingData(new Date().toISOString().slice(0, 10))}
        start={selfStudy || live ? { side: "self", plan, term: TERM_AT[term] } : undefined}
        top={
          live && NAMES[live.plan_id] ? (
            <PlanNow
              line={s["plan now"]
                .replace("{plan}", NAMES[live.plan_id])
                .replace("{price}", price ? priceLabel(price) : "")
                .replace(/, \.$/, ".")}
              due={live.status === "past_due" ? s["plan due"] : ""}
              renews={
                live.current_period_end
                  ? `${s["plan renews"]} ${new Date(live.current_period_end).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}.`
                  : ""
              }
              manage={s["plan manage"]}
              trouble={s["plan trouble"].replace("{email}", CONTACT.support)}
            />
          ) : params.required === "1" ? (
            <p className="pz-now pz-need">{s["plan required"]}</p>
          ) : null
        }
      />
    </SitePage>
  );
}
