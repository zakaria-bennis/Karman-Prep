// /checkout/welcome-mock: three mock-ups of the screen after Pro or Practice is paid, for the founder to pick
// from (2026-11-26). ?v=a|b|c and ?plan=pro|practice. Not linked from anywhere; 404 in production.
import { notFound } from "next/navigation";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { PRACTICE_PLAN, PRO_PLAN, formatPrice } from "@/lib/marketing/offer";
import Mock from "./Mock";
import "./welcome.css";

export const dynamic = "force-dynamic";

export default async function WelcomeMockPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; plan?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v = "a", plan = "pro" } = await searchParams;
  const p = plan === "practice" ? PRACTICE_PLAN : PRO_PLAN;
  return (
    <SitePage kind="lit" bare noTheme route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        <Mock
          v={v === "b" || v === "c" ? v : "a"}
          plan={p.name}
          line={
            p.id === "pro"
              ? "You're on the way to becoming an SAT Pro."
              : "Let's show them why practice makes perfect."
          }
          amount={formatPrice(p.monthly)}
          includes={[...p.includes]}
        />
      </section>
    </SitePage>
  );
}
