import { redirect } from "next/navigation";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import Paid from "@/components/site/reserve/Paid";
import PayStage from "@/components/site/reserve/PayStage";
import { ROUTES } from "@/components/site/routes";
import { safeAuth } from "@/lib/auth/dev-auth";
import { planPayment } from "@/lib/checkout/plan-pay";
import { priceLabel } from "@/lib/integrations/stripe/prices";
import { cancelPath } from "@/lib/integrations/stripe/start-checkout";
import { PLAN_RENEWAL, PRACTICE_PLAN, PRO_PLAN, formatPrice } from "@/lib/marketing/offer";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { SITE } from "@/lib/marketing/site-copy";
import { createAdminClient } from "@/lib/supabase/server";
import { planPaid } from "./actions";

export const metadata = { title: "Karman Prep: Payment", robots: { index: false } };
export const dynamic = "force-dynamic";

const W = RESERVE.payPage.paid;

/** Our own payment page for a renewing plan, Practice or Pro (founder, 2026-11-26): the same screen a
 *  cohort seat is paid on (PayStage), instead of Stripe's page. /checkout/start opens the checkout and
 *  sends the buyer here with its id (?s=). Once paid, the same address says so and opens the portal. */
export default async function PlanPayPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s = "" } = await searchParams;
  const { userId } = await safeAuth();
  if (!userId) redirect(`/auth/sign-in?redirect_url=${encodeURIComponent(`/checkout/pay?s=${s}`)}`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [pay, { data: me }] = await Promise.all([
    planPayment(userId, s, appUrl),
    createAdminClient().from("users").select("role").eq("clerk_id", userId).maybeSingle(),
  ]);
  if (!pay) redirect(ROUTES.pricing);
  const { spec } = pay;
  // the checkout ran out unpaid: a new one, for the same plan
  if (pay.state === "gone") redirect(`${ROUTES.checkout}?plan=${spec.planId}&term=${spec.term}`);
  const plan = spec.planId === "practice" ? PRACTICE_PLAN : PRO_PLAN;
  const amount = formatPrice(spec.amount);
  const paid = {
    name: "",
    title: W.planTitle.replace("{plan}", plan.name),
    clearing: {
      title: W.planClearingTitle.replace("{plan}", plan.name),
      text: W.planClearingText,
    },
    what: plan.name,
    amount,
    next: "/dashboard/student?welcome=1",
  };
  return (
    <SitePage kind="lit" bare noTheme route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        {pay.state === "open" ? (
          <PayStage
            flow="plan"
            settle={planPaid}
            clientSecret={pay.clientSecret}
            tapSecret={pay.tapSecret}
            publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
            back={cancelPath(spec.planId, me?.role ?? null)}
            title={plan.name}
            what={plan.name}
            amount={amount}
            price={amount}
            // "$69 a month" without its "$69"
            per={priceLabel(spec).slice(amount.length).trim()}
            legal={[
              { href: ROUTES.terms, label: SITE["terms link"] },
              { href: ROUTES.privacy, label: SITE["privacy link"] },
            ]}
            later={null}
            includes={plan.includes}
            promise={PLAN_RENEWAL}
            email={pay.email}
            phone={pay.phone}
            promo
            paid={paid}
          />
        ) : (
          <Paid {...paid} state={pay.state} />
        )}
      </section>
    </SitePage>
  );
}
