import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import RegistrationFlight from "@/components/site/reserve/RegistrationFlight";
import { redirect } from "next/navigation";
import { ROUTES } from "@/components/site/routes";
import { reserveBuyer } from "@/lib/reserve/buyer";
import { buyerOf, findReservation } from "@/lib/reserve/service";
import "@/app/onboarding/intake.css";
import "@/app/onboarding/landing.css";

export const metadata = { title: "Karman Prep: Your seat", robots: { index: false } };
export const dynamic = "force-dynamic";

const W = RESERVE.welcome;

/** Where a family lands after paying, and where the link in their confirmation email leads: the few
 *  questions that get the student started, then the student's own link to an account with the seat attached. */
export default async function ReserveWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r: token = "" } = await searchParams;
  const seat = await findReservation(token);
  // not paid yet: the payment page is the one place that says where a payment stands
  if (seat && seat.status === "started") redirect(`/reserve/pay?id=${seat.id}`);
  const paid = seat?.status === "paid" || seat?.status === "placed";
  // Paid: the questions that get the student started come first, as a flight (asked after payment on
  // purpose). Once they are answered, the page opens on the landing.
  if (paid && seat) {
    const buyer = buyerOf(seat);
    const me = buyer ? await reserveBuyer().catch(() => null) : null;
    return (
      <SitePage kind="lit" bare noTheme drive="steps" className={litFonts}>
        <RegistrationFlight
          token={token}
          parentToken={seat.parent_token}
          name={seat.student_first_name ?? "your student"}
          filledBy={seat.filled_by}
          claimed={!!seat.clerk_user_id}
          landed={!!seat.registered_at}
          mine={!!me && me.clerkId === buyer}
          known={{
            score: seat.start_score ? String(seat.start_score) : "",
            goal: typeof seat.details?.goalScore === "number" ? String(seat.details.goalScore) : "",
          }}
        />
      </SitePage>
    );
  }

  return (
    <SitePage kind="lit" noTheme route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="rs gq-card rs-done">
          <h1>{W.lostTitle}</h1>
          <p className="rs-note">{W.lostText}</p>
          <a className="btn" href={ROUTES.reserve}>
            <span className="lb">{W.lostButton}</span>
          </a>
        </div>
      </section>
    </SitePage>
  );
}
